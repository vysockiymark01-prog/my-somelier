import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AuthGate } from '../components/AuthGate'
import { useAuth } from '../store/auth'
import { createParty } from '../lib/social'

function NewPartyInner() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState('')
  const [startsAt, setStartsAt] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    setError(null)
    if (!title.trim() || !startsAt) {
      setError('Укажите название и дату')
      return
    }
    setSaving(true)
    try {
      const party = await createParty({
        hostId: user.id,
        title,
        description,
        location,
        startsAt: new Date(startsAt).toISOString(),
      })
      navigate(`/parties/${party.id}`)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="page">
      <div className="row" style={{ marginBottom: 10 }}>
        <button className="icon-btn" onClick={() => navigate(-1)}>
          ←
        </button>
      </div>
      <h1 className="page-title">Новая вечеринка</h1>

      <form onSubmit={handleSubmit}>
        <div className="form-field">
          <label>Название</label>
          <input
            className="text-input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Дегустация коктейлей"
          />
        </div>
        <div className="form-field">
          <label>Описание</label>
          <input
            className="text-input"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Приносите свой любимый ром"
          />
        </div>
        <div className="form-field">
          <label>Место</label>
          <input
            className="text-input"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="У меня дома"
          />
        </div>
        <div className="form-field">
          <label>Дата и время</label>
          <input
            type="datetime-local"
            className="text-input"
            value={startsAt}
            onChange={(e) => setStartsAt(e.target.value)}
          />
        </div>
        {error && <p className="error-text">{error}</p>}
        <button className="btn btn-gold btn-block" type="submit" disabled={saving}>
          {saving ? 'Создаём…' : 'Создать вечеринку'}
        </button>
      </form>
    </div>
  )
}

export function NewPartyPage() {
  return (
    <AuthGate>
      <NewPartyInner />
    </AuthGate>
  )
}
