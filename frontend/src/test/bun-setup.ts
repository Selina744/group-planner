/**
 * Bun Test Setup - JSDOM Environment
 * Configures React Testing Library and JSDOM for component testing with Bun
 */

import { beforeAll, afterEach } from 'bun:test'
import { JSDOM } from 'jsdom'
import { cleanup } from '@testing-library/react'

// Set up JSDOM environment before any tests run
beforeAll(() => {
  console.log('🧪 Setting up Bun test environment with JSDOM...')

  // Create JSDOM instance with comprehensive configuration
  const dom = new JSDOM('<!DOCTYPE html><html><body><div id="root"></div></body></html>', {
    url: 'http://localhost:3000',
    pretendToBeVisual: true,
    resources: 'usable',
    runScripts: 'dangerously',
  })

  // Set up global DOM objects for React Testing Library
  Object.defineProperty(globalThis, 'window', {
    value: dom.window,
    writable: true,
    configurable: true
  })

  Object.defineProperty(globalThis, 'document', {
    value: dom.window.document,
    writable: true,
    configurable: true
  })

  Object.defineProperty(globalThis, 'navigator', {
    value: dom.window.navigator,
    writable: true,
    configurable: true
  })

  Object.defineProperty(globalThis, 'HTMLElement', {
    value: dom.window.HTMLElement,
    writable: true,
    configurable: true
  })

  Object.defineProperty(globalThis, 'Element', {
    value: dom.window.Element,
    writable: true,
    configurable: true
  })

  Object.defineProperty(globalThis, 'Text', {
    value: dom.window.Text,
    writable: true,
    configurable: true
  })

  Object.defineProperty(globalThis, 'DocumentFragment', {
    value: dom.window.DocumentFragment,
    writable: true,
    configurable: true
  })

  // Mock browser APIs that aren't available in JSDOM
  Object.defineProperty(globalThis.window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => {},
    }),
  })

  Object.defineProperty(globalThis, 'ResizeObserver', {
    value: class ResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  })

  Object.defineProperty(globalThis, 'IntersectionObserver', {
    value: class IntersectionObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  })

  // Mock localStorage with actual storage functionality
  const localStorageData: Record<string, string> = {}
  Object.defineProperty(globalThis, 'localStorage', {
    value: {
      getItem: (key: string) => localStorageData[key] || null,
      setItem: (key: string, value: string) => {
        localStorageData[key] = value
      },
      removeItem: (key: string) => {
        delete localStorageData[key]
      },
      clear: () => {
        for (const key in localStorageData) {
          delete localStorageData[key]
        }
      },
      get length() {
        return Object.keys(localStorageData).length
      },
      key: (index: number) => {
        const keys = Object.keys(localStorageData)
        return keys[index] || null
      },
    },
    writable: true,
  })

  // Mock sessionStorage
  Object.defineProperty(globalThis, 'sessionStorage', {
    value: {
      getItem: (key: string) => null,
      setItem: (key: string, value: string) => {},
      removeItem: (key: string) => {},
      clear: () => {},
      length: 0,
      key: (index: number) => null,
    },
    writable: true,
  })

  // Set up getComputedStyle mock
  Object.defineProperty(globalThis.window, 'getComputedStyle', {
    value: () => ({
      getPropertyValue: () => '',
    }),
  })

  console.log('✅ Bun test environment ready (JSDOM + React Testing Library)')
})

// Cleanup after each test
afterEach(() => {
  cleanup()
  // Clear localStorage between tests to prevent interference
  localStorage.clear()
  // Also clear any custom event listeners
  if (typeof window !== 'undefined') {
    window.removeAllListeners?.()
  }
})

// Export setup function for manual use if needed
export function setupBunTestEnvironment() {
  // This function is called automatically by beforeAll above
  // but can be called manually if needed
  console.log('Bun test environment already set up automatically')
}