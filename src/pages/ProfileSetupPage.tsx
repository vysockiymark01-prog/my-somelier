import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../store/auth'

export function ProfileSetupPage() {
  const { ensureProfile, user } = useAuth()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  if (!user) {
    return (
      <div className="page">
        <div className="row" style={{ marginBottom: 10 }}>
          <button className="icon-btn" onClick={() => navigate(-1)}>
            ←
          </button>
        </div>
        <p className="page-subtitle">Сначала войдите в аккаунт.</p>
      </div>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!/^[a-z0-9_]{3,20}$/.test(username.trim().toLowerCase())) {
      setError('Имя пользователя: латиница, цифры, подчёркивание, 3–20 символов')
      return
    }
    setSaving(true)
    const { error } = await ensureProfile(username, displayName)
    setSaving(false)
    if (error) {
      setError(error)
    } else {
      navigate('/friends')
    }
  }

  return (
    <div className="page">
      <div className="row" style={{ marginBottom: 10 }}>
        <button className="icon-btn" onClick={() => navigate(-1)}>
          ←
        </button>
      </div>
      <h1 className="page-title">Создайте профиль</h1>
      <p className="page-subtitle">Друзья будут находить вас по имени пользователя</p>

      <form onSubmit={handleSubmit}>
        <div className="form-field">
          <label>Имя пользователя</label>
          <input
            className="text-input"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="например, mark_bar"
          />
        </div>
        <div className="form-field">
          <label>Отображаемое имя</label>
          <input
            className="text-input"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Марк"
          />
        </div>
        {error && <p className="error-text">{error}</p>}
        <button className="btn btn-gold btn-block" type="submit" disabled={saving}>
          {saving ? 'Сохраняем…' : 'Сохранить'}
        </button>
      </form>
    </div>
  )
}
