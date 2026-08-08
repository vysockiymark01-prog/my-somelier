import { useNavigate } from 'react-router-dom'

interface RecipeCardData {
  id: string
  emoji: string
  name: string
  glass: string
  time: string
  abv: string
}

export function RecipeCard({ recipe, isCustom }: { recipe: RecipeCardData; isCustom?: boolean }) {
  const navigate = useNavigate()
  return (
    <div className="recipe-card" onClick={() => navigate(`/recipe/${recipe.id}`)}>
      <span className="emoji">{recipe.emoji}</span>
      <span className="name">{recipe.name}</span>
      <span className="meta">
        {recipe.glass} · {recipe.time}
      </span>
      <span className="tag">{isCustom ? '🧑‍🍳 Моё' : recipe.abv}</span>
    </div>
  )
}
