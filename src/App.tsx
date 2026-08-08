import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom'
import { TopBar } from './components/TopBar'
import { BottomNav } from './components/BottomNav'
import { CatalogPage } from './pages/CatalogPage'
import { RecipeDetailPage } from './pages/RecipeDetailPage'
import { RandomizerPage } from './pages/RandomizerPage'
import { BarPage } from './pages/BarPage'
import { SwipePage } from './pages/SwipePage'
import { QuizPage } from './pages/QuizPage'
import { NewRecipePage } from './pages/NewRecipePage'
import { AuthPage } from './pages/AuthPage'
import { ProfileSetupPage } from './pages/ProfileSetupPage'
import { ProfilePage } from './pages/ProfilePage'
import { FriendsPage } from './pages/FriendsPage'
import { PartiesPage } from './pages/PartiesPage'
import { NewPartyPage } from './pages/NewPartyPage'
import { PartyDetailPage } from './pages/PartyDetailPage'
import { useAuth } from './store/auth'

// Восстанавливает путь, сохранённый public/404.html при прямом переходе
// по ссылке на подстраницу (GitHub Pages не умеет отдавать index.html
// на такие запросы сам, поэтому подстраховываемся через sessionStorage).
function SpaRedirectHandler() {
  const navigate = useNavigate()

  useEffect(() => {
    const redirect = sessionStorage.getItem('spa-redirect')
    if (redirect) {
      sessionStorage.removeItem('spa-redirect')
      navigate('/' + redirect, { replace: true })
    }
  }, [navigate])

  return null
}

function App() {
  const init = useAuth((s) => s.init)

  useEffect(() => {
    init()
  }, [init])

  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <SpaRedirectHandler />
      <div className="app-shell">
        <TopBar />
        <Routes>
          <Route path="/" element={<CatalogPage />} />
          <Route path="/recipe/:id" element={<RecipeDetailPage />} />
          <Route path="/random" element={<RandomizerPage />} />
          <Route path="/bar" element={<BarPage />} />
          <Route path="/swipe" element={<SwipePage />} />
          <Route path="/quiz" element={<QuizPage />} />
          <Route path="/recipe/new" element={<NewRecipePage />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/setup-profile" element={<ProfileSetupPage />} />
          <Route path="/friends" element={<FriendsPage />} />
          <Route path="/parties" element={<PartiesPage />} />
          <Route path="/parties/new" element={<NewPartyPage />} />
          <Route path="/parties/:id" element={<PartyDetailPage />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Routes>
        <BottomNav />
      </div>
    </BrowserRouter>
  )
}

export default App
