import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { RECIPES, type Recipe } from '../data/recipes'

const TOTAL_QUESTIONS = 8

interface Question {
  recipe: Recipe
  options: Recipe[]
}

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

function buildQuestions(): Question[] {
  const pool = shuffle(RECIPES).slice(0, TOTAL_QUESTIONS)
  return pool.map((recipe) => {
    const wrongPool = shuffle(RECIPES.filter((r) => r.id !== recipe.id)).slice(0, 3)
    return { recipe, options: shuffle([recipe, ...wrongPool]) }
  })
}

export function QuizPage() {
  const navigate = useNavigate()
  const [questions, setQuestions] = useState<Question[]>(() => buildQuestions())
  const [step, setStep] = useState(0)
  const [score, setScore] = useState(0)
  const [picked, setPicked] = useState<string | null>(null)

  const question = questions[step]
  const finished = step >= questions.length

  const handlePick = (recipeId: string) => {
    if (picked) return
    setPicked(recipeId)
    if (recipeId === question.recipe.id) setScore((s) => s + 1)
    setTimeout(() => {
      setPicked(null)
      setStep((s) => s + 1)
    }, 700)
  }

  const restart = () => {
    setQuestions(buildQuestions())
    setStep(0)
    setScore(0)
    setPicked(null)
  }

  const resultText = useMemo(() => {
    if (score === questions.length) return 'Идеально! Вы настоящий бариста 🏆'
    if (score >= questions.length * 0.6) return 'Отличный результат 👏'
    if (score >= questions.length * 0.3) return 'Неплохо, но есть куда расти 🙂'
    return 'Пора почаще заглядывать в рецепты 📖'
  }, [score, questions.length])

  return (
    <div className="page">
      <div className="row" style={{ marginBottom: 10 }}>
        <button className="icon-btn" onClick={() => navigate(-1)}>
          ←
        </button>
      </div>

      <h1 className="page-title">🧠 Угадай коктейль</h1>
      <p className="page-subtitle">По составу ингредиентов угадайте, что это за напиток</p>

      {finished ? (
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 48 }}>🎯</div>
          <h2 style={{ margin: '8px 0 4px' }}>
            {score} из {questions.length}
          </h2>
          <p className="helper-text" style={{ marginBottom: 16 }}>
            {resultText}
          </p>
          <button className="btn btn-primary btn-block" onClick={restart}>
            Играть ещё раз
          </button>
        </div>
      ) : (
        <>
          <p className="helper-text" style={{ marginBottom: 8 }}>
            Вопрос {step + 1} из {questions.length} · Счёт: {score}
          </p>
          <div className="card">
            <h2 style={{ fontSize: 16, margin: '0 0 10px' }}>Ингредиенты:</h2>
            <p style={{ color: 'var(--gold-soft)', marginBottom: 4 }}>
              {question.recipe.ingredients.map((i) => i.name).join(', ')}
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {question.options.map((opt) => {
              const isCorrect = picked && opt.id === question.recipe.id
              const isWrongPick = picked && opt.id === picked && opt.id !== question.recipe.id
              return (
                <button
                  key={opt.id}
                  className={
                    'btn btn-block ' +
                    (isCorrect ? 'btn-gold' : isWrongPick ? 'btn-outline' : 'btn-outline')
                  }
                  style={{
                    justifyContent: 'flex-start',
                    borderColor: isWrongPick ? 'var(--danger)' : undefined,
                    color: isWrongPick ? 'var(--danger)' : undefined,
                  }}
                  onClick={() => handlePick(opt.id)}
                  disabled={Boolean(picked)}
                >
                  {opt.emoji} {opt.name}
                </button>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
