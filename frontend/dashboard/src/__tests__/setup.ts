import '@testing-library/jest-dom';
import { vi, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// Cleanup after each test
afterEach(() => {
  cleanup();
  vi.clearAllMocks();

  // Clear localStorage between tests
  if (typeof localStorage !== 'undefined' && typeof localStorage.clear === 'function') {
    localStorage.clear();
  }
});

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock clipboard API
Object.defineProperty(navigator, 'clipboard', {
  value: {
    writeText: vi.fn(),
    readText: vi.fn(() => Promise.resolve('')),
  },
  writable: true,
});

// Mock scroll behavior
if (typeof Element !== 'undefined') {
  Element.prototype.scrollIntoView = vi.fn();
  
  // Polyfill for hasPointerCapture (required by Radix UI Select)
  if (!Element.prototype.hasPointerCapture) {
    Element.prototype.hasPointerCapture = vi.fn().mockReturnValue(false);
  }
  if (!Element.prototype.setPointerCapture) {
    Element.prototype.setPointerCapture = vi.fn();
  }
  if (!Element.prototype.releasePointerCapture) {
    Element.prototype.releasePointerCapture = vi.fn();
  }
}
if (typeof window !== 'undefined') {
  window.scrollTo = vi.fn();
  window.scroll = vi.fn();
}

// Silence console during tests (optional - can be removed for debugging)
const originalWarn = console.warn;
const originalError = console.error;

console.warn = vi.fn((message, ...args) => {
  // Only silence known React warnings
  if (
    typeof message === 'string' &&
    (message.includes('ReactDOM.render') ||
     message.includes('act()') ||
     message.includes('useLayoutEffect'))
  ) {
    return;
  }
  originalWarn(message, ...args);
});

console.error = vi.fn((message, ...args) => {
  // Only silence known React errors
  if (
    typeof message === 'string' &&
    (message.includes('Not implemented: HTMLFormElement.prototype.submit') ||
     message.includes('Could not parse CSS stylesheet'))
  ) {
    return;
  }
  originalError(message, ...args);
});

// Mock fetch globally for tests that don't explicitly mock it
global.fetch = vi.fn(() =>
  Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(''),
    blob: () => Promise.resolve(new Blob()),
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
  } as Response)
);
