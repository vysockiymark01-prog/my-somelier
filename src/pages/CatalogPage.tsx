import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CATEGORIES, RECIPES, type Category } from '../data/recipes'
import { RecipeCard } from '../components/RecipeCard'
import { useAuth } from '../store/auth'
import { isSupabaseConfigured, type CustomRecipeRow, type PublicCustomRecipeRow } from '../lib/supabase'
import { listMyRecipes, listCommunityRecipes } from '../lib/customRecipes'
import { getSeasonalSuggestion } from '../lib/seasonal'

const HUB_ITEMS = [
  { to: '/random', icon: '🎲', label: 'Придумать' },
  { to: '/bar', icon: '🧊', label: 'Что есть дома' },
  { to: '/swipe', icon: '❤️', label: 'Нравится' },
  { to: '/quiz', icon: '🧠', label: 'Квиз' },
  { to: '/personality', icon: '🧬', label: 'Какой ты коктейль' },
  { to: '/achievements', icon: '🏆', label: 'Достижения' },
]

export function CatalogPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<Category | 'Всё'>('Всё')
  const [myRecipes, setMyRecipes] = useState<CustomRecipeRow[]>([])
  const [communityRecipes, setCommunityRecipes] = useState<PublicCustomRecipeRow[]>([])
  const seasonal = useMemo(() => getSeasonalSuggestion(), [])

  useEffect(() => {
    if (!isSupabaseConfigured || !user) {
      setMyRecipes([])
      setCommunityRecipes([])
      return
    }
    listMyRecipes(user.id)
      .then(setMyRecipes)
      .catch(() => setMyRecipes([]))
    listCommunityRecipes(user.id)
      .then(setCommunityRecipes)
      .catch(() => setCommunityRecipes([]))
  }, [user])

  const filteredStatic = useMemo(() => {
    return RECIPES.filter((r) => {
      const matchesCategory = category === 'Всё' || r.category === category
      const matchesQuery =
        !query.trim() || r.name.toLowerCase().includes(query.trim().toLowerCase())
      return matchesCategory && matchesQuery
    })
  }, [query, category])

  const filteredMine = useMemo(() => {
    return myRecipes.filter((r) => {
      const matchesCategory = category === 'Всё' || r.category === category
      const matchesQuery = !query.trim() || r.name.toLowerCase().includes(query.trim().toLowerCase())
      return matchesCategory && matchesQuery
    })
  }, [myRecipes, query, category])

  const filteredCommunity = useMemo(() => {
    return communityRecipes.filter((r) => {
      const matchesCategory = category === 'Всё' || r.category === category
      const matchesQuery = !query.trim() || r.name.toLowerCase().includes(query.trim().toLowerCase())
      return matchesCategory && matchesQuery
    })
  }, [communityRecipes, query, category])

  const totalEmpty =
    filteredStatic.length === 0 && filteredMine.length === 0 && filteredCommunity.length === 0

  return (
    <div className="page">
      <h1 className="page-title">Рецепты</h1>
      <p className="page-subtitle">Смешивайте и слушайте голос бариста</p>

      <div
        className="card"
        style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}
        onClick={() => navigate('/random', { state: { category: seasonal.category, mood: seasonal.mood } })}
      >
        <span style={{ fontSize: 30 }}>{seasonal.emoji}</span>
        <div>
          <div style={{ fontWeight: 600, fontSize: 14 }}>{seasonal.title}</div>
          <div className="helper-text" style={{ margin: 0 }}>
            {seasonal.subtitle}
          </div>
        </div>
      </div>

      <div className="chip-row" style={{ marginBottom: 14 }}>
        {HUB_ITEMS.map((item) => (
          <div key={item.to} className="chip" onClick={() => navigate(item.to)}>
            {item.icon} {item.label}
          </div>
        ))}
      </div>

      <input
        className="search-input"
        placeholder="Найти коктейль…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      <div className="chip-row">
        <div
          className={'chip' + (category === 'Всё' ? ' active' : '')}
          onClick={() => setCategory('Всё')}
        >
          Всё
        </div>
        {CATEGORIES.map((c) => (
          <div
            key={c}
            className={'chip' + (category === c ? ' active' : '')}
            onClick={() => setCategory(c)}
          >
            {c}
          </div>
        ))}
      </div>

      {totalEmpty ? (
        <div className="empty-state">
          <span className="emoji">🔍</span>
          <p>Ничего не нашлось</p>
        </div>
      ) : (
        <>
          <div className="recipe-grid">
            {filteredMine.map((r) => (
              <RecipeCard
                key={r.id}
                isCustom
                recipe={{ id: r.id, emoji: r.emoji, name: r.name, glass: r.glass, time: r.time, abv: r.abv }}
              />
            ))}
            {filteredStatic.map((r) => (
              <RecipeCard key={r.id} recipe={r} />
            ))}
          </div>

          {filteredCommunity.length > 0 && (
            <>
              <h2 style={{ fontSize: 16, margin: '18px 0 10px' }}>
                👥 Рецепты сообщества ({filteredCommunity.length})
              </h2>
              <div className="recipe-grid">
                {filteredCommunity.map((r) => (
                  <div key={r.id} className="recipe-card" onClick={() => navigate(`/recipe/${r.id}`)}>
                    <span className="emoji">{r.emoji}</span>
                    <span className="name">{r.name}</span>
                    <span className="meta">от @{r.owner?.username ?? 'кого-то'}</span>
                    <span className="tag">{r.abv}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}

      {user ? (
        <button
          className="btn btn-outline btn-block"
          style={{ marginTop: 16 }}
          onClick={() => navigate('/recipe/new')}
        >
          + Добавить свой рецепт
        </button>
      ) : null}
    </div>
  )
}
