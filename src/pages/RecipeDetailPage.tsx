import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getRecipeById } from '../data/recipes'
import {
  baristaPlayer,
  DEFAULT_VOICE_SETTINGS,
  isSpeechSupported,
  type PlayerState,
} from '../lib/voice'

export function RecipeDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const recipe = id ? getRecipeById(id) : undefined

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

  return (
    <div className="page">
      <div className="row" style={{ marginBottom: 10 }}>
        <button className="icon-btn" onClick={() => navigate(-1)}>
          ←
        </button>
      </div>

      <div style={{ fontSize: 52, textAlign: 'center' }}>{recipe.emoji}</div>
      <h1 className="page-title" style={{ textAlign: 'center' }}>
        {recipe.name}
      </h1>
      <p className="page-subtitle" style={{ textAlign: 'center' }}>
        {recipe.glass} · {recipe.time} · {recipe.abv}
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
