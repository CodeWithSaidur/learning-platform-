'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSignIn } from '@clerk/nextjs'
import Link from 'next/link'
import { Loader2, ArrowLeft, Eye, EyeOff } from 'lucide-react'

export default function ForgotPasswordPage() {
  const { isLoaded, signIn, setActive } = useSignIn()
  const router = useRouter()

  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [step, setStep] = useState<'request' | 'verify'>('request')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [codeTimer, setCodeTimer] = useState(60)

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
      </div>
    )
  }

  useEffect(() => {
    if (step === 'request') {
      setCode('')
      setNewPassword('')
      setError(null)
      setShowPassword(false)
    }
  }, [step])

  useEffect(() => {
    if (step !== 'verify' || codeTimer <= 0) return
    const timer = setInterval(() => setCodeTimer(t => t - 1), 1000)
    return () => clearInterval(timer)
  }, [step, codeTimer])

  /* ---------------- Step 1: Send Reset Code ---------------- */

  const handleSendCode = async () => {
    if (loading) return

    if (!email.trim()) {
      setError('Email is required')
      return
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email.trim())) {
      setError('Please enter a valid email address')
      return
    }

    setLoading(true)
    setError(null)

    try {
      await signIn.create({
        strategy: 'reset_password_email_code',
        identifier: email.trim().toLowerCase()
      })

      setStep('verify')
      setCodeTimer(60)
    } catch (err: unknown) {
      const clerkError = err as {
        errors?: { code?: string; message?: string }[]
      }

      const firstError = clerkError?.errors?.[0]

      switch (firstError?.code) {
        case 'form_identifier_not_found':
          setError('No account found with this email address')
          break

        case 'too_many_attempts':
          setError('Too many attempts. Please try again later.')
          break

        case 'captcha_invalid':
          setError('Captcha verification failed. Please try again.')
          break

        default:
          setError(
            firstError?.message ??
              'Unable to send reset code. Please try again.'
          )
      }
    } finally {
      setLoading(false)
    }
  }

  /* ---------------- Step 2: Verify Code & Reset Password ---------------- */

  const handleResetPassword = async () => {
    if (loading) return

    if (code.length !== 6) {
      setError('Please enter a valid 6-digit code')
      return
    }

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const result = await signIn.attemptFirstFactor({
        strategy: 'reset_password_email_code',
        code,
        password: newPassword
      })

      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId })
        router.replace('/')
        return
      }

      setError('Password reset incomplete. Please try again.')
    } catch (err: unknown) {
      const clerkError = err as {
        errors?: { code?: string; message?: string }[]
      }

      const firstError = clerkError?.errors?.[0]

      switch (firstError?.code) {
        case 'form_code_incorrect':
          setError('Invalid verification code')
          break

        case 'form_password_pwned':
          setError(
            'This password has appeared in a data breach. Choose another one.'
          )
          break

        case 'form_param_format_invalid':
          setError('Password does not meet security requirements')
          break

        default:
          setError(
            firstError?.message ?? 'Invalid code or password. Please try again.'
          )
      }
    } finally {
      setLoading(false)
    }
  }

  /* ---------------- Resend Code ---------------- */

  const handleResendCode = async () => {
    if (loading) return

    setLoading(true)
    setError(null)

    try {
      await signIn.create({
        strategy: 'reset_password_email_code',
        identifier: email.trim().toLowerCase()
      })
      setCode('')
      setCodeTimer(60)
    } catch {
      setError('Failed to resend code. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-amber-50 to-orange-100 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-white/50">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold bg-linear-to-r from-amber-800 to-orange-800 bg-clip-text text-transparent mb-2">
              {step === 'request' ? 'Reset Password' : 'New Password'}
            </h1>
            <p className="text-gray-600 text-lg">
              {step === 'request'
                ? 'Enter your email to receive a reset code'
                : 'Enter the code sent to your email'}
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-800 text-sm">
              {error}
            </div>
          )}

          {step === 'verify' && (
            <button
              onClick={() => setStep('request')}
              disabled={loading}
              className="flex items-center gap-2 text-sm text-gray-600 mb-6">
              <ArrowLeft size={16} /> Change email
            </button>
          )}

          {step === 'request' ? (
            <>
              <input
                type="email"
                value={email}
                onChange={e => {
                  setEmail(e.target.value)
                  setError(null)
                }}
                disabled={loading}
                autoComplete="email"
                placeholder="Enter your email"
                className="w-full mb-6 px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-amber-500 focus:ring-4 focus:ring-amber-100"
              />

              <div id="clerk-captcha" className="mb-6" />

              <button
                onClick={handleSendCode}
                disabled={loading || !email.trim()}
                className="w-full bg-linear-to-r from-amber-600 to-orange-600 text-white py-4 rounded-xl font-semibold">
                {loading ? 'Sending...' : 'Send Reset Code'}
              </button>
            </>
          ) : (
            <>
              <input
                type="text"
                value={code}
                onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
                maxLength={6}
                inputMode="numeric"
                className="w-full mb-4 text-center text-xl tracking-widest rounded-xl border-2 border-gray-200"
                placeholder="000000"
              />

              <div className="relative mb-6">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  autoComplete="new-password"
                  placeholder="New password (8+ characters)"
                  className="w-full px-4 py-3 pr-12 rounded-xl border-2 border-gray-200"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-4 top-1/2 -translate-y-1/2">
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              <div id="clerk-captcha" className="mb-6" />

              <button
                onClick={handleResetPassword}
                disabled={
                  loading || code.length !== 6 || newPassword.length < 8
                }
                className="w-full bg-linear-to-r from-green-600 to-emerald-600 text-white py-4 rounded-xl font-semibold">
                {loading ? 'Resetting...' : 'Reset Password'}
              </button>

              <button
                onClick={handleResendCode}
                disabled={codeTimer > 0 || loading}
                className="mt-4 text-sm text-amber-600 w-full">
                {codeTimer > 0 ? `Resend code in ${codeTimer}s` : 'Resend code'}
              </button>
            </>
          )}

          <div className="mt-8 pt-6 border-t text-center">
            <Link
              href="/sign-in"
              className="block w-full bg-gray-100 py-3 rounded-xl font-semibold">
              Back to Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
