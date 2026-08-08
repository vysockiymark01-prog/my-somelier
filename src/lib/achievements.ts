import { CATEGORIES, RECIPES } from '../data/recipes'
import { loadHistory } from './history'

export interface Badge {
  id: string
  emoji: string
  title: string
  description: string
  earned: boolean
}

export function computeBadges(hostedPartyCount = 0): Badge[] {
  const history = loadHistory()
  const madeIds = new Set(history.map((h) => h.recipeId))
  const madeCount = madeIds.size

  const badges: Badge[] = []

  const countTiers = [
    { count: 1, id: 'first-sip', emoji: '🥂', title: 'Первый глоток', description: 'Приготовили первый коктейль' },
    { count: 5, id: 'enthusiast', emoji: '🍸', title: 'Энтузиаст', description: 'Приготовили 5 разных напитков' },
    { count: 10, id: 'connoisseur', emoji: '🎓', title: 'Знаток', description: 'Приготовили 10 разных напитков' },
    {
      count: RECIPES.length,
      id: 'master',
      emoji: '🏆',
      title: 'Мастер бариста',
      description: `Приготовили все ${RECIPES.length} рецептов из каталога`,
    },
  ]
  countTiers.forEach((t) =>
    badges.push({
      id: t.id,
      emoji: t.emoji,
      title: t.title,
      description: t.description,
      earned: madeCount >= t.count,
    })
  )

  CATEGORIES.forEach((cat) => {
    const inCat = RECIPES.filter((r) => r.category === cat)
    const allMade = inCat.length > 0 && inCat.every((r) => madeIds.has(r.id))
    badges.push({
      id: `category-${cat}`,
      emoji: '📚',
      title: `Категория «${cat}»`,
      description: `Приготовили все рецепты из категории «${cat}» (${inCat.length} шт.)`,
      earned: allMade,
    })
  })

  badges.push({
    id: 'host',
    emoji: '🎉',
    title: 'Хозяин вечеринки',
    description: 'Организовали хотя бы одну вечеринку',
    earned: hostedPartyCount > 0,
  })

  return badges
}
