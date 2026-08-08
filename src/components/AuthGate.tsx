import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../store/auth'
import { isSupabaseConfigured } from '../lib/supabase'

/**
 * Оборачивает страницы, которым нужна авторизация (друзья, вечеринки).
 * Если Supabase ещё не подключён — показывает объяснение вместо краша.
 * Если пользователь не залогинен — предлагает войти.
 * Если профиль (username) ещё не создан — просит создать его.
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const { user, profile, initialized } = useAuth()
  const navigate = useNavigate()

  if (!isSupabaseConfigured) {
    return (
      <div className="page">
        <div className="banner">
          Социальные функции пока не подключены. Чтобы включить друзей и
          вечеринки, нужно настроить Supabase — см. README проекта.
        </div>
      </div>
    )
  }

  if (!initialized) {
    return (
      <div className="page">
        <p className="page-subtitle">Загрузка…</p>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="page">
        <div className="empty-state">
          <span className="emoji">🔐</span>
          <p>Чтобы добавлять друзей и звать на вечеринки, нужно войти.</p>
          <button className="btn btn-gold" onClick={() => navigate('/auth')}>
            Войти
          </button>
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="page">
        <div className="empty-state">
          <span className="emoji">✍️</span>
          <p>Осталось создать имя пользователя.</p>
          <button className="btn btn-gold" onClick={() => navigate('/setup-profile')}>
            Создать профиль
          </button>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
