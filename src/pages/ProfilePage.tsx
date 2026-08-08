import { useNavigate } from 'react-router-dom'
import { useAuth } from '../store/auth'
import { isSupabaseConfigured } from '../lib/supabase'

export function ProfilePage() {
  const { user, profile, signOut } = useAuth()
  const navigate = useNavigate()

  return (
    <div className="page">
      <h1 className="page-title">Профиль</h1>

      {!isSupabaseConfigured && (
        <div className="banner">Бэкенд не настроен — вход недоступен.</div>
      )}

      {isSupabaseConfigured && !user && (
        <div className="card">
          <p className="page-subtitle" style={{ margin: '0 0 12px' }}>
            Вы не авторизованы
          </p>
          <button className="btn btn-gold btn-block" onClick={() => navigate('/auth')}>
            Войти
          </button>
        </div>
      )}

      {user && (
        <div className="card">
          <div className="row">
            <div className="avatar">{profile?.avatar_emoji ?? '🍸'}</div>
            <div>
              <div style={{ fontWeight: 700 }}>
                {profile?.display_name ?? profile?.username ?? user.email}
              </div>
              <div className="helper-text" style={{ margin: 0 }}>
                {profile ? `@${profile.username}` : user.email}
              </div>
            </div>
          </div>

          {!profile && (
            <button
              className="btn btn-outline btn-block"
              style={{ marginTop: 14 }}
              onClick={() => navigate('/setup-profile')}
            >
              Создать профиль
            </button>
          )}

          <button
            className="btn btn-outline btn-block"
            style={{ marginTop: 14 }}
            onClick={() => signOut()}
          >
            Выйти
          </button>
        </div>
      )}

      <div className="card">
        <h2 style={{ fontSize: 15, margin: '0 0 8px' }}>О приложении</h2>
        <p className="helper-text">
          «Мой сомелье» — рецепты напитков с голосом бариста, PWA-приложение.
          Каталог рецептов и озвучка работают без входа в аккаунт.
        </p>
      </div>
    </div>
  )
}
