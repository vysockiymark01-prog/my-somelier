import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AuthGate } from '../components/AuthGate'
import { useAuth } from '../store/auth'
import { listParties, type PartyWithGuests } from '../lib/social'

function formatDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleString('ru-RU', {
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function PartiesInner() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [parties, setParties] = useState<PartyWithGuests[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    listParties(user.id)
      .then(setParties)
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false))
  }, [user?.id])

  return (
    <div className="page">
      <div className="row-between">
        <h1 className="page-title">Вечеринки</h1>
        <button className="btn btn-gold" onClick={() => navigate('/parties/new')}>
          + Создать
        </button>
      </div>
      <p className="page-subtitle">Зовите друзей на дегустации и вечеринки</p>

      {error && <p className="error-text">{error}</p>}

      {loading ? (
        <p className="page-subtitle">Загрузка…</p>
      ) : parties.length === 0 ? (
        <div className="empty-state">
          <span className="emoji">🎉</span>
          <p>Пока нет вечеринок. Создайте первую!</p>
        </div>
      ) : (
        parties.map((p) => {
          const myRsvp = p.guests.find((g) => g.guest_id === user?.id)
          return (
            <div className="card" key={p.id} onClick={() => navigate(`/parties/${p.id}`)}>
              <div className="row-between">
                <h2 style={{ fontSize: 16, margin: 0 }}>{p.title}</h2>
                {p.host_id === user?.id ? (
                  <span className="badge badge-success">Вы хост</span>
                ) : myRsvp ? (
                  <span className="badge badge-pending">
                    {myRsvp.status === 'going'
                      ? 'Иду'
                      : myRsvp.status === 'maybe'
                        ? 'Возможно'
                        : myRsvp.status === 'declined'
                          ? 'Не иду'
                          : 'Приглашение'}
                  </span>
                ) : null}
              </div>
              <p className="helper-text">
                {formatDate(p.starts_at)}
                {p.location ? ` · ${p.location}` : ''}
              </p>
              <p className="helper-text" style={{ margin: 0 }}>
                Гостей: {p.guests.length}
              </p>
            </div>
          )
        })
      )}
    </div>
  )
}

export function PartiesPage() {
  return (
    <AuthGate>
      <PartiesInner />
    </AuthGate>
  )
}
