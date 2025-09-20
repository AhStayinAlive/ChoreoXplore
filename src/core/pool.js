export function createPool(createFn, resetFn) {
  const free = [];
  const used = new Set();
  return {
    acquire() {
      const obj = free.pop() || createFn();
      used.add(obj);
      return obj;
    },
    release(obj) {
      resetFn(obj);
      used.delete(obj);
      free.push(obj);
    },
    forEach(fn) { used.forEach(fn); },
    size() { return { used: used.size, free: free.length }; }
  };
}

