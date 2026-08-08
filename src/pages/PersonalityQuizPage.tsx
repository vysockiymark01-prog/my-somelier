import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { RECIPES, type Mood } from '../data/recipes'

interface Option {
  label: string
  mood: Mood
}

interface Question {
  text: string
  options: Option[]
}

const QUESTIONS: Question[] = [
  {
    text: 'Как проходит твой идеальный вечер?',
    options: [
      { label: 'Дома, тихо, книга или сериал', mood: 'Расслабиться' },
      { label: 'Заряжаюсь новыми идеями и движухой', mood: 'Взбодриться' },
      { label: 'Ужин при свечах вдвоём', mood: 'Романтика' },
      { label: 'Шумная компания, музыка, танцы', mood: 'Вечеринка' },
      { label: 'Плед, чай, тепло и покой', mood: 'Уют' },
    ],
  },
  {
    text: 'Что важнее в компании?',
    options: [
      { label: 'Возможность выдохнуть', mood: 'Расслабиться' },
      { label: 'Энергия и драйв', mood: 'Взбодриться' },
      { label: 'Близость и внимание', mood: 'Романтика' },
      { label: 'Много людей и веселье', mood: 'Вечеринка' },
      { label: 'Тепло и знакомые лица', mood: 'Уют' },
    ],
  },
  {
    text: 'Любимое время суток?',
    options: [
      { label: 'Поздний вечер', mood: 'Расслабиться' },
      { label: 'Раннее утро', mood: 'Взбодриться' },
      { label: 'Закат', mood: 'Романтика' },
      { label: 'Ночь', mood: 'Вечеринка' },
      { label: 'Зимний вечер', mood: 'Уют' },
    ],
  },
  {
    text: 'Какая музыка ближе?',
    options: [
      { label: 'Лаунж, эмбиент', mood: 'Расслабиться' },
      { label: 'Драйвовый поп или рок', mood: 'Взбодриться' },
      { label: 'Джаз, соул', mood: 'Романтика' },
      { label: 'Танцевальная электроника', mood: 'Вечеринка' },
      { label: 'Акустика, что-то тёплое', mood: 'Уют' },
    ],
  },
  {
    text: 'Что важнее в напитке?',
    options: [
      { label: 'Мягкость и баланс', mood: 'Расслабиться' },
      { label: 'Яркий вкус, который взбодрит', mood: 'Взбодриться' },
      { label: 'Красивая подача', mood: 'Романтика' },
      { label: 'Чтобы делился с друзьями', mood: 'Вечеринка' },
      { label: 'Тёплый и согревающий', mood: 'Уют' },
    ],
  },
]

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

export function PersonalityQuizPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [scores, setScores] = useState<Record<Mood, number>>({
    Расслабиться: 0,
    Взбодриться: 0,
    Романтика: 0,
    Вечеринка: 0,
    Уют: 0,
  })
  const [finished, setFinished] = useState(false)

  const finished_ = step >= QUESTIONS.length || finished

  const handleAnswer = (mood: Mood) => {
    setScores((prev) => ({ ...prev, [mood]: prev[mood] + 1 }))
    if (step + 1 >= QUESTIONS.length) {
      setFinished(true)
    } else {
      setStep((s) => s + 1)
    }
  }

  const restart = () => {
    setStep(0)
    setScores({ Расслабиться: 0, Взбодриться: 0, Романтика: 0, Вечеринка: 0, Уют: 0 })
    setFinished(false)
  }

  const resultMood = useMemo<Mood>(() => {
    const entries = Object.entries(scores) as [Mood, number][]
    entries.sort((a, b) => b[1] - a[1])
    return entries[0][0]
  }, [scores])

  const resultRecipe = useMemo(() => {
    const pool = RECIPES.filter((r) => r.mood === resultMood)
    return pool[Math.floor(Math.random() * pool.length)] ?? RECIPES[0]
  }, [resultMood, finished_])

  const currentOptions = useMemo(() => shuffle(QUESTIONS[step].options), [step])

  const shareText = `Мой тест «Какой ты коктейль» в приложении «Мой сомелье»: я — ${resultRecipe.emoji} ${resultRecipe.name} (${resultMood.toLowerCase()})! Пройди тест и узнай свой: ${window.location.origin}${import.meta.env.BASE_URL}personality`

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ text: shareText })
        return
      } catch {
        // пользователь отменил — просто пробуем скопировать вместо этого
      }
    }
    try {
      await navigator.clipboard.writeText(shareText)
      alert('Текст скопирован — вставьте в любой чат')
    } catch {
      // без буфера обмена просто ничего не делаем
    }
  }

  return (
    <div className="page">
      <div className="row" style={{ marginBottom: 10 }}>
        <button className="icon-btn" onClick={() => navigate(-1)}>
          ←
        </button>
      </div>

      <h1 className="page-title">🧬 Какой ты коктейль</h1>
      <p className="page-subtitle">Пять вопросов — и узнаете свой напиток по настроению</p>

      {finished_ ? (
        <div className="card result-card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 64 }}>{resultRecipe.emoji}</div>
          <h2 style={{ margin: '4px 0 2px' }}>Ты — {resultRecipe.name}</h2>
          <p className="page-subtitle" style={{ marginBottom: 4 }}>{resultMood}</p>
          <p className="helper-text" style={{ marginBottom: 16 }}>
            {resultRecipe.glass} · {resultRecipe.abv}
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button className="btn btn-gold btn-block" onClick={handleShare}>
              📤 Поделиться результатом
            </button>
            <button
              className="btn btn-primary btn-block"
              onClick={() => navigate(`/recipe/${resultRecipe.id}`)}
            >
              Смотреть рецепт
            </button>
            <button className="btn btn-outline btn-block" onClick={restart}>
              Пройти ещё раз
            </button>
          </div>
        </div>
      ) : (
        <>
          <p className="helper-text" style={{ marginBottom: 10 }}>
            Вопрос {step + 1} из {QUESTIONS.length}
          </p>
          <div className="card">
            <h2 style={{ fontSize: 16, margin: '0 0 14px' }}>{QUESTIONS[step].text}</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {currentOptions.map((opt) => (
                <button
                  key={opt.label}
                  className="btn btn-outline btn-block"
                  style={{ justifyContent: 'flex-start' }}
                  onClick={() => handleAnswer(opt.mood)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
