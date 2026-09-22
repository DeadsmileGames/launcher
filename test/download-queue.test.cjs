const test = require('node:test');
const assert = require('node:assert/strict');
const { DownloadQueue } = require('../electron/download-queue.cjs');
const tick = () => new Promise((resolve) => setImmediate(resolve));
const request = (id='game') => ({ id, slug:id, title:id, url:'https://example.org/game.zip' });

test('late pause does not hold a committed result', async () => {
  let finish;
  const queue = new DownloadQueue({worker:()=>new Promise(r=>{finish=r;}),broadcast:()=>{}});
  const result = queue.enqueue(request());
  assert.equal(queue.pause('game'),true);
  finish({path:'game.exe'});
  assert.deepEqual(await result, {path:'game.exe'});
  assert.equal(queue.snapshot()[0].status,'complete');
});

test('late cancel does not report a completed install as cancelled', async () => {
  let finish;
  const queue = new DownloadQueue({worker:()=>new Promise(r=>{finish=r;}),broadcast:()=>{}});
  const result = queue.enqueue(request());
  queue.cancel('game');
  finish({path:'game.exe'});
  assert.deepEqual(await result,{path:'game.exe'});
});

test('retry after failure is a distinct worker call and promise', async () => {
  let calls=0;
  const queue = new DownloadQueue({worker:async()=>{if(++calls===1)throw new Error('network');return {path:'ok'};},broadcast:()=>{}});
  await assert.rejects(queue.enqueue(request()),/network/);
  assert.deepEqual(await queue.enqueue(request()),{path:'ok'});
  assert.equal(calls,2);
});

test('old failure timer cannot remove a newer attempt of the same game', async (t) => {
  const originalTimeout = global.setTimeout;
  const timers=[];
  global.setTimeout = fn => {timers.push(fn);return 1;};
  t.after(()=>{global.setTimeout=originalTimeout;});
  let calls=0;
  const queue = new DownloadQueue({worker:async()=>{if(++calls===1)throw new Error('network');return {path:'ok'};},broadcast:()=>{}});
  await assert.rejects(queue.enqueue(request()),/network/);
  assert.deepEqual(await queue.enqueue(request()),{path:'ok'});
  timers[0]();
  assert.equal(queue.snapshot()[0].status,'complete');
});
