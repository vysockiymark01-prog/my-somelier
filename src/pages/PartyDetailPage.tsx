import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AuthGate } from '../components/AuthGate'
import { useAuth } from '../store/auth'
import {
  inviteToParty,
  listFriendships,
  listParties,
  respondPartyInvite,
  type FriendshipWithProfile,
  type PartyWithGuests,
} from '../lib/social'

function formatDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleString('ru-RU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const STATUS_LABEL: Record<string, string> = {
  invited: 'Приглашён',
  going: 'Идёт',
  maybe: 'Возможно',
  declined: 'Не идёт',
}

function PartyDetailInner() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [party, setParty] = useState<PartyWithGuests | null>(null)
  const [friendships, setFriendships] = useState<FriendshipWithProfile[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const load = async () => {
    if (!user || !id) return
    try {
      const [parties, fr] = await Promise.all([
        listParties(user.id),
        listFriendships(user.id),
      ])
      setParty(parties.find((p) => p.id === id) ?? null)
      setFriendships(fr.filter((f) => f.status === 'accepted'))
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, id])

  if (loading) {
    return (
      <div className="page">
        <p className="page-subtitle">Загрузка…</p>
      </div>
    )
  }

  if (!party) {
    return (
      <div className="page">
        <div className="empty-state">
          <span className="emoji">🥲</span>
          <p>Вечеринка не найдена</p>
        </div>
      </div>
    )
  }

  const isHost = party.host_id === user?.id
  const myRsvp = party.guests.find((g) => g.guest_id === user?.id)
  const invitedIds = new Set(party.guests.map((g) => g.guest_id))
  const invitableFriends = friendships
    .map((f) => (f.requester_id === user?.id ? f.addressee : f.requester))
    .filter((p) => !invitedIds.has(p.id))

  const handleInvite = async (guestId: string) => {
    try {
      await inviteToParty(party.id, guestId)
      await load()
    } catch (e) {
      setError((e as Error).message)
    }
  }

  const handleRsvp = async (status: 'going' | 'maybe' | 'declined') => {
    if (!myRsvp) return
    try {
      await respondPartyInvite(myRsvp.id, status)
      await load()
    } catch (e) {
      setError((e as Error).message)
    }
  }

  return (
    <div className="page">
      <div className="row" style={{ marginBottom: 10 }}>
        <button className="icon-btn" onClick={() => navigate(-1)}>
          ←
        </button>
      </div>

      <h1 className="page-title">{party.title}</h1>
      <p className="page-subtitle">{formatDate(party.starts_at)}</p>

      <div className="card">
        {party.description && <p style={{ marginTop: 0 }}>{party.description}</p>}
        {party.location && <p className="helper-text">📍 {party.location}</p>}
        <p className="helper-text" style={{ margin: 0 }}>
          Хост: {party.host.display_name ?? party.host.username}
        </p>
      </div>

      {error && <p className="error-text">{error}</p>}

      {!isHost && myRsvp && (
        <div className="card">
          <h2 style={{ fontSize: 15, margin: '0 0 10px' }}>Вы идёте?</h2>
          <div className="row">
            <button
              className={'btn ' + (myRsvp.status === 'going' ? 'btn-gold' : 'btn-outline')}
              onClick={() => handleRsvp('going')}
            >
              Иду
            </button>
            <button
              className={'btn ' + (myRsvp.status === 'maybe' ? 'btn-gold' : 'btn-outline')}
              onClick={() => handleRsvp('maybe')}
            >
              Возможно
            </button>
            <button
              className={'btn ' + (myRsvp.status === 'declined' ? 'btn-gold' : 'btn-outline')}
              onClick={() => handleRsvp('declined')}
            >
              Не иду
            </button>
          </div>
        </div>
      )}

      <div className="card">
        <h2 style={{ fontSize: 15, margin: '0 0 8px' }}>Гости ({party.guests.length})</h2>
        {party.guests.length === 0 ? (
          <p className="helper-text">Пока никого не пригласили</p>
        ) : (
          party.guests.map((g) => (
            <div className="list-row" key={g.id}>
              <div className="row">
                <div className="avatar">{g.guest.avatar_emoji ?? '🍸'}</div>
                <div>{g.guest.display_name ?? g.guest.username}</div>
              </div>
              <span
                className={'badge ' + (g.status === 'going' ? 'badge-success' : 'badge-pending')}
              >
                {STATUS_LABEL[g.status]}
              </span>
            </div>
          ))
        )}
      </div>

      {isHost && (
        <div className="card">
          <h2 style={{ fontSize: 15, margin: '0 0 8px' }}>Пригласить друзей</h2>
          {invitableFriends.length === 0 ? (
            <p className="helper-text">
              Все друзья уже приглашены, либо у вас пока нет друзей.
            </p>
          ) : (
            invitableFriends.map((f) => (
              <div className="list-row" key={f.id}>
                <div className="row">
                  <div className="avatar">{f.avatar_emoji ?? '🍸'}</div>
                  <div>{f.display_name ?? f.username}</div>
                </div>
                <button className="btn btn-gold" onClick={() => handleInvite(f.id)}>
                  Позвать
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}

export function PartyDetailPage() {
  return (
    <AuthGate>
      <PartyDetailInner />
    </AuthGate>
  )
}
