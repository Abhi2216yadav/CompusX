/**
 * Minimal browser shims so the service layer (which is written against a
 * browser) can be exercised under plain node by `scripts/smoke.ts`.
 */
const store = new Map()
globalThis.localStorage = {
  get length() {
    return store.size
  },
  key: (i) => Array.from(store.keys())[i] ?? null,
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => void store.set(k, String(v)),
  removeItem: (k) => void store.delete(k),
  clear: () => store.clear(),
}

globalThis.window = globalThis
globalThis.window.addEventListener = () => {}
globalThis.window.removeEventListener = () => {}
globalThis.window.setInterval = globalThis.setInterval
globalThis.window.clearInterval = globalThis.clearInterval
globalThis.document = {
  visibilityState: 'visible',
  addEventListener: () => {},
  removeEventListener: () => {},
  setAttribute: () => {},
  removeAttribute: () => {},
  body: { setAttribute: () => {}, removeAttribute: () => {} },
}