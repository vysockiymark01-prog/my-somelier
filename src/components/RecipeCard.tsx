import { useNavigate } from 'react-router-dom'
import type { Recipe } from '../data/recipes'

export function RecipeCard({ recipe }: { recipe: Recipe }) {
  const navigate = useNavigate()
  return (
    <div className="recipe-card" onClick={() => navigate(`/recipe/${recipe.id}`)}>
      <span className="emoji">{recipe.emoji}</span>
      <span className="name">{recipe.name}</span>
      <span className="meta">
        {recipe.glass} · {recipe.time}
      </span>
      <span className="tag">{recipe.abv}</span>
    </div>
  )
}
