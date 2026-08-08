import { useEffect, useState } from 'react'
import { AuthGate } from '../components/AuthGate'
import { useAuth } from '../store/auth'
import {
  listFriendships,
  removeFriendship,
  respondFriendRequest,
  searchProfiles,
  sendFriendRequest,
  type FriendshipWithProfile,
} from '../lib/social'
import type { Profile } from '../lib/supabase'

function FriendsInner() {
  const { user, profile } = useAuth()
  const [friendships, setFriendships] = useState<FriendshipWithProfile[]>([])
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    if (!user) return
    try {
      const data = await listFriendships(user.id)
      setFriendships(data)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  const handleSearch = async (q: string) => {
    setQuery(q)
    if (!user || q.trim().length < 2) {
      setResults([])
      return
    }
    try {
      const found = await searchProfiles(q, user.id)
      setResults(found)
    } catch (e) {
      setError((e as Error).message)
    }
  }

  const handleAdd = async (addresseeId: string) => {
    if (!user) return
    try {
      await sendFriendRequest(user.id, addresseeId)
      setResults((r) => r.filter((p) => p.id !== addresseeId))
      await load()
    } catch (e) {
      setError((e as Error).message)
    }
  }

  const incoming = friendships.filter(
    (f) => f.status === 'pending' && f.addressee_id === user?.id
  )
  const outgoing = friendships.filter(
    (f) => f.status === 'pending' && f.requester_id === user?.id
  )
  const accepted = friendships.filter((f) => f.status === 'accepted')

  const otherOf = (f: FriendshipWithProfile) =>
    f.requester_id === user?.id ? f.addressee : f.requester

  return (
    <div className="page">
      <h1 className="page-title">Друзья</h1>
      <p className="page-subtitle">Вы вошли как @{profile?.username}</p>

      <input
        className="search-input"
        placeholder="Найти друга по имени пользователя…"
        value={query}
        onChange={(e) => handleSearch(e.target.value)}
      />

      {error && <p className="error-text">{error}</p>}

      {results.length > 0 && (
        <div className="card" style={{ marginTop: 14 }}>
          {results.map((p) => (
            <div className="list-row" key={p.id}>
              <div className="row">
                <div className="avatar">{p.avatar_emoji ?? '🍸'}</div>
                <div>
                  <div>{p.display_name ?? p.username}</div>
                  <div className="helper-text" style={{ margin: 0 }}>
                    @{p.username}
                  </div>
                </div>
              </div>
              <button className="btn btn-gold" onClick={() => handleAdd(p.id)}>
                Добавить
              </button>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <p className="page-subtitle">Загрузка…</p>
      ) : (
        <>
          {incoming.length > 0 && (
            <div className="card">
              <h2 style={{ fontSize: 15, margin: '0 0 8px' }}>Заявки в друзья</h2>
              {incoming.map((f) => (
                <div className="list-row" key={f.id}>
                  <div className="row">
                    <div className="avatar">{otherOf(f).avatar_emoji ?? '🍸'}</div>
                    <div>@{otherOf(f).username}</div>
                  </div>
                  <div className="row">
                    <button
                      className="btn btn-gold"
                      onClick={() => respondFriendRequest(f.id, 'accepted').then(load)}
                    >
                      Принять
                    </button>
                    <button
                      className="btn btn-outline"
                      onClick={() => respondFriendRequest(f.id, 'declined').then(load)}
                    >
                      Отклонить
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="card">
            <h2 style={{ fontSize: 15, margin: '0 0 8px' }}>
              Мои друзья ({accepted.length})
            </h2>
            {accepted.length === 0 ? (
              <p className="helper-text">Пока никого — найдите друзей по имени выше.</p>
            ) : (
              accepted.map((f) => (
                <div className="list-row" key={f.id}>
                  <div className="row">
                    <div className="avatar">{otherOf(f).avatar_emoji ?? '🍸'}</div>
                    <div>
                      <div>{otherOf(f).display_name ?? otherOf(f).username}</div>
                      <div className="helper-text" style={{ margin: 0 }}>
                        @{otherOf(f).username}
                      </div>
                    </div>
                  </div>
                  <button
                    className="btn btn-outline"
                    onClick={() => removeFriendship(f.id).then(load)}
                  >
                    Удалить
                  </button>
                </div>
              ))
            )}
          </div>

          {outgoing.length > 0 && (
            <div className="card">
              <h2 style={{ fontSize: 15, margin: '0 0 8px' }}>Отправленные заявки</h2>
              {outgoing.map((f) => (
                <div className="list-row" key={f.id}>
                  <div className="row">
                    <div className="avatar">{otherOf(f).avatar_emoji ?? '🍸'}</div>
                    <div>@{otherOf(f).username}</div>
                  </div>
                  <span className="badge badge-pending">Ожидание</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

export function FriendsPage() {
  return (
    <AuthGate>
      <FriendsInner />
    </AuthGate>
  )
}
