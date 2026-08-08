import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AuthGate } from '../components/AuthGate'
import { useAuth } from '../store/auth'
import {
  inviteToParty,
  listFriendships,
  listParties,
  listPartyVotes,
  respondPartyInvite,
  unvoteForRecipe,
  voteForRecipe,
  type FriendshipWithProfile,
  type PartyWithGuests,
} from '../lib/social'
import type { PartyMenuVoteRow } from '../lib/supabase'
import { RECIPES, getRecipeById } from '../data/recipes'

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
  const [votes, setVotes] = useState<PartyMenuVoteRow[]>([])
  const [menuQuery, setMenuQuery] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const load = async () => {
    if (!user || !id) return
    try {
      const [parties, fr, partyVotes] = await Promise.all([
        listParties(user.id),
        listFriendships(user.id),
        listPartyVotes(id),
      ])
      setParty(parties.find((p) => p.id === id) ?? null)
      setFriendships(fr.filter((f) => f.status === 'accepted'))
      setVotes(partyVotes)
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

  // Может голосовать хост или любой приглашённый гость (независимо от RSVP).
  const canVote = isHost || Boolean(myRsvp)
  const myVotedRecipeIds = new Set(
    votes.filter((v) => v.voter_id === user?.id).map((v) => v.recipe_id)
  )
  const voteCounts = new Map<string, number>()
  votes.forEach((v) => voteCounts.set(v.recipe_id, (voteCounts.get(v.recipe_id) ?? 0) + 1))
  const topPicks = [...voteCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([recipeId, count]) => ({ recipe: getRecipeById(recipeId), count }))
    .filter((x) => x.recipe)

  const filteredCatalog = RECIPES.filter((r) =>
    r.name.toLowerCase().includes(menuQuery.trim().toLowerCase())
  )

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

  const handleToggleVote = async (recipeId: string) => {
    if (!user) return
    try {
      if (myVotedRecipeIds.has(recipeId)) {
        await unvoteForRecipe(party.id, user.id, recipeId)
      } else {
        await voteForRecipe(party.id, user.id, recipeId)
      }
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

      {canVote && (
        <div className="card">
          <h2 style={{ fontSize: 15, margin: '0 0 4px' }}>🍹 Меню: что хотят гости</h2>
          <p className="helper-text" style={{ marginTop: 0 }}>
            Отметьте напитки, которые хотели бы попробовать на вечеринке — хост увидит,
            что пользуется популярностью.
          </p>

          {topPicks.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <div className="helper-text" style={{ marginBottom: 6 }}>
                Популярное среди гостей:
              </div>
              {topPicks.slice(0, 5).map(({ recipe, count }) => (
                <div className="list-row" key={recipe!.id}>
                  <div className="row">
                    <span style={{ fontSize: 20 }}>{recipe!.emoji}</span>
                    <div>{recipe!.name}</div>
                  </div>
                  <span className="badge badge-success">
                    {count} {count === 1 ? 'голос' : count < 5 ? 'голоса' : 'голосов'}
                  </span>
                </div>
              ))}
            </div>
          )}

          <input
            className="search-input"
            placeholder="Найти напиток…"
            value={menuQuery}
            onChange={(e) => setMenuQuery(e.target.value)}
          />

          <div style={{ maxHeight: 320, overflowY: 'auto', marginTop: 8 }}>
            {filteredCatalog.map((r) => {
              const voted = myVotedRecipeIds.has(r.id)
              const count = voteCounts.get(r.id) ?? 0
              return (
                <div className="list-row" key={r.id}>
                  <div className="row">
                    <span style={{ fontSize: 20 }}>{r.emoji}</span>
                    <div>
                      <div>{r.name}</div>
                      <div className="helper-text" style={{ margin: 0 }}>
                        {r.glass}
                        {count > 0 ? ` · ${count} ${count === 1 ? 'голос' : 'голосов'}` : ''}
                      </div>
                    </div>
                  </div>
                  <button
                    className={'btn ' + (voted ? 'btn-gold' : 'btn-outline')}
                    onClick={() => handleToggleVote(r.id)}
                  >
                    {voted ? '✓ Хочу' : 'Хочу'}
                  </button>
                </div>
              )
            })}
            {filteredCatalog.length === 0 && (
              <p className="helper-text">Ничего не найдено</p>
            )}
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
