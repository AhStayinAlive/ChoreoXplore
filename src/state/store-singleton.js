// Store singleton pattern for Irina system
const stores = new Map();

export function singleton(key, fn) {
  if (!stores.has(key)) {
    stores.set(key, fn());
  }
  return stores.get(key);
}

export function createZustand(initializer) {
  // Simple Zustand-like implementation
  let state = {};
  const listeners = new Set();
  
  const setState = (partial) => {
    const nextState = typeof partial === 'function' ? partial(state) : partial;
    state = { ...state, ...nextState };
    listeners.forEach(listener => listener(state));
  };
  
  const getState = () => state;
  
  const subscribe = (listener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  };
  
  // Initialize the store
  const store = initializer(setState, getState, subscribe);
  
  // Return a hook-like function
  return (selector) => {
    if (typeof selector === 'function') {
      return selector(state);
    }
    return state;
  };
}
