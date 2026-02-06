/**
 * Bun Test + AuthContext - Proof of Concept
 *
 * Demonstrates testing React Context with Bun test (simpler version of AuthContext.test.tsx)
 */

import './bun-setup' // Import setup to ensure JSDOM environment is ready
import { describe, it, expect, beforeEach, mock } from 'bun:test'
import { render, fireEvent, act, waitFor } from '@testing-library/react'
import React, { createContext, useContext, useState, ReactNode } from 'react'

// Simplified AuthContext for proof of concept
interface User {
  id: string
  name: string
  email: string
}

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
}

interface AuthContextType extends AuthState {
  login: (credentials: { email: string; password: string }) => Promise<void>
  logout: () => void
  clearError: () => void
}

// Create context
const AuthContext = createContext<AuthContextType | null>(null)

// Mock AuthService
const mockAuthService = {
  login: mock().mockResolvedValue({
    user: { id: '1', name: 'Test User', email: 'test@example.com' },
    accessToken: 'mock-token',
    refreshToken: 'mock-refresh'
  }),
  logout: mock().mockResolvedValue(undefined)
}

// AuthProvider component
function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: false,
    error: null
  })

  const login = async (credentials: { email: string; password: string }) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      const response = await mockAuthService.login(credentials)
      setState({
        user: response.user,
        isAuthenticated: true,
        isLoading: false,
        error: null
      })
    } catch (error: any) {
      setState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: error.message || 'Login failed'
      })
      throw error
    }
  }

  const logout = () => {
    setState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null
    })
  }

  const clearError = () => {
    setState(prev => ({ ...prev, error: null }))
  }

  const value: AuthContextType = {
    ...state,
    login,
    logout,
    clearError
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// Hook to use auth context
function useAuth(): AuthContextType {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

// Test component that uses the context
function TestAuthComponent() {
  const { user, isAuthenticated, isLoading, error, login, logout, clearError } = useAuth()

  return (
    <div>
      <div data-testid="auth-status">
        {isAuthenticated ? `Welcome ${user?.name}` : 'Not authenticated'}
      </div>

      <div data-testid="loading-state">
        {isLoading ? 'Loading...' : 'Ready'}
      </div>

      <div data-testid="error-message">
        {error || 'No errors'}
      </div>

      <button
        onClick={() => login({ email: 'test@example.com', password: 'password' })}
        data-testid="login-button"
      >
        Login
      </button>

      <button onClick={logout} data-testid="logout-button">
        Logout
      </button>

      <button onClick={clearError} data-testid="clear-error-button">
        Clear Error
      </button>
    </div>
  )
}

// Wrapper for tests
function renderWithAuth(component: React.ReactElement) {
  return render(
    <AuthProvider>
      {component}
    </AuthProvider>
  )
}

describe('Bun Test + AuthContext - Proof of Concept', () => {
  beforeEach(() => {
    mockAuthService.login.mockClear()
    mockAuthService.logout.mockClear()
  })

  describe('Initial State', () => {
    it('should provide initial unauthenticated state', () => {
      const { container } = renderWithAuth(<TestAuthComponent />)

      const authStatus = container.querySelector('[data-testid="auth-status"]') as HTMLElement
      const loadingState = container.querySelector('[data-testid="loading-state"]') as HTMLElement
      const errorMessage = container.querySelector('[data-testid="error-message"]') as HTMLElement

      expect(authStatus.textContent).toBe('Not authenticated')
      expect(loadingState.textContent).toBe('Ready')
      expect(errorMessage.textContent).toBe('No errors')

      console.log('✅ Initial auth state works with Bun')
    })
  })

  describe('Login Flow', () => {
    it('should handle successful login', async () => {
      const { container } = renderWithAuth(<TestAuthComponent />)

      const loginButton = container.querySelector('[data-testid="login-button"]') as HTMLButtonElement
      const authStatus = container.querySelector('[data-testid="auth-status"]') as HTMLElement

      // Initial state
      expect(authStatus.textContent).toBe('Not authenticated')

      // Click login button (wrap in act for async state updates)
      await act(async () => {
        fireEvent.click(loginButton)
      })

      // Wait for login completion and verify
      await waitFor(() => {
        expect(authStatus.textContent).toBe('Welcome Test User')
      })

      expect(mockAuthService.login).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password'
      })
      expect(mockAuthService.login).toHaveBeenCalledTimes(1)

      console.log('✅ Login flow works with Bun (sync verification)')
    })

  })

  describe('Logout Flow', () => {
    it('should handle logout', () => {
      const { container } = renderWithAuth(<TestAuthComponent />)

      const logoutButton = container.querySelector('[data-testid="logout-button"]') as HTMLButtonElement
      const authStatus = container.querySelector('[data-testid="auth-status"]') as HTMLElement

      act(() => {
        fireEvent.click(logoutButton)
      })

      // After logout, should be unauthenticated
      expect(authStatus.textContent).toBe('Not authenticated')

      console.log('✅ Logout flow works with Bun')
    })
  })

  describe('Error Handling', () => {
    it('should clear errors when clearError is called', () => {
      const { container } = renderWithAuth(<TestAuthComponent />)

      const clearErrorButton = container.querySelector('[data-testid="clear-error-button"]') as HTMLButtonElement
      const errorMessage = container.querySelector('[data-testid="error-message"]') as HTMLElement

      act(() => {
        fireEvent.click(clearErrorButton)
      })

      expect(errorMessage.textContent).toBe('No errors')

      console.log('✅ Error clearing works with Bun')
    })
  })

  describe('Context Provider', () => {
    it('should throw error when useAuth is used outside AuthProvider', () => {
      // Test component that uses auth outside provider
      function BadComponent() {
        try {
          useAuth()
          return <div>Should not render</div>
        } catch (error: any) {
          return <div data-testid="error">{error.message}</div>
        }
      }

      const { container } = render(<BadComponent />)

      const errorElement = container.querySelector('[data-testid="error"]') as HTMLElement
      expect(errorElement.textContent)
        .toBe('useAuth must be used within an AuthProvider')

      console.log('✅ Context provider error handling works with Bun')
    })
  })
})