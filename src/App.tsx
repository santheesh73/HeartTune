'use client'

import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { PlayerProvider } from './context/PlayerContext'
import { LibraryProvider } from './context/LibraryContext'
import { LanguageProvider } from './context/LanguageContext'
import { ThemeProvider } from './context/ThemeContext'
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
import Settings from './views/Settings'
import ForgotPassword from './views/ForgotPassword'
import ResetPassword from './views/ResetPassword'
import VerifyEmail from './views/VerifyEmail'
import PlaylistDetail from './views/PlaylistDetail'
import ArtistPage from './views/Artist'
import { useAuth } from './hooks/useAuth'
import AppLogoLoader from './components/AppLogoLoader'

function ProtectedPage({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return <AppLogoLoader />
  }

  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace state={{ from: location.pathname }} />
}

function PublicOnlyPage({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth()

  return isAuthenticated ? <Navigate to="/" replace /> : <>{children}</>
}

function isPasswordRecoveryUrl() {
  if (typeof window === 'undefined') return false

  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''))
  const params = new URLSearchParams(window.location.search)
  const type = hash.get('type') || params.get('type')

  return (
    type === 'recovery' ||
    Boolean(hash.get('access_token') && hash.get('refresh_token')) ||
    Boolean(params.get('token_hash') && type === 'recovery')
  )
}

function AppRoutes() {
  const location = useLocation()
  const shouldShowResetPassword =
    location.pathname === '/' && isPasswordRecoveryUrl()

  if (shouldShowResetPassword) {
    return (
      <Navigate
        to={{
          pathname: '/reset-password',
          search: location.search,
          hash: location.hash,
        }}
        replace
      />
    )
  }

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
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/verify-email" element={<VerifyEmail />} />
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
        <Route path="/settings" element={<Settings />} />
        <Route path="/playlists" element={<Navigate to="/library" replace />} />
        <Route path="/playlist/:id" element={<PlaylistDetail />} />
        <Route path="/album/:id" element={<AlbumPage />} />
        <Route path="/artist/:id" element={<ArtistPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <LanguageProvider>
            <LibraryProvider>
              <PlayerProvider>
                <AppRoutes />
              </PlayerProvider>
            </LibraryProvider>
          </LanguageProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  )
}
