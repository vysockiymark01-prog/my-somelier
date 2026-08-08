import { useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { TopBar } from './components/TopBar'
import { BottomNav } from './components/BottomNav'
import { CatalogPage } from './pages/CatalogPage'
import { RecipeDetailPage } from './pages/RecipeDetailPage'
import { AuthPage } from './pages/AuthPage'
import { ProfileSetupPage } from './pages/ProfileSetupPage'
import { ProfilePage } from './pages/ProfilePage'
import { FriendsPage } from './pages/FriendsPage'
import { PartiesPage } from './pages/PartiesPage'
import { NewPartyPage } from './pages/NewPartyPage'
import { PartyDetailPage } from './pages/PartyDetailPage'
import { useAuth } from './store/auth'

function App() {
  const init = useAuth((s) => s.init)

  useEffect(() => {
    init()
  }, [init])

  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <div className="app-shell">
        <TopBar />
        <Routes>
          <Route path="/" element={<CatalogPage />} />
          <Route path="/recipe/:id" element={<RecipeDetailPage />} />
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
