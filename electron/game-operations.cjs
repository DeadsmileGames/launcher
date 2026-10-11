function createGameOperations() {
  const pending = new Map();
  return {
    get size() { return pending.size; },
    run(id, operation) {
      const previous = pending.get(id) || Promise.resolve();
      const result = previous.then(operation, operation);
      const release = () => { if (pending.get(id) === settled) pending.delete(id); };
      const settled = result.then(release, release);
      pending.set(id, settled);
      return result;
    },
  };
}

module.exports = { createGameOperations };
