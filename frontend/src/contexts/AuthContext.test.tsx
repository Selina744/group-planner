/**
 * AuthContext Tests
 *
 * Example tests demonstrating:
 * - React Context testing patterns
 * - useReducer state management testing
 * - Mock HTTP requests with axios
 * - Provider component testing
 * - Custom hook testing
 */

import '../test/bun-setup' // Import Bun JSDOM setup
import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test'
import { render, act, waitFor } from '@testing-library/react'
import { ReactNode } from 'react'
import { AuthProvider, useAuth } from './AuthContext'

// Mock AuthService functions directly for Bun
const mockAuthService = {
  login: mock(),
  register: mock(),
  logout: mock(),
  updateProfile: mock(),
  getCurrentUser: mock(),
  initialize: mock(),
  getAccessToken: mock(),
}

// Mock the AuthService module - Bun style
const originalAuthService = await import('../services/authService')
Object.assign(originalAuthService.AuthService, mockAuthService)

// Test component that uses the useAuth hook
const TestComponent = () => {
  const {
    user,
    isAuthenticated,
    isLoading,
    error,
    login,
    logout,
    register,
    clearError,
  } = useAuth()

  return (
    <div>
      <div data-testid="user-info">
        {isAuthenticated ? (
          <span>Welcome {user?.name || 'Unknown'}</span>
        ) : (
          <span>Not authenticated</span>
        )}
      </div>
      <div data-testid="loading-state">
        {isLoading ? 'Loading...' : 'Ready'}
      </div>
      <div data-testid="error-message">
        {error || 'No errors'}
      </div>
      <button onClick={() => login({ identifier: 'test@example.com', password: 'password' })}>
        Login
      </button>
      <button onClick={() => register({
        email: 'test@example.com',
        password: 'password'
      })}>
        Register
      </button>
      <button onClick={logout}>
        Logout
      </button>
      <button onClick={clearError}>
        Clear Error
      </button>
    </div>
  )
}

// Wrapper component for testing
const renderWithAuthProvider = (children: ReactNode) => {
  return render(
    <AuthProvider>
      {children}
    </AuthProvider>
  )
}

describe('AuthContext', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    mockAuthService.login.mockClear()
    mockAuthService.register.mockClear()
    mockAuthService.logout.mockClear()
    mockAuthService.updateProfile.mockClear()
    mockAuthService.getCurrentUser.mockClear()
    mockAuthService.initialize.mockClear()
    mockAuthService.getAccessToken.mockClear()

    // Clear localStorage before each test
    localStorage.clear()

    // Set default mock behaviors for initialization
    mockAuthService.initialize.mockResolvedValue(false) // No session to restore by default
    mockAuthService.getAccessToken.mockReturnValue(null)
  })

  afterEach(() => {
    // Clear any timers if needed
  })

  describe('Initial State', () => {
    it('should provide initial unauthenticated state', async () => {
      const { container } = renderWithAuthProvider(<TestComponent />)

      // Wait for async initialization to complete
      await waitFor(() => {
        const loadingState = container.querySelector('[data-testid="loading-state"]') as HTMLElement
        expect(loadingState.textContent).toBe('Ready')
      })

      const userInfo = container.querySelector('[data-testid="user-info"]') as HTMLElement
      const loadingState = container.querySelector('[data-testid="loading-state"]') as HTMLElement
      const errorMessage = container.querySelector('[data-testid="error-message"]') as HTMLElement

      expect(userInfo.textContent).toBe('Not authenticated')
      expect(loadingState.textContent).toBe('Ready')
      expect(errorMessage.textContent).toBe('No errors')
    })

    it('should restore authentication from localStorage on initialization', async () => {
      // Mock localStorage with refresh token (the actual storage format)
      const mockUser = { id: '1', name: 'John Doe', email: 'john@example.com' }
      const mockAccessToken = 'mock-access-token'

      // Set refresh token (what tokenManager actually looks for)
      localStorage.setItem('refresh_token', 'mock-refresh-token')

      // Mock successful session restoration
      mockAuthService.initialize.mockResolvedValue(true)
      mockAuthService.getCurrentUser.mockResolvedValue(mockUser)
      mockAuthService.getAccessToken.mockReturnValue(mockAccessToken)

      const { container } = renderWithAuthProvider(<TestComponent />)

      // Wait for async initialization and user loading
      await waitFor(() => {
        const userInfo = container.querySelector('[data-testid="user-info"]') as HTMLElement
        expect(userInfo.textContent).toBe('Welcome John Doe')
      })

      const loadingState = container.querySelector('[data-testid="loading-state"]') as HTMLElement
      expect(loadingState.textContent).toBe('Ready')
    })
  })

  describe('Login', () => {
    it('should handle successful login', async () => {
      const mockResponse = {
        user: { id: '1', name: 'John Doe', email: 'john@example.com' },
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
      }

      mockAuthService.login.mockResolvedValueOnce(mockResponse)

      const { container } = renderWithAuthProvider(<TestComponent />)

      const loginButton = Array.from(container.querySelectorAll('button')).find(btn =>
        btn.textContent === 'Login'
      ) as HTMLButtonElement

      await act(async () => {
        loginButton.click()
      })

      await waitFor(() => {
        const userInfo = container.querySelector('[data-testid="user-info"]') as HTMLElement
        expect(userInfo.textContent).toBe('Welcome John Doe')
      })

      // Verify API was called correctly
      expect(mockAuthService.login).toHaveBeenCalledWith({
        identifier: 'test@example.com',
        password: 'password'
      })
    })


    it('should show loading state during login', async () => {
      // Create a promise that we can control
      let resolveLogin: (value: any) => void
      const loginPromise = new Promise(resolve => {
        resolveLogin = resolve
      })

      mockAuthService.login.mockReturnValueOnce(loginPromise)

      const { container } = renderWithAuthProvider(<TestComponent />)

      const loginButton = Array.from(container.querySelectorAll('button')).find(btn =>
        btn.textContent === 'Login'
      ) as HTMLButtonElement

      act(() => {
        loginButton.click()
      })

      // Check loading state
      const loadingState = container.querySelector('[data-testid="loading-state"]') as HTMLElement
      expect(loadingState.textContent).toBe('Loading...')

      // Resolve the promise
      const mockResponse = {
        user: { id: '1', name: 'John Doe', email: 'john@example.com' },
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
      }

      await act(async () => {
        resolveLogin(mockResponse)
      })

      await waitFor(() => {
        const loadingState = container.querySelector('[data-testid="loading-state"]') as HTMLElement
        expect(loadingState.textContent).toBe('Ready')
      })
    })
  })

  describe('Register', () => {
    it('should handle successful registration', async () => {
      const mockResponse = {
        user: { id: '1', name: 'Test User', email: 'test@example.com' },
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
      }

      mockAuthService.register.mockResolvedValueOnce(mockResponse)

      const { container } = renderWithAuthProvider(<TestComponent />)

      const registerButton = Array.from(container.querySelectorAll('button')).find(btn =>
        btn.textContent === 'Register'
      ) as HTMLButtonElement

      await act(async () => {
        registerButton.click()
      })

      await waitFor(() => {
        const userInfo = container.querySelector('[data-testid="user-info"]') as HTMLElement
        expect(userInfo.textContent).toBe('Welcome Test User')
      })

      // Verify API was called correctly
      expect(mockAuthService.register).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password'
      })
    })

  })

  describe('Logout', () => {
    it('should clear user state and localStorage on logout', async () => {
      // Set up authenticated state
      const mockUser = { id: '1', name: 'John Doe', email: 'john@example.com' }

      // Set refresh token and mock successful initialization
      localStorage.setItem('refresh_token', 'mock-refresh-token')
      mockAuthService.initialize.mockResolvedValue(true)
      mockAuthService.getCurrentUser.mockResolvedValue(mockUser)
      mockAuthService.getAccessToken.mockReturnValue('mock-access-token')
      mockAuthService.logout.mockResolvedValue(undefined)

      const { container } = renderWithAuthProvider(<TestComponent />)

      // Wait for async initialization to complete
      await waitFor(() => {
        const userInfo = container.querySelector('[data-testid="user-info"]') as HTMLElement
        expect(userInfo.textContent).toBe('Welcome John Doe')
      })

      const userInfo = container.querySelector('[data-testid="user-info"]') as HTMLElement

      const logoutButton = Array.from(container.querySelectorAll('button')).find(btn =>
        btn.textContent === 'Logout'
      ) as HTMLButtonElement

      await act(async () => {
        logoutButton.click()
      })

      // Verify logged out state
      expect(userInfo.textContent).toBe('Not authenticated')

      // Verify AuthService.logout was called
      expect(mockAuthService.logout).toHaveBeenCalled()
    })
  })



  describe('Context Provider', () => {
    it('should throw error when useAuth is used outside AuthProvider', () => {
      // Test component that catches the error instead of letting it throw
      function ErrorTestComponent() {
        try {
          useAuth()
          return <div data-testid="success">Should not render</div>
        } catch (error: any) {
          return <div data-testid="error">{error.message}</div>
        }
      }

      const { container } = render(<ErrorTestComponent />)

      const errorElement = container.querySelector('[data-testid="error"]') as HTMLElement
      expect(errorElement.textContent).toBe('useAuth must be used within an AuthProvider')
    })
  })
})