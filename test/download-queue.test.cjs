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

test('updating a completed game starts a fresh verified download', async () => {
  let calls = 0;
  const queue = new DownloadQueue({ worker: async (job) => ({ path: `${++calls}.exe`, mode: job.mode }), broadcast: () => {} });
  assert.deepEqual(await queue.enqueue(request()), { path: '1.exe', mode: 'download' });
  assert.deepEqual(await queue.enqueue({ ...request(), mode: 'update' }), { path: '2.exe', mode: 'update' });
  assert.equal(calls, 2);
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

test('progress cannot finish a download while its worker still has cleanup pending', async () => {
  const finishes = [];
  const queue = new DownloadQueue({ worker: (_job, context) => { context.onProgress({ status: 'complete', percent: 100 }); return new Promise((resolve) => finishes.push(resolve)); }, broadcast: () => {} });
  const first = queue.enqueue(request());
  const repeated = queue.enqueue({ ...request(), mode: 'update' });
  try {
    assert.equal(queue.snapshot()[0].status, 'downloading');
    assert(queue.snapshot()[0].percent < 100);
    assert.equal(repeated, first);
    assert.equal(finishes.length, 1);
  } finally {
    finishes.forEach((resolve) => resolve({ path: 'game.exe' }));
    await Promise.allSettled([first, repeated]);
  }
});

test('a completed worker immediately releases its slot to the next queued game', async () => {
  const finishes = new Map();
  const queue = new DownloadQueue({ maxConcurrent: 1, worker: (job) => new Promise((resolve) => finishes.set(job.id, resolve)), broadcast: () => {} });
  const first = queue.enqueue(request('first'));
  const second = queue.enqueue(request('second'));
  second.catch(() => {});
  finishes.get('first')({ path: 'first.exe' });
  await first;
  await tick();
  try { assert(finishes.has('second')); }
  finally {
    if (finishes.has('second')) { finishes.get('second')({ path: 'second.exe' }); await second; }
    else queue.cancel('second');
  }
});
