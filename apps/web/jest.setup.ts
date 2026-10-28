import '@testing-library/jest-dom';

// jsdom has no ResizeObserver; Headless UI (Select/Listbox) needs one to mount.
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
}
