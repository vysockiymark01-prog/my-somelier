import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getRecipeById, type Ingredient } from '../data/recipes'
import { getMyRecipeById, deleteCustomRecipe } from '../lib/customRecipes'
import { isSupabaseConfigured } from '../lib/supabase'
import { useAuth } from '../store/auth'
import {
  baristaPlayer,
  DEFAULT_VOICE_SETTINGS,
  isSpeechSupported,
  type PlayerState,
} from '../lib/voice'

interface DisplayRecipe {
  id: string
  name: string
  emoji: string
  glass: string
  time: string
  abv: string
  ingredients: Ingredient[]
  steps: string[]
  garnish?: string | null
  tip?: string | null
  isCustom: boolean
  ownerId?: string
}

export function RecipeDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [recipe, setRecipe] = useState<DisplayRecipe | null | undefined>(undefined)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (!id) {
      setRecipe(null)
      return
    }
    const staticRecipe = getRecipeById(id)
    if (staticRecipe) {
      setRecipe({ ...staticRecipe, isCustom: false })
      return
    }
    if (!isSupabaseConfigured) {
      setRecipe(null)
      return
    }
    setRecipe(undefined)
    getMyRecipeById(id)
      .then((row) => {
        if (!row) {
          setRecipe(null)
          return
        }
        setRecipe({
          id: row.id,
          name: row.name,
          emoji: row.emoji,
          glass: row.glass,
          time: row.time,
          abv: row.abv,
          ingredients: row.ingredients,
          steps: row.steps,
          garnish: row.garnish,
          tip: row.tip,
          isCustom: true,
          ownerId: row.owner_id,
        })
      })
      .catch(() => setRecipe(null))
  }, [id])

  const [playerState, setPlayerState] = useState<PlayerState>(baristaPlayer.state)
  const [rate, setRate] = useState(DEFAULT_VOICE_SETTINGS.rate)
  const [pitch, setPitch] = useState(DEFAULT_VOICE_SETTINGS.pitch)

  useEffect(() => {
    const unsub = baristaPlayer.subscribe(setPlayerState)
    return () => {
      unsub()
      baristaPlayer.stop()
    }
  }, [])

  if (recipe === undefined) {
    return (
      <div className="page">
        <p className="page-subtitle">Загрузка…</p>
      </div>
    )
  }

  if (!recipe) {
    return (
      <div className="page">
        <div className="empty-state">
          <span className="emoji">🥲</span>
          <p>Рецепт не найден</p>
        </div>
      </div>
    )
  }

  const speechSupported = isSpeechSupported()

  const handlePlayPause = () => {
    if (playerState.status === 'playing') {
      baristaPlayer.pause()
    } else if (playerState.status === 'paused') {
      baristaPlayer.resume()
    } else {
      baristaPlayer.play(recipe.steps, { rate, pitch })
    }
  }

  const handleDelete = async () => {
    if (!recipe.isCustom) return
    setDeleting(true)
    try {
      await deleteCustomRecipe(recipe.id)
      navigate('/')
    } catch {
      setDeleting(false)
    }
  }

  const canDelete = recipe.isCustom && user && recipe.ownerId === user.id

  return (
    <div className="page">
      <div className="row" style={{ marginBottom: 10, justifyContent: 'space-between' }}>
        <button className="icon-btn" onClick={() => navigate(-1)}>
          ←
        </button>
        {canDelete && (
          <button className="icon-btn" onClick={handleDelete} disabled={deleting} aria-label="Удалить">
            🗑
          </button>
        )}
      </div>

      <div style={{ fontSize: 52, textAlign: 'center' }}>{recipe.emoji}</div>
      <h1 className="page-title" style={{ textAlign: 'center' }}>
        {recipe.name}
      </h1>
      <p className="page-subtitle" style={{ textAlign: 'center' }}>
        {recipe.glass} · {recipe.time} · {recipe.abv}
        {recipe.isCustom ? ' · 🧑‍🍳 Ваш рецепт' : ''}
      </p>

      <div className="card">
        <h2 style={{ fontSize: 16, margin: '0 0 10px' }}>Ингредиенты</h2>
        <ul className="ingredient-list">
          {recipe.ingredients.map((ing) => (
            <li key={ing.name}>
              <span>{ing.name}</span>
              <span style={{ color: 'var(--gold-soft)' }}>{ing.amount}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="card">
        <h2 style={{ fontSize: 16, margin: '0 0 10px' }}>Шаги приготовления</h2>
        <ol className="step-list">
          {recipe.steps.map((step, i) => (
            <li key={i} className={playerState.stepIndex === i ? 'active' : ''}>
              <span className="step-num">{i + 1}</span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
        {recipe.garnish && (
          <p className="helper-text" style={{ marginTop: 14 }}>
            🍋 Гарнир: {recipe.garnish}
          </p>
        )}
        {recipe.tip && <p className="helper-text">💡 {recipe.tip}</p>}
      </div>

      {speechSupported ? (
        <div className="voice-panel">
          <div className="voice-controls">
            <button className="icon-btn" onClick={handlePlayPause} aria-label="Play">
              {playerState.status === 'playing' ? '⏸' : '▶️'}
            </button>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 14 }}>Голос бариста</div>
              <div className="helper-text" style={{ margin: 0 }}>
                {playerState.status === 'playing'
                  ? `Читает шаг ${playerState.stepIndex + 1} из ${recipe.steps.length}`
                  : playerState.status === 'paused'
                    ? 'На паузе'
                    : 'Нажмите, чтобы прослушать рецепт'}
              </div>
            </div>
            {playerState.status !== 'idle' && (
              <button className="icon-btn" onClick={() => baristaPlayer.stop()}>
                ⏹
              </button>
            )}
          </div>

          <div className="slider-row">
            <span>Темп</span>
            <input
              type="range"
              min={0.6}
              max={1.3}
              step={0.05}
              value={rate}
              onChange={(e) => setRate(parseFloat(e.target.value))}
            />
          </div>
          <div className="slider-row">
            <span>Тембр</span>
            <input
              type="range"
              min={0.3}
              max={1.4}
              step={0.05}
              value={pitch}
              onChange={(e) => setPitch(parseFloat(e.target.value))}
            />
          </div>
        </div>
      ) : (
        <p className="helper-text">Ваш браузер не поддерживает озвучку рецептов.</p>
      )}
    </div>
  )
}
