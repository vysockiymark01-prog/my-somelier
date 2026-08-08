import { NavLink } from 'react-router-dom'

const ITEMS = [
  { to: '/', icon: '🍸', label: 'Рецепты', end: true },
  { to: '/friends', icon: '🧑‍🤝‍🧑', label: 'Друзья' },
  { to: '/parties', icon: '🎉', label: 'Вечеринки' },
  { to: '/profile', icon: '👤', label: 'Профиль' },
]

export function BottomNav() {
  return (
    <nav className="bottom-nav">
      {ITEMS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}
        >
          <span className="icon">{item.icon}</span>
          <span>{item.label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
