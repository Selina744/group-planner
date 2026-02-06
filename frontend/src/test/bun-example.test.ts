/**
 * Bun Test Examples - Proof of Concept
 *
 * Demonstrates that Bun test can handle all the patterns from our Vitest examples
 */

import './bun-setup' // Import setup to ensure environment is ready
import { describe, it, expect, beforeEach, mock } from 'bun:test'

// Example utility functions (same as Vitest version)
function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

function formatUserName(firstName: string, lastName?: string): string {
  return lastName ? `${firstName} ${lastName}` : firstName
}

// Mock API service using Bun's mock system
const mockApiService = {
  login: mock(() => Promise.resolve({ success: true })),
  logout: mock(() => Promise.resolve()),
  getCurrentUser: mock(() => Promise.resolve({ id: '1', name: 'Test User' })),
}

describe('Bun Test Examples - Proof of Concept', () => {
  describe('Utility Functions', () => {
    it('should validate correct email addresses', () => {
      expect(validateEmail('test@example.com')).toBe(true)
      expect(validateEmail('user.name@domain.co.uk')).toBe(true)
      expect(validateEmail('test+tag@example.org')).toBe(true)
    })

    it('should reject invalid email addresses', () => {
      expect(validateEmail('invalid-email')).toBe(false)
      expect(validateEmail('test@')).toBe(false)
      expect(validateEmail('@domain.com')).toBe(false)
      expect(validateEmail('')).toBe(false)
    })

    it('should format user names correctly', () => {
      expect(formatUserName('John', 'Doe')).toBe('John Doe')
      expect(formatUserName('John')).toBe('John')
      expect(formatUserName('John', '')).toBe('John')
    })
  })

  describe('Mocking with Bun Test', () => {
    beforeEach(() => {
      // Reset mocks before each test
      mockApiService.login.mockClear()
      mockApiService.logout.mockClear()
      mockApiService.getCurrentUser.mockClear()
    })

    it('should support mock functions', async () => {
      const mockResponse = { user: { id: '1', name: 'Test' }, token: 'abc123' }
      mockApiService.login.mockResolvedValue(mockResponse)

      const result = await mockApiService.login({ email: 'test@example.com', password: 'test' })

      expect(result).toEqual(mockResponse)
      expect(mockApiService.login).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'test'
      })
      expect(mockApiService.login).toHaveBeenCalledTimes(1)
    })

    it('should handle mock rejections', async () => {
      const mockError = new Error('Network error')
      mockApiService.login.mockRejectedValue(mockError)

      await expect(mockApiService.login({ email: 'test', password: 'test' }))
        .rejects.toThrow('Network error')
    })

    it('should support multiple mock return values', () => {
      const mockFn = mock()
        .mockReturnValueOnce('first')
        .mockReturnValueOnce('second')
        .mockReturnValue('default')

      expect(mockFn()).toBe('first')
      expect(mockFn()).toBe('second')
      expect(mockFn()).toBe('default')
      expect(mockFn()).toBe('default') // Should continue returning default
    })
  })

  describe('Async Testing with Bun', () => {
    it('should handle promises', async () => {
      const asyncFunction = async (value: string) => {
        return new Promise<string>(resolve => {
          setTimeout(() => resolve(`Processed: ${value}`), 10)
        })
      }

      const result = await asyncFunction('test')
      expect(result).toBe('Processed: test')
    })

    it('should handle promise rejections', async () => {
      const asyncFunction = async () => {
        throw new Error('Async error')
      }

      await expect(asyncFunction()).rejects.toThrow('Async error')
    })
  })

  describe('TypeScript Support', () => {
    interface TestUser {
      id: string
      name: string
      email: string
      isActive?: boolean
    }

    it('should work with TypeScript interfaces', () => {
      const createUser = (userData: Omit<TestUser, 'id'>): TestUser => ({
        id: Math.random().toString(),
        ...userData
      })

      const user = createUser({
        name: 'Jane Doe',
        email: 'jane@example.com',
        isActive: true
      })

      expect(user).toHaveProperty('id')
      expect(user.name).toBe('Jane Doe')
      expect(user.email).toBe('jane@example.com')
      expect(user.isActive).toBe(true)
    })

    it('should handle optional properties', () => {
      const user: TestUser = {
        id: '1',
        name: 'John Doe',
        email: 'john@example.com'
        // isActive is optional
      }

      expect(user.isActive).toBeUndefined()
    })
  })

  describe('Environment Verification', () => {
    it('should have DOM globals available', () => {
      expect(typeof window).toBe('object')
      expect(typeof document).toBe('object')
      expect(typeof localStorage).toBe('object')
      console.log('✅ DOM environment verified in Bun test')
    })

    it('should have browser APIs mocked', () => {
      expect(typeof window.matchMedia).toBe('function')
      expect(typeof ResizeObserver).toBe('function')
      expect(typeof IntersectionObserver).toBe('function')
      console.log('✅ Browser APIs verified in Bun test')
    })
  })
})