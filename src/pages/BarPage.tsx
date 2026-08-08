import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { RECIPES, getAllIngredientNames, countMissingIngredients } from '../data/recipes'

const STORAGE_KEY = 'my-somelier:bar-ingredients'

function loadHave(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return new Set()
    return new Set(JSON.parse(raw) as string[])
  } catch {
    return new Set()
  }
}

export function BarPage() {
  const navigate = useNavigate()
  const allIngredients = useMemo(() => getAllIngredientNames(), [])
  const [have, setHave] = useState<Set<string>>(() => loadHave())

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(have)))
  }, [have])

  const toggle = (name: string) => {
    setHave((prev) => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

  const { ready, almost } = useMemo(() => {
    const withMissing = RECIPES.map((r) => ({
      recipe: r,
      missing: countMissingIngredients(r, have),
    }))
    const ready = withMissing.filter((x) => x.missing === 0).map((x) => x.recipe)
    const almost = withMissing
      .filter((x) => x.missing > 0 && x.missing <= 2)
      .sort((a, b) => a.missing - b.missing)
    return { ready, almost }
  }, [have])

  return (
    <div className="page">
      <div className="row" style={{ marginBottom: 10 }}>
        <button className="icon-btn" onClick={() => navigate(-1)}>
          ←
        </button>
      </div>

      <h1 className="page-title">🧊 Что есть дома</h1>
      <p className="page-subtitle">
        Отметьте, что у вас есть под рукой — покажем, что можно смешать прямо сейчас.
      </p>

      <div className="card">
        <div className="chip-row" style={{ flexWrap: 'wrap', overflow: 'visible' }}>
          {allIngredients.map((name) => (
            <div
              key={name}
              className={'chip' + (have.has(name) ? ' active' : '')}
              onClick={() => toggle(name)}
            >
              {name}
            </div>
          ))}
        </div>
        {have.size > 0 && (
          <button
            className="btn btn-outline btn-block"
            style={{ marginTop: 14 }}
            onClick={() => setHave(new Set())}
          >
            Очистить выбор
          </button>
        )}
      </div>

      {have.size === 0 ? (
        <div className="empty-state">
          <span className="emoji">🍾</span>
          <p>Отметьте пару ингредиентов выше, чтобы увидеть подходящие рецепты</p>
        </div>
      ) : (
        <>
          <h2 style={{ fontSize: 16, margin: '18px 0 10px' }}>
            ✅ Можно сделать прямо сейчас ({ready.length})
          </h2>
          {ready.length === 0 ? (
            <p className="helper-text">Пока ничего не собирается полностью — но посмотрите ниже, что почти готово.</p>
          ) : (
            <div className="recipe-grid">
              {ready.map((r) => (
                <div key={r.id} className="recipe-card" onClick={() => navigate(`/recipe/${r.id}`)}>
                  <span className="emoji">{r.emoji}</span>
                  <span className="name">{r.name}</span>
                  <span className="meta">
                    {r.glass} · {r.time}
                  </span>
                  <span className="tag">{r.abv}</span>
                </div>
              ))}
            </div>
          )}

          {almost.length > 0 && (
            <>
              <h2 style={{ fontSize: 16, margin: '18px 0 10px' }}>
                🛒 Почти готово, не хватает 1-2 позиций
              </h2>
              <div className="recipe-grid">
                {almost.map(({ recipe, missing }) => {
                  const missingNames = recipe.ingredients
                    .filter((ing) => !have.has(ing.name))
                    .map((ing) => ing.name)
                  return (
                    <div
                      key={recipe.id}
                      className="recipe-card"
                      onClick={() => navigate(`/recipe/${recipe.id}`)}
                    >
                      <span className="emoji">{recipe.emoji}</span>
                      <span className="name">{recipe.name}</span>
                      <span className="meta">Не хватает: {missingNames.join(', ')}</span>
                      <span className="tag">
                        {missing === 1 ? '1 ингредиент' : `${missing} ингредиента`}
                      </span>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}
