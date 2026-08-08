import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CATEGORIES, MOODS, RECIPES, type Category, type Mood, type Recipe } from '../data/recipes'

type Strength = 'Любая' | 'Безалкогольный' | 'Лёгкий' | 'Крепкий'

const STRENGTHS: Strength[] = ['Любая', 'Безалкогольный', 'Лёгкий', 'Крепкий']

export function RandomizerPage() {
  const navigate = useNavigate()
  const [category, setCategory] = useState<Category | 'Всё'>('Всё')
  const [mood, setMood] = useState<Mood | 'Любое'>('Любое')
  const [strength, setStrength] = useState<Strength>('Любая')
  const [rolling, setRolling] = useState(false)
  const [result, setResult] = useState<Recipe | null>(null)

  const pool = RECIPES.filter((r) => {
    const matchesCategory = category === 'Всё' || r.category === category
    const matchesMood = mood === 'Любое' || r.mood === mood
    const matchesStrength = strength === 'Любая' || r.abv === strength
    return matchesCategory && matchesMood && matchesStrength
  })

  const handleRoll = () => {
    if (pool.length === 0) return
    setRolling(true)
    setResult(null)

    // Небольшая анимация «перебора» вариантов перед финальным выбором —
    // создаёт ощущение, что бариста и правда думает.
    let ticks = 0
    const maxTicks = 12
    const interval = setInterval(() => {
      ticks += 1
      const preview = pool[Math.floor(Math.random() * pool.length)]
      setResult(preview)
      if (ticks >= maxTicks) {
        clearInterval(interval)
        setRolling(false)
      }
    }, 90)
  }

  return (
    <div className="page">
      <div className="row" style={{ marginBottom: 10 }}>
        <button className="icon-btn" onClick={() => navigate(-1)}>
          ←
        </button>
      </div>

      <h1 className="page-title">🎲 Придумать напиток</h1>
      <p className="page-subtitle">
        Не знаете, что выбрать? Пусть бариста решит за вас — задайте пару пожеланий и крутите.
      </p>

      <div className="card">
        <h2 style={{ fontSize: 14, margin: '0 0 8px', color: 'var(--text-dim)' }}>Категория</h2>
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

        <h2 style={{ fontSize: 14, margin: '16px 0 8px', color: 'var(--text-dim)' }}>Настроение</h2>
        <div className="chip-row">
          <div
            className={'chip' + (mood === 'Любое' ? ' active' : '')}
            onClick={() => setMood('Любое')}
          >
            Любое
          </div>
          {MOODS.map((m) => (
            <div key={m} className={'chip' + (mood === m ? ' active' : '')} onClick={() => setMood(m)}>
              {m}
            </div>
          ))}
        </div>

        <h2 style={{ fontSize: 14, margin: '16px 0 8px', color: 'var(--text-dim)' }}>Крепость</h2>
        <div className="chip-row">
          {STRENGTHS.map((s) => (
            <div
              key={s}
              className={'chip' + (strength === s ? ' active' : '')}
              onClick={() => setStrength(s)}
            >
              {s}
            </div>
          ))}
        </div>
      </div>

      {pool.length === 0 ? (
        <div className="empty-state">
          <span className="emoji">🥲</span>
          <p>Под такие пожелания рецептов пока нет — смягчите фильтры</p>
        </div>
      ) : (
        <>
          <button
            className="btn btn-gold btn-block"
            style={{ marginBottom: 14 }}
            onClick={handleRoll}
            disabled={rolling}
          >
            {rolling ? 'Бариста думает…' : result ? '🎲 Ещё раз' : '🎲 Придумать напиток'}
          </button>

          {result && (
            <div className={'card result-card' + (rolling ? ' rolling' : '')}>
              <div style={{ fontSize: 52, textAlign: 'center' }}>{result.emoji}</div>
              <h2 style={{ textAlign: 'center', margin: '4px 0 2px' }}>{result.name}</h2>
              <p className="page-subtitle" style={{ textAlign: 'center', marginBottom: 14 }}>
                {result.glass} · {result.time} · {result.abv}
              </p>

              {!rolling && (
                <button
                  className="btn btn-primary btn-block"
                  onClick={() => navigate(`/recipe/${result.id}`)}
                >
                  Смотреть рецепт и слушать бариста
                </button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
