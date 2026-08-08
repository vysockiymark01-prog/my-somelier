import type { Category, Mood } from '../data/recipes'

export interface SeasonalSuggestion {
  emoji: string
  title: string
  subtitle: string
  category?: Category
  mood?: Mood
}

// Праздничные окна заданы парами [месяц (0-11), день] — намеренно без
// привязки к году, чтобы работало из года в год без обновлений.
function inWindow(month: number, day: number, from: [number, number], to: [number, number]) {
  const value = month * 100 + day
  const start = from[0] * 100 + from[1]
  const end = to[0] * 100 + to[1]
  if (start <= end) return value >= start && value <= end
  // окно перекидывается через Новый год (например 25 декабря — 8 января)
  return value >= start || value <= end
}

export function getSeasonalSuggestion(date: Date = new Date()): SeasonalSuggestion {
  const month = date.getMonth()
  const day = date.getDate()
  const hour = date.getHours()

  if (inWindow(month, day, [11, 20], [0, 8])) {
    return {
      emoji: '🎄',
      title: 'Скоро Новый год',
      subtitle: 'Глинтвейн и горячие напитки — то, что нужно в такую погоду',
      category: 'Горячие',
    }
  }
  if (month === 2 && day >= 6 && day <= 8) {
    return {
      emoji: '💐',
      title: '8 Марта',
      subtitle: 'Что-нибудь лёгкое и праздничное — попробуйте Кир Рояль',
      mood: 'Романтика',
    }
  }
  if (month === 11 || month === 0 || month === 1) {
    return {
      emoji: '❄️',
      title: 'На улице холодно',
      subtitle: 'Согревающие горячие напитки — глинтвейн или хот-тодди',
      category: 'Горячие',
    }
  }
  if (month >= 5 && month <= 7) {
    return {
      emoji: '☀️',
      title: 'Жаркий сезон',
      subtitle: 'Освежающие коктейли со льдом — то что доктор прописал',
      category: 'Освежающие',
    }
  }
  if (hour >= 22 || hour < 5) {
    return {
      emoji: '🌙',
      title: 'Поздний вечер',
      subtitle: 'Что-нибудь спокойное для расслабления',
      mood: 'Расслабиться',
    }
  }
  if (hour >= 6 && hour < 12) {
    return {
      emoji: '🌤',
      title: 'Утро',
      subtitle: 'Загляните в безалкогольные — отличный старт дня',
      category: 'Безалкогольные',
    }
  }
  return {
    emoji: '🍹',
    title: 'Хорошее время для коктейля',
    subtitle: 'Загляните в каталог — вдруг что-то приглянется',
  }
}
