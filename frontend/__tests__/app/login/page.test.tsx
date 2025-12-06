/**
 * Tests for login page
 */

import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import LoginPage from '@/app/login/page'
import { apiClient } from '@/lib/api-client'

// Mock the auth context
jest.mock('@/lib/auth-context', () => {
  const mockLogin = jest.fn()
  const mockRegister = jest.fn()
  
  return {
    useAuth: () => ({
      login: mockLogin,
      register: mockRegister,
      user: null,
      isLoading: false,
    }),
    AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  }
})

describe('LoginPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders login form', () => {
    render(<LoginPage />)
    
    expect(screen.getByText('Sign in to your account')).toBeInTheDocument()
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
  })

  it('can switch between login and register', async () => {
    const user = userEvent.setup()
    render(<LoginPage />)
    
    // Initially shows login
    expect(screen.getByText('Sign in to your account')).toBeInTheDocument()
    
    // Click to switch to register
    const switchButton = screen.getByText(/don't have an account/i)
    await user.click(switchButton)
    
    // Now shows register
    expect(screen.getByText('Create new account')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sign up/i })).toBeInTheDocument()
  })

  it('displays error message when login fails', async () => {
    const user = userEvent.setup()
    const { useAuth } = require('@/lib/auth-context')
    const mockLogin = useAuth().login
    mockLogin.mockRejectedValueOnce(new Error('Invalid credentials'))
    
    render(<LoginPage />)
    
    const emailInput = screen.getByLabelText(/email address/i)
    const passwordInput = screen.getByLabelText(/password/i)
    const submitButton = screen.getByRole('button', { name: /sign in/i })
    
    await user.type(emailInput, 'test@example.com')
    await user.type(passwordInput, 'password123')
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText('Invalid credentials')).toBeInTheDocument()
    })
  })

  it('disables submit button while loading', async () => {
    const user = userEvent.setup()
    const { useAuth } = require('@/lib/auth-context')
    const mockLogin = useAuth().login
    // Create a promise that never resolves to simulate loading
    mockLogin.mockImplementation(() => new Promise(() => {}))
    
    render(<LoginPage />)
    
    const emailInput = screen.getByLabelText(/email address/i)
    const passwordInput = screen.getByLabelText(/password/i)
    const submitButton = screen.getByRole('button', { name: /sign in/i })
    
    await user.type(emailInput, 'test@example.com')
    await user.type(passwordInput, 'password123')
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(submitButton).toBeDisabled()
      expect(screen.getByText('Loading...')).toBeInTheDocument()
    })
  })

  it('validates required fields', async () => {
    const user = userEvent.setup()
    render(<LoginPage />)
    
    const submitButton = screen.getByRole('button', { name: /sign in/i })
    await user.click(submitButton)
    
    // HTML5 validation should prevent submission
    const emailInput = screen.getByLabelText(/email address/i) as HTMLInputElement
    const passwordInput = screen.getByLabelText(/password/i) as HTMLInputElement
    
    expect(emailInput.validity.valid).toBe(false)
    expect(passwordInput.validity.valid).toBe(false)
  })
})

