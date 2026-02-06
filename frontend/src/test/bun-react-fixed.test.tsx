/**
 * Bun Test + React Component Testing - Fixed Version
 *
 * Demonstrates React component testing with Bun test using container queries instead of screen
 */

import './bun-setup' // Import setup to ensure JSDOM environment is ready
import { describe, it, expect, beforeEach, mock } from 'bun:test'
import { render, fireEvent, act, waitFor } from '@testing-library/react'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import React, { useState, useEffect } from 'react'

// Test components
interface SimpleButtonProps {
  onClick: () => void
  children: React.ReactNode
  disabled?: boolean
}

function SimpleButton({ onClick, children, disabled = false }: SimpleButtonProps) {
  return (
    <button onClick={onClick} disabled={disabled} data-testid="simple-button">
      {children}
    </button>
  )
}

interface CounterProps {
  initialValue?: number
}

function Counter({ initialValue = 0 }: CounterProps) {
  const [count, setCount] = useState(initialValue)

  // Update internal state when initialValue prop changes
  useEffect(() => {
    setCount(initialValue)
  }, [initialValue])

  return (
    <div>
      <span data-testid="counter-value">Count: {count}</span>
      <button
        data-testid="increment-button"
        onClick={() => setCount(c => c + 1)}
      >
        Increment
      </button>
      <button
        data-testid="decrement-button"
        onClick={() => setCount(c => c - 1)}
      >
        Decrement
      </button>
    </div>
  )
}

// Material-UI theme for testing
const testTheme = createTheme()

const renderWithTheme = (component: React.ReactElement) => {
  return render(
    <ThemeProvider theme={testTheme}>
      {component}
    </ThemeProvider>
  )
}

describe('Bun Test + React Components - Fixed Version', () => {
  describe('Basic Component Rendering', () => {
    it('should render simple components', () => {
      const mockClick = mock()
      const { container } = render(<SimpleButton onClick={mockClick}>Click me</SimpleButton>)

      const button = container.querySelector('[data-testid="simple-button"]') as HTMLButtonElement
      expect(button).toBeDefined()
      expect(button.textContent).toBe('Click me')

      console.log('✅ Basic React component rendering works with Bun')
    })

    it('should handle component props', () => {
      const mockClick = mock()
      const { container } = render(<SimpleButton onClick={mockClick} disabled>Disabled Button</SimpleButton>)

      const button = container.querySelector('[data-testid="simple-button"]') as HTMLButtonElement
      expect(button.disabled).toBe(true)
      expect(button.textContent).toBe('Disabled Button')
    })

    it('should render components with Material-UI theme', () => {
      const mockClick = mock()
      const { container } = renderWithTheme(<SimpleButton onClick={mockClick}>Themed Button</SimpleButton>)

      const button = container.querySelector('[data-testid="simple-button"]') as HTMLButtonElement
      expect(button).toBeDefined()
      expect(button.textContent).toBe('Themed Button')

      console.log('✅ Material-UI theme provider works with Bun')
    })
  })

  describe('User Interactions', () => {
    it('should handle click events', () => {
      const mockClick = mock()
      const { container } = render(<SimpleButton onClick={mockClick}>Click me</SimpleButton>)

      const button = container.querySelector('[data-testid="simple-button"]') as HTMLButtonElement
      fireEvent.click(button)

      expect(mockClick).toHaveBeenCalledTimes(1)
      console.log('✅ Event handling works with Bun')
    })

    it('should handle state changes', () => {
      const { container } = render(<Counter initialValue={5} />)

      const counter = container.querySelector('[data-testid="counter-value"]') as HTMLElement
      const incrementButton = container.querySelector('[data-testid="increment-button"]') as HTMLButtonElement
      const decrementButton = container.querySelector('[data-testid="decrement-button"]') as HTMLButtonElement

      expect(counter.textContent).toBe('Count: 5')

      fireEvent.click(incrementButton)
      expect(counter.textContent).toBe('Count: 6')

      fireEvent.click(decrementButton)
      expect(counter.textContent).toBe('Count: 5')

      console.log('✅ State management works with Bun')
    })
  })

  describe('Component Queries', () => {
    it('should support container queries', () => {
      const { container } = render(<Counter />)

      // Test different query methods using container
      const counterValue = container.querySelector('[data-testid="counter-value"]')
      const incrementButton = container.querySelector('[data-testid="increment-button"]')

      expect(counterValue).toBeDefined()
      expect(counterValue?.textContent).toBe('Count: 0')
      expect(incrementButton).toBeDefined()
      expect(incrementButton?.textContent).toBe('Increment')

      // Test query that should not exist
      const nonExistent = container.querySelector('[data-testid="non-existent"]')
      expect(nonExistent).toBeNull()

      console.log('✅ Container-based queries work with Bun')
    })
  })

  describe('Component Re-rendering', () => {
    it('should handle component updates', () => {
      const { container, rerender } = render(<Counter initialValue={0} />)

      // Check initial state
      let counter = container.querySelector('[data-testid="counter-value"]') as HTMLElement
      expect(counter.textContent).toBe('Count: 0')

      rerender(<Counter initialValue={10} />)

      // Query DOM again after rerender to avoid stale reference
      counter = container.querySelector('[data-testid="counter-value"]') as HTMLElement
      expect(counter.textContent).toBe('Count: 10')

      console.log('✅ Component re-rendering works with Bun')
    })
  })

  describe('Error Boundaries and Edge Cases', () => {
    it('should handle components with conditional rendering', () => {
      function ConditionalComponent({ show }: { show: boolean }) {
        return (
          <div>
            {show && <span data-testid="conditional-content">Visible content</span>}
            <span data-testid="always-visible">Always visible</span>
          </div>
        )
      }

      const { container, rerender } = render(<ConditionalComponent show={false} />)

      expect(container.querySelector('[data-testid="conditional-content"]')).toBeNull()
      expect(container.querySelector('[data-testid="always-visible"]')).toBeDefined()

      rerender(<ConditionalComponent show={true} />)
      expect(container.querySelector('[data-testid="conditional-content"]')).toBeDefined()
      expect(container.querySelector('[data-testid="always-visible"]')).toBeDefined()
    })
  })

  describe('Mock Integration', () => {
    it('should integrate mocks with React components', async () => {
      const mockApiCall = mock().mockResolvedValue({ success: true })

      function ApiButton() {
        const [status, setStatus] = useState<string>('ready')

        const handleClick = async () => {
          setStatus('loading')
          try {
            await mockApiCall()
            setStatus('success')
          } catch {
            setStatus('error')
          }
        }

        return (
          <div>
            <button onClick={handleClick} data-testid="api-button">
              Call API
            </button>
            <span data-testid="status">Status: {status}</span>
          </div>
        )
      }

      const { container } = render(<ApiButton />)

      const statusElement = container.querySelector('[data-testid="status"]') as HTMLElement
      expect(statusElement.textContent).toBe('Status: ready')

      const apiButton = container.querySelector('[data-testid="api-button"]') as HTMLButtonElement

      await act(async () => {
        fireEvent.click(apiButton)
      })

      // Wait for async state updates to complete
      await waitFor(() => {
        const updatedStatus = container.querySelector('[data-testid="status"]') as HTMLElement
        expect(updatedStatus.textContent).toBe('Status: success')
      })

      expect(mockApiCall).toHaveBeenCalledTimes(1)

      console.log('✅ Mock integration with React components works with Bun')
    })
  })
})