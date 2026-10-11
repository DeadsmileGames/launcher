const test = require('node:test');
const assert = require('node:assert/strict');
const { createGameOperations } = require('../electron/game-operations.cjs');
const { monitorGameProcess, waitForProcessSpawn } = require('../electron/game-process-lifecycle.cjs');
const { EventEmitter } = require('node:events');
const { spawn } = require('node:child_process');
const tick = () => new Promise((resolve) => setImmediate(resolve));

test('operations for one game wait, while another game proceeds', async () => {
  const operations = createGameOperations();
  const events = [];
  let finish;
  const first = operations.run('one', () => new Promise((resolve) => { events.push('install'); finish = resolve; }));
  const second = operations.run('one', () => { events.push('play'); });
  await operations.run('two', () => { events.push('other'); });
  assert.deepEqual(events, ['install', 'other']);
  assert.equal(operations.size, 1);
  finish();
  await Promise.all([first, second]);
  await tick();
  assert.deepEqual(events, ['install', 'other', 'play']);
  assert.equal(operations.size, 0);
});

test('a failed operation does not block queued recovery', async () => {
  const operations = createGameOperations();
  const first = operations.run('one', () => { throw new Error('disk'); });
  const second = operations.run('one', () => 'recovered');
  await assert.rejects(first, /disk/);
  assert.equal(await second, 'recovered');
  await tick();
  assert.equal(operations.size, 0);
});

test('early process exit is delivered once after monitoring registration', () => {
  const child = new EventEmitter();
  const monitor = monitorGameProcess(child);
  child.emit('spawn'); child.emit('exit', 0, null); child.emit('close', 0, null);
  const endings = [];
  monitor.onEnd((result) => endings.push(result));
  assert.deepEqual(endings, [{ code: 0, signal: null, error: null }]);
  assert.throws(() => monitor.onEnd(() => {}));
});

test('spawn failure rejects startup and is delivered to lifecycle exactly once', async () => {
  const child = new EventEmitter();
  const monitor = monitorGameProcess(child);
  const ready = waitForProcessSpawn(child);
  const error = new Error('ENOENT');
  child.emit('error', error); child.emit('close', -2, null);
  await assert.rejects(ready, /ENOENT/);
  const endings = []; monitor.onEnd((result) => endings.push(result));
  assert.equal(endings.length, 1); assert.equal(endings[0].error, error);
  assert.equal(child.listenerCount('spawn'), 1);
});

test('an error after spawn does not mark a running process as ended', async () => {
  const child = new EventEmitter();
  const monitor = monitorGameProcess(child);
  const ready = waitForProcessSpawn(child);
  child.emit('spawn'); await ready;
  const endings = []; monitor.onEnd((result) => endings.push(result));
  child.emit('error', new Error('kill failed'));
  assert.equal(endings.length, 0);
  child.emit('exit', null, 'SIGTERM'); child.emit('close', null, 'SIGTERM');
  assert.equal(endings.length, 1); assert.equal(endings[0].signal, 'SIGTERM');
});

test('a real short-lived subprocess is observed even before its end callback is attached', async () => {
  const child = spawn(process.execPath, ['-e', 'process.exit(0)'], { stdio: 'ignore' });
  const monitor = monitorGameProcess(child);
  await waitForProcessSpawn(child);
  await new Promise((resolve) => child.once('close', resolve));
  const endings = []; monitor.onEnd((result) => endings.push(result));
  assert.equal(endings.length, 1); assert.equal(endings[0].code, 0);
});
