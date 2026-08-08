import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { RECIPES, getRecipeById } from '../data/recipes'
import { loadFavorites, saveFavorites } from '../lib/favorites'

// Перемешиваем один раз при заходе на страницу, чтобы порядок карточек
// не совпадал с порядком каталога и ощущался как «случайная лента».
function shuffled<T>(arr: T[]): T[] {
  const copy = [...arr]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

export function SwipePage() {
  const navigate = useNavigate()
  const [deck] = useState(() => shuffled(RECIPES))
  const [index, setIndex] = useState(0)
  const [favorites, setFavorites] = useState<Set<string>>(() => loadFavorites())
  const [lastAction, setLastAction] = useState<'like' | 'skip' | null>(null)

  useEffect(() => {
    saveFavorites(favorites)
  }, [favorites])

  const current = deck[index]
  const favoriteRecipes = useMemo(
    () => Array.from(favorites).map(getRecipeById).filter(Boolean),
    [favorites]
  )

  const handleDecision = (like: boolean) => {
    if (!current) return
    setLastAction(like ? 'like' : 'skip')
    if (like) {
      setFavorites((prev) => new Set(prev).add(current.id))
    }
    setTimeout(() => {
      setLastAction(null)
      setIndex((i) => i + 1)
    }, 160)
  }

  const restart = () => {
    setIndex(0)
  }

  return (
    <div className="page">
      <div className="row" style={{ marginBottom: 10 }}>
        <button className="icon-btn" onClick={() => navigate(-1)}>
          ←
        </button>
      </div>

      <h1 className="page-title">❤️ Нравится / Пропустить</h1>
      <p className="page-subtitle">Пролистайте каталог и отметьте, что вам по вкусу</p>

      {current ? (
        <div className={'card result-card' + (lastAction ? ' rolling' : '')}>
          <div style={{ fontSize: 64, textAlign: 'center' }}>{current.emoji}</div>
          <h2 style={{ textAlign: 'center', margin: '4px 0 2px' }}>{current.name}</h2>
          <p className="page-subtitle" style={{ textAlign: 'center', marginBottom: 6 }}>
            {current.category} · {current.abv}
          </p>
          <p className="helper-text" style={{ textAlign: 'center', marginBottom: 16 }}>
            {current.ingredients.map((i) => i.name).join(', ')}
          </p>

          <div className="row" style={{ gap: 12 }}>
            <button
              className="btn btn-outline"
              style={{ flex: 1 }}
              onClick={() => handleDecision(false)}
            >
              👎 Пропустить
            </button>
            <button
              className="btn btn-gold"
              style={{ flex: 1 }}
              onClick={() => handleDecision(true)}
            >
              ❤️ Нравится
            </button>
          </div>
        </div>
      ) : (
        <div className="empty-state">
          <span className="emoji">🎉</span>
          <p>Вы просмотрели весь каталог!</p>
          <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={restart}>
            Пройти ещё раз
          </button>
        </div>
      )}

      {favoriteRecipes.length > 0 && (
        <>
          <h2 style={{ fontSize: 16, margin: '20px 0 10px' }}>
            Понравилось ({favoriteRecipes.length})
          </h2>
          <div className="recipe-grid">
            {favoriteRecipes.map((r) => (
              <div key={r!.id} className="recipe-card" onClick={() => navigate(`/recipe/${r!.id}`)}>
                <span className="emoji">{r!.emoji}</span>
                <span className="name">{r!.name}</span>
                <span className="meta">
                  {r!.glass} · {r!.time}
                </span>
                <span className="tag">{r!.abv}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
