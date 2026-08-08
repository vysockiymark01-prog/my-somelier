import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { computeBadges } from '../lib/achievements'
import { countDistinctMade, loadHistory } from '../lib/history'
import { getRecipeById } from '../data/recipes'
import { useAuth } from '../store/auth'
import { isSupabaseConfigured } from '../lib/supabase'
import { listParties } from '../lib/social'

export function AchievementsPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [hostedCount, setHostedCount] = useState(0)

  useEffect(() => {
    if (!isSupabaseConfigured || !user) return
    listParties(user.id)
      .then((parties) => setHostedCount(parties.filter((p) => p.host_id === user.id).length))
      .catch(() => setHostedCount(0))
  }, [user])

  const badges = useMemo(() => computeBadges(hostedCount), [hostedCount])
  const earned = badges.filter((b) => b.earned)
  const locked = badges.filter((b) => !b.earned)
  const history = useMemo(() => loadHistory().slice().reverse(), [])
  const madeCount = countDistinctMade()

  return (
    <div className="page">
      <div className="row" style={{ marginBottom: 10 }}>
        <button className="icon-btn" onClick={() => navigate(-1)}>
          ←
        </button>
      </div>

      <h1 className="page-title">🏆 Достижения</h1>
      <p className="page-subtitle">
        Приготовлено разных напитков: {madeCount}. Отмечайте на странице рецепта, что приготовили —
        и получайте значки.
      </p>

      <h2 style={{ fontSize: 16, margin: '18px 0 10px' }}>Получено ({earned.length})</h2>
      {earned.length === 0 ? (
        <p className="helper-text">Пока пусто — приготовьте первый коктейль и отметьте это на странице рецепта.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {earned.map((b) => (
            <div key={b.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 28 }}>{b.emoji}</span>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{b.title}</div>
                <div className="helper-text" style={{ margin: 0 }}>
                  {b.description}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <h2 style={{ fontSize: 16, margin: '18px 0 10px' }}>Ещё не получено ({locked.length})</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, opacity: 0.5 }}>
        {locked.map((b) => (
          <div key={b.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 28 }}>🔒</span>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{b.title}</div>
              <div className="helper-text" style={{ margin: 0 }}>
                {b.description}
              </div>
            </div>
          </div>
        ))}
      </div>

      {history.length > 0 && (
        <>
          <h2 style={{ fontSize: 16, margin: '18px 0 10px' }}>История</h2>
          <div className="card">
            {history.slice(0, 30).map((entry, i) => {
              const recipe = getRecipeById(entry.recipeId)
              return (
                <div
                  key={i}
                  className="row"
                  style={{ justifyContent: 'space-between', padding: '6px 0' }}
                >
                  <span>
                    {recipe?.emoji ?? '🍹'} {recipe?.name ?? 'Свой рецепт'}
                  </span>
                  <span className="helper-text" style={{ margin: 0 }}>
                    {new Date(entry.madeAt).toLocaleDateString('ru-RU')}
                  </span>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
