import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AuthGate } from '../components/AuthGate'
import { useAuth } from '../store/auth'
import { CATEGORIES } from '../data/recipes'
import { createCustomRecipe } from '../lib/customRecipes'

const ABV_OPTIONS = ['Безалкогольный', 'Лёгкий', 'Крепкий']

function NewRecipeInner() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [emoji, setEmoji] = useState('🍹')
  const [category, setCategory] = useState(CATEGORIES[0])
  const [abv, setAbv] = useState(ABV_OPTIONS[1])
  const [glass, setGlass] = useState('')
  const [time, setTime] = useState('5 мин')
  const [ingredients, setIngredients] = useState([{ name: '', amount: '' }])
  const [steps, setSteps] = useState([''])
  const [garnish, setGarnish] = useState('')
  const [tip, setTip] = useState('')
  const [isPublic, setIsPublic] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const updateIngredient = (i: number, field: 'name' | 'amount', value: string) => {
    setIngredients((prev) => prev.map((ing, idx) => (idx === i ? { ...ing, [field]: value } : ing)))
  }
  const updateStep = (i: number, value: string) => {
    setSteps((prev) => prev.map((s, idx) => (idx === i ? value : s)))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    setError(null)

    const cleanIngredients = ingredients.filter((i) => i.name.trim())
    const cleanSteps = steps.filter((s) => s.trim())

    if (!name.trim()) {
      setError('Укажите название напитка')
      return
    }
    if (cleanIngredients.length === 0) {
      setError('Добавьте хотя бы один ингредиент')
      return
    }
    if (cleanSteps.length === 0) {
      setError('Добавьте хотя бы один шаг приготовления')
      return
    }

    setSaving(true)
    try {
      const recipe = await createCustomRecipe({
        ownerId: user.id,
        name,
        emoji,
        category,
        glass,
        abv,
        time,
        ingredients: cleanIngredients,
        steps: cleanSteps,
        garnish,
        tip,
        isPublic,
      })
      navigate(`/recipe/${recipe.id}`)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="page">
      <div className="row" style={{ marginBottom: 10 }}>
        <button className="icon-btn" onClick={() => navigate(-1)}>
          ←
        </button>
      </div>
      <h1 className="page-title">Свой рецепт</h1>
      <p className="page-subtitle">Добавьте напиток, которого нет в каталоге — он появится только у вас</p>

      <form onSubmit={handleSubmit}>
        <div className="form-field">
          <label>Название</label>
          <input
            className="text-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Например, «Летний закат»"
          />
        </div>

        <div className="row" style={{ gap: 10 }}>
          <div className="form-field" style={{ flex: 1 }}>
            <label>Эмодзи</label>
            <input className="text-input" value={emoji} onChange={(e) => setEmoji(e.target.value)} />
          </div>
          <div className="form-field" style={{ flex: 2 }}>
            <label>Бокал</label>
            <input
              className="text-input"
              value={glass}
              onChange={(e) => setGlass(e.target.value)}
              placeholder="Хайбол"
            />
          </div>
          <div className="form-field" style={{ flex: 1 }}>
            <label>Время</label>
            <input className="text-input" value={time} onChange={(e) => setTime(e.target.value)} />
          </div>
        </div>

        <div className="form-field">
          <label>Категория</label>
          <div className="chip-row">
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
        </div>

        <div className="form-field">
          <label>Крепость</label>
          <div className="chip-row">
            {ABV_OPTIONS.map((a) => (
              <div key={a} className={'chip' + (abv === a ? ' active' : '')} onClick={() => setAbv(a)}>
                {a}
              </div>
            ))}
          </div>
        </div>

        <div className="form-field">
          <label>Ингредиенты</label>
          {ingredients.map((ing, i) => (
            <div key={i} className="row" style={{ gap: 8, marginBottom: 8 }}>
              <input
                className="text-input"
                style={{ flex: 2 }}
                placeholder="Название"
                value={ing.name}
                onChange={(e) => updateIngredient(i, 'name', e.target.value)}
              />
              <input
                className="text-input"
                style={{ flex: 1 }}
                placeholder="50 мл"
                value={ing.amount}
                onChange={(e) => updateIngredient(i, 'amount', e.target.value)}
              />
            </div>
          ))}
          <button
            type="button"
            className="btn btn-outline btn-block"
            onClick={() => setIngredients((prev) => [...prev, { name: '', amount: '' }])}
          >
            + Ингредиент
          </button>
        </div>

        <div className="form-field">
          <label>Шаги приготовления</label>
          {steps.map((step, i) => (
            <input
              key={i}
              className="text-input"
              style={{ marginBottom: 8 }}
              placeholder={`Шаг ${i + 1}`}
              value={step}
              onChange={(e) => updateStep(i, e.target.value)}
            />
          ))}
          <button
            type="button"
            className="btn btn-outline btn-block"
            onClick={() => setSteps((prev) => [...prev, ''])}
          >
            + Шаг
          </button>
        </div>

        <div className="form-field">
          <label>Гарнир (необязательно)</label>
          <input className="text-input" value={garnish} onChange={(e) => setGarnish(e.target.value)} />
        </div>
        <div className="form-field">
          <label>Совет (необязательно)</label>
          <input className="text-input" value={tip} onChange={(e) => setTip(e.target.value)} />
        </div>

        <div
          className="card"
          style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}
          onClick={() => setIsPublic((v) => !v)}
        >
          <input
            type="checkbox"
            checked={isPublic}
            onChange={(e) => setIsPublic(e.target.checked)}
            style={{ width: 20, height: 20 }}
          />
          <div>
            <div style={{ fontWeight: 600, fontSize: 14 }}>Показывать другим пользователям</div>
            <div className="helper-text" style={{ margin: 0 }}>
              Рецепт появится в общем разделе «Рецепты сообщества» с вашим именем
            </div>
          </div>
        </div>

        {error && <p className="error-text">{error}</p>}
        <button className="btn btn-gold btn-block" type="submit" disabled={saving}>
          {saving ? 'Сохраняем…' : 'Сохранить рецепт'}
        </button>
      </form>
    </div>
  )
}

export function NewRecipePage() {
  return (
    <AuthGate>
      <NewRecipeInner />
    </AuthGate>
  )
}
