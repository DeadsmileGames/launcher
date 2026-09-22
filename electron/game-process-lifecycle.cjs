// Attach this monitor immediately after spawn().  A game that exits during
// asynchronous achievement/save initialization must not leave its session
// indefinitely marked as running.
function monitorGameProcess(child) {
  if (!child || typeof child.once !== 'function') {
    throw new TypeError('A child process is required.');
  }
  let spawned = false;
  let ended = null;
  let onEnd = null;
  const record = (state) => {
    if (ended) return;
    ended = state;
    if (onEnd) onEnd(state);
  };

  child.once('spawn', () => { spawned = true; });
  child.once('exit', (code, signal) => record({ code, signal, error: null }));
  // A failed spawn emits error and close, but is not guaranteed to emit exit.
  // An error on an already spawned process is not necessarily an exit.
  child.on('error', (error) => {
    if (!spawned) record({ code: null, signal: null, error });
  });
  child.once('close', (code, signal) => record({ code, signal, error: null }));

  return {
    onEnd(callback) {
      if (typeof callback !== 'function') throw new TypeError('An end callback is required.');
      if (onEnd) throw new Error('The process already has an end callback.');
      onEnd = callback;
      if (ended) callback(ended);
    },
    get endState() { return ended; },
  };
}

module.exports = { monitorGameProcess };