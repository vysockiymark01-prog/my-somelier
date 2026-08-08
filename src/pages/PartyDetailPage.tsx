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
  listBillItems,
  createBillItem,
  deleteBillItem,
  listBillShares,
  addBillShare,
  removeBillShare,
  removeGuestFromParty,
  listMessages,
  sendMessage,
  subscribeToMessages,
  type FriendshipWithProfile,
  type PartyWithGuests,
} from '../lib/social'
import type {
  PartyMenuVoteRow,
  PartyBillItemRow,
  PartyBillShareRow,
  PartyMessageRow,
  Profile,
} from '../lib/supabase'
import { computeBalances, settleUp } from '../lib/billSplit'
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
  const [billItems, setBillItems] = useState<PartyBillItemRow[]>([])
  const [billShares, setBillShares] = useState<PartyBillShareRow[]>([])
  const [newItemTitle, setNewItemTitle] = useState('')
  const [newItemPrice, setNewItemPrice] = useState('')
  const [newItemPaidBy, setNewItemPaidBy] = useState('')
  const [messages, setMessages] = useState<PartyMessageRow[]>([])
  const [chatInput, setChatInput] = useState('')
  const [sendingMessage, setSendingMessage] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const load = async () => {
    if (!user || !id) return
    try {
      const [parties, fr, partyVotes, items, shares, msgs] = await Promise.all([
        listParties(user.id),
        listFriendships(user.id),
        listPartyVotes(id),
        listBillItems(id),
        listBillShares(id),
        listMessages(id),
      ])
      setParty(parties.find((p) => p.id === id) ?? null)
      setFriendships(fr.filter((f) => f.status === 'accepted'))
      setVotes(partyVotes)
      setBillItems(items)
      setBillShares(shares)
      setMessages(msgs)
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

  useEffect(() => {
    if (!id) return
    const unsubscribe = subscribeToMessages(id, (row) => {
      setMessages((prev) => (prev.some((m) => m.id === row.id) ? prev : [...prev, row]))
    })
    return unsubscribe
  }, [id])

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

  // Участники счёта — хост плюс все гости, независимо от статуса RSVP:
  // до вечеринки бывает не совсем понятно, кто точно придёт, а траты
  // уже могут вноситься заранее.
  const participants: Profile[] = [
    party.host,
    ...party.guests.map((g) => g.guest).filter((p) => p.id !== party.host_id),
  ]
  const participantName = (userId: string) => {
    const p = participants.find((p) => p.id === userId)
    return p ? p.display_name ?? p.username : 'кто-то'
  }
  const balances = computeBalances(billItems, billShares)
  const settlements = settleUp(balances)
  const currency = party.currency || '₽'

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

  const handleAddBillItem = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    const price = parseFloat(newItemPrice.replace(',', '.'))
    if (!newItemTitle.trim() || !Number.isFinite(price) || price < 0) {
      setError('Укажите название и корректную цену')
      return
    }
    try {
      await createBillItem({
        partyId: party.id,
        title: newItemTitle,
        price,
        paidBy: newItemPaidBy || user.id,
        createdBy: user.id,
      })
      setNewItemTitle('')
      setNewItemPrice('')
      await load()
    } catch (e) {
      setError((e as Error).message)
    }
  }

  const handleDeleteBillItem = async (itemId: string) => {
    try {
      await deleteBillItem(itemId)
      await load()
    } catch (e) {
      setError((e as Error).message)
    }
  }

  const handleToggleShare = async (itemId: string, sharing: boolean) => {
    if (!user) return
    try {
      if (sharing) {
        await removeBillShare(itemId, user.id)
      } else {
        await addBillShare(itemId, party.id, user.id)
      }
      await load()
    } catch (e) {
      setError((e as Error).message)
    }
  }

  const handleRemoveGuest = async (guestRowId: string) => {
    try {
      await removeGuestFromParty(guestRowId)
      await load()
    } catch (e) {
      setError((e as Error).message)
    }
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !chatInput.trim()) return
    setSendingMessage(true)
    try {
      await sendMessage(party.id, user.id, chatInput)
      setChatInput('')
      const msgs = await listMessages(party.id)
      setMessages(msgs)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSendingMessage(false)
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

      {canVote && (
        <div className="card">
          <h2 style={{ fontSize: 15, margin: '0 0 4px' }}>💰 Общий счёт</h2>
          <p className="helper-text" style={{ marginTop: 0, marginBottom: 12 }}>
            Впишите, что почём покупали, отметьте, кто это брал — и внизу увидите, кому сколько
            переводить.
          </p>

          <form onSubmit={handleAddBillItem} className="row" style={{ gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
            <input
              className="text-input"
              style={{ flex: 2, minWidth: 120 }}
              placeholder="Что купили"
              value={newItemTitle}
              onChange={(e) => setNewItemTitle(e.target.value)}
            />
            <input
              className="text-input"
              style={{ flex: 1, minWidth: 90 }}
              placeholder={`Цена ${currency}`}
              inputMode="decimal"
              value={newItemPrice}
              onChange={(e) => setNewItemPrice(e.target.value)}
            />
            <select
              className="text-input"
              style={{ flex: 1, minWidth: 130 }}
              value={newItemPaidBy || user?.id || ''}
              onChange={(e) => setNewItemPaidBy(e.target.value)}
            >
              {participants.map((p) => (
                <option key={p.id} value={p.id}>
                  Платил: {p.display_name ?? p.username}
                </option>
              ))}
            </select>
            <button className="btn btn-gold" type="submit" style={{ flexShrink: 0 }}>
              Добавить
            </button>
          </form>

          {billItems.length === 0 ? (
            <p className="helper-text">Пока ничего не добавили</p>
          ) : (
            <div style={{ marginBottom: 14 }}>
              {billItems.map((item) => {
                const itemShares = billShares.filter((s) => s.item_id === item.id)
                const iShare = itemShares.some((s) => s.user_id === user?.id)
                const canDelete = item.created_by === user?.id || isHost
                return (
                  <div key={item.id} className="list-row" style={{ alignItems: 'flex-start' }}>
                    <div>
                      <div>
                        {item.title} — {item.price.toFixed(0)} {currency}
                      </div>
                      <div className="helper-text" style={{ margin: 0 }}>
                        Платил: {participantName(item.paid_by)}
                        {itemShares.length > 0
                          ? ` · берут: ${itemShares.map((s) => participantName(s.user_id)).join(', ')}`
                          : ' · пока никто не отметил'}
                      </div>
                    </div>
                    <div className="row" style={{ gap: 6 }}>
                      <button
                        className={'btn ' + (iShare ? 'btn-gold' : 'btn-outline')}
                        onClick={() => handleToggleShare(item.id, iShare)}
                      >
                        {iShare ? '✓ Я брал(а)' : 'Я брал(а)'}
                      </button>
                      {canDelete && (
                        <button className="icon-btn" onClick={() => handleDeleteBillItem(item.id)}>
                          🗑
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {settlements.length > 0 && (
            <div>
              <h3 style={{ fontSize: 14, margin: '0 0 8px', color: 'var(--text-dim)' }}>
                Кто кому переводит
              </h3>
              {settlements.map((s, i) => (
                <div className="list-row" key={i}>
                  <div>
                    {participantName(s.fromUserId)} → {participantName(s.toUserId)}
                  </div>
                  <span className="tag">{s.amount.toFixed(0)} {currency}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {canVote && (
        <div className="card">
          <h2 style={{ fontSize: 15, margin: '0 0 8px' }}>💬 Чат вечеринки</h2>
          <div
            style={{
              maxHeight: 280,
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              marginBottom: 12,
            }}
          >
            {messages.length === 0 ? (
              <p className="helper-text" style={{ margin: 0 }}>
                Пока никто не написал. Договоритесь, во сколько встречаемся и кто что берёт.
              </p>
            ) : (
              messages.map((m) => {
                const sender = participants.find((p) => p.id === m.sender_id)
                const mine = m.sender_id === user?.id
                return (
                  <div
                    key={m.id}
                    style={{
                      alignSelf: mine ? 'flex-end' : 'flex-start',
                      maxWidth: '80%',
                      background: mine ? 'var(--gold-soft)' : 'var(--surface-2, rgba(255,255,255,0.06))',
                      color: mine ? '#1a1a1a' : 'inherit',
                      borderRadius: 12,
                      padding: '6px 10px',
                    }}
                  >
                    {!mine && (
                      <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 2 }}>
                        {sender ? sender.display_name ?? sender.username : 'Гость'}
                      </div>
                    )}
                    <div style={{ fontSize: 14, whiteSpace: 'pre-wrap' }}>{m.body}</div>
                  </div>
                )
              })
            )}
          </div>
          <form onSubmit={handleSendMessage} className="row" style={{ gap: 8 }}>
            <input
              className="text-input"
              style={{ flex: 1 }}
              placeholder="Написать в чат…"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
            />
            <button className="btn btn-gold" type="submit" disabled={sendingMessage || !chatInput.trim()}>
              Отправить
            </button>
          </form>
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
              <div className="row" style={{ gap: 8 }}>
                <span
                  className={'badge ' + (g.status === 'going' ? 'badge-success' : 'badge-pending')}
                >
                  {STATUS_LABEL[g.status]}
                </span>
                {isHost && (
                  <button
                    className="icon-btn"
                    onClick={() => handleRemoveGuest(g.id)}
                    aria-label="Убрать гостя"
                    title="Убрать гостя"
                  >
                    ✕
                  </button>
                )}
              </div>
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
