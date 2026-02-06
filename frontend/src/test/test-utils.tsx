/**
 * Frontend Test Utilities
 *
 * Common testing utilities and helpers for React components
 * Provides reusable wrappers, mocks, and test data factories
 */

import { ReactElement, ReactNode } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import { AuthContext, AuthContextType } from '../contexts/AuthContext'
import { mock } from 'bun:test'

// Material-UI theme for tests
const testTheme = createTheme()

// Default mock auth context
export const mockAuthContext: AuthContextType = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  accessToken: null,
  refreshToken: null,
  login: mock(),
  logout: mock(),
  register: mock(),
  updateProfile: mock(),
  refreshUser: mock(),
  clearError: mock(),
}

// Props for AllTheProviders wrapper
interface AllTheProvidersProps {
  children: ReactNode
  authContextValue?: Partial<AuthContextType>
}

// Wrapper component that provides all necessary context providers
const AllTheProviders = ({ children, authContextValue = {} }: AllTheProvidersProps) => {
  const mergedAuthContext = { ...mockAuthContext, ...authContextValue }

  return (
    <AuthContext.Provider value={mergedAuthContext}>
      <ThemeProvider theme={testTheme}>
        {children}
      </ThemeProvider>
    </AuthContext.Provider>
  )
}

// Custom render function that includes providers
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  authContextValue?: Partial<AuthContextType>
}

export const renderWithProviders = (
  ui: ReactElement,
  options: CustomRenderOptions = {}
) => {
  const { authContextValue, ...renderOptions } = options

  return render(ui, {
    wrapper: (props) => (
      <AllTheProviders {...props} authContextValue={authContextValue} />
    ),
    ...renderOptions,
  })
}

// Test data factories for consistent mock data
export const testData = {
  user: {
    valid: {
      id: '1',
      name: 'John Doe',
      email: 'john@example.com',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    },
    admin: {
      id: '2',
      name: 'Admin User',
      email: 'admin@example.com',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    }
  },

  credentials: {
    valid: {
      email: 'john@example.com',
      password: 'SecurePass123!'
    },
    invalid: {
      email: 'invalid@example.com',
      password: 'wrongpassword'
    },
    malformed: {
      email: 'not-an-email',
      password: '123'
    }
  },

  apiResponses: {
    loginSuccess: {
      data: {
        user: {
          id: '1',
          name: 'John Doe',
          email: 'john@example.com',
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
        },
        accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
      }
    },
    registerSuccess: {
      data: {
        user: {
          id: '2',
          name: 'New User',
          email: 'newuser@example.com',
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
        },
        accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
      }
    },
    validationError: {
      response: {
        status: 400,
        data: {
          message: 'Validation failed',
          errors: ['Email is required', 'Password must be at least 8 characters']
        }
      }
    },
    unauthorizedError: {
      response: {
        status: 401,
        data: { message: 'Invalid credentials' }
      }
    },
    networkError: new Error('Network Error'),
  }
}

// Helper functions for common test scenarios

/**
 * Creates a mock authenticated context
 */
export const createAuthenticatedContext = (user = testData.user.valid): Partial<AuthContextType> => ({
  user,
  isAuthenticated: true,
  accessToken: 'mock-token',
  isLoading: false,
  error: null,
})

/**
 * Creates a mock loading context
 */
export const createLoadingContext = (): Partial<AuthContextType> => ({
  isLoading: true,
  error: null,
})

/**
 * Creates a mock error context
 */
export const createErrorContext = (errorMessage: string): Partial<AuthContextType> => ({
  error: errorMessage,
  isLoading: false,
})

/**
 * Mock localStorage for testing
 */
export const mockLocalStorage = {
  getItem: mock(),
  setItem: mock(),
  removeItem: mock(),
  clear: mock(),
}

/**
 * Setup mock localStorage
 */
export const setupMockLocalStorage = () => {
  Object.defineProperty(window, 'localStorage', {
    value: mockLocalStorage,
    writable: true,
  })
}

/**
 * Clean up mock localStorage
 */
export const cleanupMockLocalStorage = () => {
  mockLocalStorage.getItem.mockClear()
  mockLocalStorage.setItem.mockClear()
  mockLocalStorage.removeItem.mockClear()
  mockLocalStorage.clear.mockClear()
}

/**
 * Helper to simulate API delay for testing loading states
 */
export const createDelayedPromise = <T>(value: T, delay: number = 100): Promise<T> => {
  return new Promise(resolve => {
    setTimeout(() => resolve(value), delay)
  })
}

/**
 * Helper to simulate API error for testing error states
 */
export const createRejectedPromise = (error: any, delay: number = 10): Promise<never> => {
  return new Promise((_, reject) => {
    setTimeout(() => reject(error), delay)
  })
}

/**
 * Wait for next tick (useful for testing async state updates)
 */
export const nextTick = () => new Promise(resolve => setTimeout(resolve, 0))

/**
 * Custom matcher for testing form validation
 */
export const expectFormFieldToBeInvalid = (element: HTMLElement) => {
  const inputElement = element as HTMLInputElement
  expect(inputElement.validity.valid).toBe(false)
  expect(element.getAttribute('aria-invalid')).toBe('true')
}

/**
 * Custom matcher for testing form validation
 */
export const expectFormFieldToBeValid = (element: HTMLElement) => {
  const inputElement = element as HTMLInputElement
  expect(inputElement.validity.valid).toBe(true)
  expect(element.getAttribute('aria-invalid')).not.toBe('true')
}

// Re-export everything from testing library for convenience
export * from '@testing-library/react'
export { default as userEvent } from '@testing-library/user-event'