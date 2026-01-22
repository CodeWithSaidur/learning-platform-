// sign-up - Fixed Edge Cases
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSignUp } from '@clerk/nextjs'
import Link from 'next/link'
import { Loader2, ArrowLeft, Eye, EyeOff } from 'lucide-react'

export default function SignUpPage() {
  const { isLoaded, signUp, setActive } = useSignUp()
  const router = useRouter()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [step, setStep] = useState<'form' | 'verify'>('form')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [codeTimer, setCodeTimer] = useState(60)

  // Reset form when returning to sign up
  useEffect(() => {
    if (step === 'form') {
      setCode('')
      setError(null)
    }
  }, [step])

  // Code timer
  useEffect(() => {
    if (step !== 'verify' || codeTimer <= 0) return

    const interval = setInterval(() => {
      setCodeTimer(t => Math.max(0, t - 1))
    }, 1000)

    return () => clearInterval(interval)
  }, [step, codeTimer])

  if (!isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
      </div>
    )
  }

  const handleSignUp = async () => {
    // Basic validation
    if (!email || !password) {
      setError('Please fill in all fields')
      return
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email.trim())) {
      setError('Please enter a valid email address')
      return
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    setLoading(true)
    setError(null)

    try {
      await signUp.create({
        emailAddress: email.trim().toLowerCase(),
        password
      })

      await signUp.prepareEmailAddressVerification({
        strategy: 'email_code'
      })

      setStep('verify')
      setCodeTimer(60)
    } catch (err: any) {
      const errorCode = err?.errors?.[0]?.code
      const errorMessage = err?.errors?.[0]?.message

      if (errorCode === 'form_identifier_exists') {
        setError('That email address is taken. Please try another.')
      } else if (errorCode === 'form_password_pwned') {
        setError(
          'This password has been found in a data breach. Please choose a different password.'
        )
      } else if (errorCode === 'form_param_format_invalid') {
        setError(
          'Please check that your email and password meet the requirements.'
        )
      } else {
        setError(errorMessage ?? 'Sign up failed. Please try again.')
      }
      // Don't rethrow - handle error gracefully
    } finally {
      setLoading(false)
    }
  }

  const handleVerify = async () => {
    if (!code || code.length !== 6) {
      setError('Please enter a valid 6-digit code')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const result = await signUp.attemptEmailAddressVerification({
        code
      })

      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId })
        router.replace('/')
      } else {
        setError('Verification incomplete. Please try again.')
      }
    } catch (err: any) {
      console.error('Verification error:', err)
      const errorMessage =
        err?.errors?.[0]?.message ?? 'Invalid verification code'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleResendCode = async () => {
    if (!signUp) {
      setError('Session expired. Please start over.')
      setStep('form')
      return
    }

    setLoading(true)
    try {
      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' })
      setCode('')
      setError(null)
      setCodeTimer(60)
    } catch (err: any) {
      setError('Failed to resend code. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const goBack = () => {
    setStep('form')
  }

  const togglePasswordVisibility = () => {
    setShowPassword(prev => !prev)
  }

  const handleKeyPress = (e: React.KeyboardEvent, action: () => void) => {
    if (e.key === 'Enter' && !loading) {
      action()
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-white/50">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-amber-800 to-orange-800 bg-clip-text text-transparent mb-2">
              {step === 'form' ? 'Create Account' : 'Verify Email'}
            </h1>
            <p className="text-gray-600 text-lg">
              {step === 'form'
                ? 'Join us today'
                : 'Check your email for the code'}
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-800 text-sm">
              {error}
            </div>
          )}

          {step === 'verify' && (
            <button
              onClick={goBack}
              disabled={loading}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              <ArrowLeft size={16} />
              Change email
            </button>
          )}

          {step === 'form' ? (
            <>
              <div className="space-y-4 mb-8">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    placeholder="Enter your email"
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-amber-500 focus:outline-none focus:ring-4 focus:ring-amber-100 transition-all text-lg"
                    value={email}
                    onChange={e => {
                      setEmail(e.target.value)
                      setError(null)
                    }}
                    onKeyPress={e => handleKeyPress(e, handleSignUp)}
                    disabled={loading}
                    autoComplete="email"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Create a password (8+ characters)"
                      className="w-full px-4 py-3 pr-12 rounded-xl border-2 border-gray-200 focus:border-amber-500 focus:outline-none focus:ring-4 focus:ring-amber-100 transition-all text-lg"
                      value={password}
                      onChange={e => {
                        setPassword(e.target.value)
                        setError(null)
                      }}
                      onKeyPress={e => handleKeyPress(e, handleSignUp)}
                      disabled={loading}
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={togglePasswordVisibility}
                      disabled={loading}
                      className="absolute inset-y-0 right-0 flex items-center pr-4 text-gray-500 hover:text-gray-700 transition-colors disabled:opacity-50"
                      aria-label={
                        showPassword ? 'Hide password' : 'Show password'
                      }>
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>
              </div>

              <div id="clerk-captcha" className="mb-8" />

              <button
                onClick={handleSignUp}
                disabled={loading || !email.trim() || !password}
                className="w-full bg-gradient-to-r from-amber-600 to-orange-600 text-white py-4 px-6 rounded-xl text-lg font-semibold hover:from-amber-700 hover:to-orange-700 focus:outline-none focus:ring-4 focus:ring-amber-300/50 shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3">
                {loading && <Loader2 className="h-5 w-5 animate-spin" />}
                Create Account
              </button>
            </>
          ) : (
            <>
              <div className="space-y-4 mb-8">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 text-center">
                    Verification Code
                  </label>
                  <input
                    type="text"
                    placeholder="000000"
                    maxLength={6}
                    className="w-full px-4 py-6 text-center text-2xl font-mono tracking-widest rounded-xl border-2 border-gray-200 focus:border-green-500 focus:outline-none focus:ring-4 focus:ring-green-100 transition-all uppercase"
                    value={code}
                    onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
                    onKeyPress={e => handleKeyPress(e, handleVerify)}
                    disabled={loading}
                    autoComplete="one-time-code"
                    inputMode="numeric"
                  />
                </div>
              </div>

              <div id="clerk-captcha" className="mb-8" />

              <button
                onClick={handleVerify}
                disabled={loading || code.length !== 6}
                className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white py-4 px-6 rounded-xl text-lg font-semibold hover:from-green-700 hover:to-emerald-700 focus:outline-none focus:ring-4 focus:ring-green-300/50 shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3">
                {loading && <Loader2 className="h-5 w-5 animate-spin" />}
                Verify Email
              </button>

              <div className="mt-6 text-center space-y-2">
                <button
                  onClick={handleResendCode}
                  disabled={codeTimer > 0 || loading}
                  className="text-sm text-amber-600 hover:text-amber-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                  {codeTimer > 0
                    ? `Resend code in ${codeTimer}s`
                    : 'Resend code'}
                </button>
                <p className="text-xs text-gray-500">
                  Check your spam/junk folder if you don't see the email
                </p>
              </div>
            </>
          )}

          {step === 'form' && (
            <div className="mt-8 pt-8 border-t border-gray-200 text-center">
              <p className="text-sm text-gray-600 mb-4">
                Already have an account?
              </p>
              <Link
                href="/sign-in"
                className="block w-full bg-gray-100 text-gray-900 py-3 px-6 rounded-xl text-lg font-semibold hover:bg-gray-200 transition-all text-center">
                Sign In
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
