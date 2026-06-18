'use client'

import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { PlayerProvider } from './context/PlayerContext'
import { LibraryProvider } from './context/LibraryContext'
import { LanguageProvider } from './context/LanguageContext'
import Layout from './components/Layout'
import Login from './views/Login'
import Home from './views/Home'
import Search from './views/Search'
import Library from './views/Library'
import LikedSongs from './views/LikedSongs'
import Downloads from './views/Downloads'
import AlbumPage from './views/Album'
import TopPicks from './views/TopPicks'
import Profile from './views/Profile'
import { useAuth } from './hooks/useAuth'

function ProtectedPage({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return <div className="page"><div className="skeleton-hero" /></div>
  }

  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace state={{ from: location.pathname }} />
}

function PublicOnlyPage({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth()

  return isAuthenticated ? <Navigate to="/" replace /> : <>{children}</>
}

function AppRoutes() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <PublicOnlyPage>
            <Login />
          </PublicOnlyPage>
        }
      />
      <Route
        element={
          <ProtectedPage>
            <Layout />
          </ProtectedPage>
        }
      >
        <Route path="/" element={<Home />} />
        <Route path="/top-picks" element={<TopPicks />} />
        <Route path="/search" element={<Search />} />
        <Route
          path="/library"
          element={
            <Library />
          }
        />
        <Route
          path="/liked"
          element={
            <LikedSongs />
          }
        />
        <Route
          path="/downloads"
          element={
            <Downloads />
          }
        />
        <Route path="/profile" element={<Profile />} />
        <Route path="/playlists" element={<Navigate to="/library" replace />} />
        <Route path="/playlists/:id" element={<Navigate to="/library" replace />} />
        <Route path="/album/:id" element={<AlbumPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/login" replace />} />
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
