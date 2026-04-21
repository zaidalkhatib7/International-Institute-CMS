import { useState } from 'react'
import { LockKeyhole } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { branding } from '../../../config/branding'
import { Button, Card, CardContent, Input } from '../../../components/ui'
import { setAdminToken } from '../../../services/tokenStorage'
import { loginAdmin } from '../services/authService'

export default function LoginPage() {
  const navigate = useNavigate()

  const [form, setForm] = useState({
    email: '',
    password: '',
    highSecurity: false,
  })

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleChange = (field, value) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError('')

    try {
      const data = await loginAdmin({
        email: form.email,
        password: form.password,
      })

      const token = data?.access_token

      if (!token) {
        throw new Error('No access token returned from server.')
      }

      setAdminToken(token)
      navigate('/dashboard')
    } catch (err) {
      const message =
        err?.response?.data?.message ||
        err?.message ||
        'Login failed. Please check your credentials.'

      setError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-6 py-10">
      <Card className="w-full max-w-xl rounded-[32px] p-2">
        <CardContent className="p-8 md:p-10">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-[var(--color-primary)]">
            <LockKeyhole size={28} color="var(--color-secondary)" />
          </div>

          <div className="mt-6 text-center">
            <h1 className="text-4xl font-bold text-[var(--color-text)]">
              {branding.logo.fullText}
            </h1>
            <p className="mt-2 text-sm uppercase tracking-[0.2em] text-[var(--color-text-muted)]">
              {branding.productName} CMS
            </p>
          </div>

          <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
            <Input
              label="Admin Email"
              type="email"
              placeholder="Enter admin email"
              value={form.email}
              onChange={(e) => handleChange('email', e.target.value)}
            />

            <Input
              label="Password"
              type="password"
              placeholder="Enter password"
              value={form.password}
              onChange={(e) => handleChange('password', e.target.value)}
            />

            <label className="flex items-center gap-3 text-sm text-[var(--color-text-muted)]">
              <input
                type="checkbox"
                checked={form.highSecurity}
                onChange={(e) => handleChange('highSecurity', e.target.checked)}
              />
              Enable high-security session
            </label>

            {error ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                {error}
              </div>
            ) : null}

            <Button fullWidth type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Authenticating...' : 'Authenticate Access'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}