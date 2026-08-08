import { useMemo, useState } from 'react'
import { CATEGORIES, RECIPES, type Category } from '../data/recipes'
import { RecipeCard } from '../components/RecipeCard'

export function CatalogPage() {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<Category | 'Всё'>('Всё')

  const filtered = useMemo(() => {
    return RECIPES.filter((r) => {
      const matchesCategory = category === 'Всё' || r.category === category
      const matchesQuery =
        !query.trim() || r.name.toLowerCase().includes(query.trim().toLowerCase())
      return matchesCategory && matchesQuery
    })
  }, [query, category])

  return (
    <div className="page">
      <h1 className="page-title">Рецепты</h1>
      <p className="page-subtitle">Смешивайте и слушайте голос бариста</p>

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

      {filtered.length === 0 ? (
        <div className="empty-state">
          <span className="emoji">🔍</span>
          <p>Ничего не нашлось</p>
        </div>
      ) : (
        <div className="recipe-grid">
          {filtered.map((r) => (
            <RecipeCard key={r.id} recipe={r} />
          ))}
        </div>
      )}
    </div>
  )
}
