import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getRecipeById, type Ingredient } from '../data/recipes'
import { getMyRecipeById, deleteCustomRecipe, reportRecipe } from '../lib/customRecipes'
import { isSupabaseConfigured } from '../lib/supabase'
import { useAuth } from '../store/auth'
import { hasMade, recordMade } from '../lib/history'
import {
  baristaPlayer,
  DEFAULT_VOICE_SETTINGS,
  diagnoseVoice,
  isSpeechSupported,
  loadPreferredVoiceURI,
  loadVoices,
  savePreferredVoiceURI,
  sortVoicesForPicker,
  type PlayerState,
  type VoiceDiagnosis,
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
  isPublic?: boolean
}

export function RecipeDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [recipe, setRecipe] = useState<DisplayRecipe | null | undefined>(undefined)
  const [deleting, setDeleting] = useState(false)
  const [reported, setReported] = useState(false)
  const [reporting, setReporting] = useState(false)

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
          isPublic: row.is_public,
        })
      })
      .catch(() => setRecipe(null))
  }, [id])

  const [playerState, setPlayerState] = useState<PlayerState>(baristaPlayer.state)
  const [rate, setRate] = useState(DEFAULT_VOICE_SETTINGS.rate)
  const [pitch, setPitch] = useState(DEFAULT_VOICE_SETTINGS.pitch)
  const [diagnosis, setDiagnosis] = useState<VoiceDiagnosis | null>(null)
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])
  const [voiceURI, setVoiceURI] = useState<string | null>(() => loadPreferredVoiceURI())

  useEffect(() => {
    const unsub = baristaPlayer.subscribe(setPlayerState)
    return () => {
      unsub()
      baristaPlayer.stop()
    }
  }, [])

  useEffect(() => {
    diagnoseVoice().then(setDiagnosis)
    loadVoices().then((v) => setVoices(sortVoicesForPicker(v)))
  }, [])

  const handleVoiceChange = (uri: string) => {
    const value = uri || null
    setVoiceURI(value)
    savePreferredVoiceURI(value)
  }

  const [made, setMade] = useState(false)
  useEffect(() => {
    if (recipe) setMade(hasMade(recipe.id))
  }, [recipe])

  const handleMarkMade = () => {
    if (!recipe) return
    recordMade(recipe.id, Date.now())
    setMade(true)
  }

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
      baristaPlayer.play(recipe.steps, { rate, pitch, voiceURI })
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
  const canReport = recipe.isCustom && recipe.isPublic && user && recipe.ownerId !== user.id

  const handleReport = async () => {
    if (!recipe) return
    setReporting(true)
    try {
      await reportRecipe(recipe.id, (user as { id: string }).id)
      setReported(true)
    } catch {
      // молча игнорируем — например, если уже жаловались раньше
      setReported(true)
    } finally {
      setReporting(false)
    }
  }

  return (
    <div className="page">
      <div className="row" style={{ marginBottom: 10, justifyContent: 'space-between' }}>
        <button className="icon-btn" onClick={() => navigate(-1)}>
          ←
        </button>
        <div className="row" style={{ gap: 8 }}>
          {canDelete && (
            <button className="icon-btn" onClick={() => navigate(`/recipe/${recipe.id}/edit`)} aria-label="Редактировать">
              ✏️
            </button>
          )}
          {canDelete && (
            <button className="icon-btn" onClick={handleDelete} disabled={deleting} aria-label="Удалить">
              🗑
            </button>
          )}
          {canReport && (
            <button
              className="icon-btn"
              onClick={handleReport}
              disabled={reporting || reported}
              aria-label="Пожаловаться"
              title="Пожаловаться на рецепт"
            >
              {reported ? '✅' : '🚩'}
            </button>
          )}
        </div>
      </div>

      <div style={{ fontSize: 52, textAlign: 'center' }}>{recipe.emoji}</div>
      <h1 className="page-title" style={{ textAlign: 'center' }}>
        {recipe.name}
      </h1>
      <p className="page-subtitle" style={{ textAlign: 'center' }}>
        {recipe.glass} · {recipe.time} · {recipe.abv}
        {recipe.isCustom ? ' · 🧑‍🍳 Ваш рецепт' : ''}
      </p>

      <button
        className={'btn btn-block ' + (made ? 'btn-outline' : 'btn-gold')}
        style={{ marginBottom: 14 }}
        onClick={handleMarkMade}
        disabled={made}
      >
        {made ? '✅ Приготовлено' : '🍹 Отметить, что приготовил(а)'}
      </button>

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

          {voices.length > 0 && (
            <div className="form-field" style={{ marginTop: 10 }}>
              <label>Голос бариста</label>
              <select
                className="text-input"
                value={voiceURI ?? ''}
                onChange={(e) => handleVoiceChange(e.target.value)}
              >
                <option value="">Автоматически (подобрать самим)</option>
                {voices.map((v) => (
                  <option key={v.voiceURI} value={v.voiceURI}>
                    {v.name} ({v.lang})
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            type="button"
            className="btn btn-outline btn-block"
            style={{ marginTop: 10 }}
            onClick={() =>
              baristaPlayer.play(['Проверка звука. Если слышите это — всё работает.'], {
                rate,
                pitch,
                voiceURI,
              })
            }
          >
            🔊 Проверить звук
          </button>

          {diagnosis && !diagnosis.ok && (
            <p className="helper-text" style={{ color: 'var(--danger)', marginTop: 8 }}>
              {diagnosis.reason === 'no-voices'
                ? 'В этом браузере не нашлось ни одного голоса для озвучки. Часто это Yandex Browser или мобильный браузер без установленного движка синтеза речи — попробуйте открыть сайт в Google Chrome, там голоса встроены.'
                : 'Этот браузер вообще не поддерживает озвучку речи (Web Speech API).'}
            </p>
          )}
          {diagnosis && diagnosis.ok && (
            <p className="helper-text" style={{ marginTop: 8 }}>
              Голос: {diagnosis.pickedVoiceName} · доступно голосов: {diagnosis.voiceCount}
            </p>
          )}
        </div>
      ) : (
        <p className="helper-text">Ваш браузер не поддерживает озвучку рецептов.</p>
      )}
    </div>
  )
}
