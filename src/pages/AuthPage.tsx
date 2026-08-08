import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../store/auth'
import { isSupabaseConfigured } from '../lib/supabase'

export function AuthPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { signInWithEmail, loading } = useAuth()
  const navigate = useNavigate()

  if (!isSupabaseConfigured) {
    return (
      <div className="page">
        <div className="banner">
          Бэкенд ещё не настроен. Добавьте VITE_SUPABASE_URL и
          VITE_SUPABASE_ANON_KEY, чтобы включить вход и соцфункции.
        </div>
      </div>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    const { error } = await signInWithEmail(email)
    if (error) {
      setError(error)
    } else {
      setSent(true)
    }
  }

  return (
    <div className="page">
      <div className="row" style={{ marginBottom: 10 }}>
        <button className="icon-btn" onClick={() => navigate(-1)}>
          ←
        </button>
      </div>
      <h1 className="page-title">Вход</h1>
      <p className="page-subtitle">
        Мы пришлём ссылку для входа на почту — пароль не нужен
      </p>

      {sent ? (
        <div className="card">
          <p>
            Письмо отправлено на <b>{email}</b>. Откройте ссылку из письма, чтобы
            войти.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <div className="form-field">
            <label>Email</label>
            <input
              type="email"
              required
              className="text-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </div>
          {error && <p className="error-text">{error}</p>}
          <button className="btn btn-gold btn-block" type="submit" disabled={loading}>
            {loading ? 'Отправляем…' : 'Получить ссылку для входа'}
          </button>
        </form>
      )}
    </div>
  )
}
