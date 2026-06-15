import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { PlayerProvider } from './context/PlayerContext'
import { LibraryProvider } from './context/LibraryContext'
import { LanguageProvider } from './context/LanguageContext'
import Layout from './components/Layout'
import Login from './pages/Login'
import Home from './pages/Home'
import Search from './pages/Search'
import Library from './pages/Library'
import LikedSongs from './pages/LikedSongs'
import Downloads from './pages/Downloads'
import AlbumPage from './pages/Album'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth()
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<Home />} />
        <Route path="/search" element={<Search />} />
        <Route path="/library" element={<Library />} />
        <Route path="/liked" element={<LikedSongs />} />
        <Route path="/downloads" element={<Downloads />} />
        <Route path="/album/:id" element={<AlbumPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <LanguageProvider>
          <LibraryProvider>
            <PlayerProvider>
              <AppRoutes />
            </PlayerProvider>
          </LibraryProvider>
        </LanguageProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
