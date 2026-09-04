import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

export default function Register() {
  const { register, currentUser } = useApp()
  const navigate = useNavigate()
  const location = useLocation()
  const from = location.state?.from?.pathname || '/'

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (currentUser) {
    return <Navigate to={from} replace />
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const nextErrors = {}
    if (!name.trim()) nextErrors.name = 'Please enter your name.'
    if (!email.trim()) {
      nextErrors.email = 'Please enter your email address.'
    } else if (!EMAIL_RE.test(email.trim())) {
      nextErrors.email = 'Please enter a valid email address, e.g. you@my.sliit.lk.'
    }
    if (!password) {
      nextErrors.password = 'Please choose a password.'
    } else if (password.length < 6) {
      nextErrors.password = 'Your password must be at least 6 characters.'
    }
    if (confirmPassword !== password) {
      nextErrors.confirmPassword = "Those passwords don't match. Please re-enter them."
    }
    setErrors(nextErrors)
    setFormError('')
    if (Object.keys(nextErrors).length > 0) return

    setSubmitting(true)
    const result = await register(name, email, password)
    setSubmitting(false)

    if (!result.success) {
      setFormError(result.message)
      return
    }
    navigate(from, { replace: true })
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-12">
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-bold text-slate-900">Sign up</h1>
        <p className="mt-1 text-sm text-slate-500">
          Create a student account to report items and submit claims. New
          accounts always start as a regular student — admin access is
          granted separately.
        </p>

        {formError && (
          <div className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {formError}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="mt-5 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Name</label>
            <input
              type="text"
              className={`w-full rounded-md border px-3 py-2 text-sm ${
                errors.name ? 'border-red-400' : 'border-slate-300'
              }`}
              placeholder="Your full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
            />
            {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
            <input
              type="email"
              className={`w-full rounded-md border px-3 py-2 text-sm ${
                errors.email ? 'border-red-400' : 'border-slate-300'
              }`}
              placeholder="you@my.sliit.lk"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
            />
            {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Password</label>
            <input
              type="password"
              className={`w-full rounded-md border px-3 py-2 text-sm ${
                errors.password ? 'border-red-400' : 'border-slate-300'
              }`}
              placeholder="At least 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
            />
            {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password}</p>}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Confirm password
            </label>
            <input
              type="password"
              className={`w-full rounded-md border px-3 py-2 text-sm ${
                errors.confirmPassword ? 'border-red-400' : 'border-slate-300'
              }`}
              placeholder="Re-enter your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
            />
            {errors.confirmPassword && (
              <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {submitting ? 'Creating account...' : 'Sign up'}
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-slate-500">
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-blue-600 hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  )
}
