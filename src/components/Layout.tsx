import { useEffect, useState } from 'react'
import { Outlet, Link } from 'react-router-dom'
import Sidebar from './Sidebar'
import PlayerBar from './PlayerBar'
import InstallButton from './InstallButton'
import MobileBottomNav from './MobileBottomNav'
import { useAuth } from '../hooks/useAuth'
import { usePlayer } from '../context/PlayerContext'
import { useIsMobile } from '../hooks/useIsMobile'

export default function Layout() {
  const isMobile = useIsMobile()
  const { user } = useAuth()
  const { currentSong } = usePlayer()
  const [navOpen, setNavOpen] = useState(false)

  useEffect(() => {
    const closeOnDesktop = () => {
      if (window.innerWidth > 900) setNavOpen(false)
    }

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setNavOpen(false)
    }

    window.addEventListener('resize', closeOnDesktop)
    window.addEventListener('keydown', closeOnEscape)

    return () => {
      window.removeEventListener('resize', closeOnDesktop)
      window.removeEventListener('keydown', closeOnEscape)
    }
  }, [])

  useEffect(() => {
    document.body.style.overflow = navOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [navOpen])

  return (
    <div className={`app-layout ${isMobile ? 'mobile-shell' : ''} ${currentSong ? 'mobile-player-active' : ''}`}>
      <header className="mobile-topbar">
        <Link to="/" className="mobile-topbar-brand" aria-label="Go to home page">
          <img src="/favicon.png" alt="HeartTune logo" className="mobile-brand-icon" />
          <div className="mobile-topbar-copy">
            <span className="mobile-topbar-kicker">Music streaming</span>
            <strong>HeartTune</strong>
          </div>
        </Link>
        <div className="mobile-topbar-actions">
          {isMobile ? (
            <Link to="/profile" className="mobile-profile-link" aria-label="Open profile">
              <img
                src={user?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.name || 'HeartTune'}`}
                alt={user?.name || 'Profile'}
                className="mobile-profile-avatar"
              />
            </Link>
          ) : (
            <InstallButton className="mobile-install-btn" compact />
          )}
        </div>
      </header>

      {!isMobile ? <Sidebar navOpen={navOpen} onNavigate={() => setNavOpen(false)} /> : null}
      {!isMobile && navOpen ? <button className="sidebar-backdrop" onClick={() => setNavOpen(false)} /> : null}

      <main className="main-content">
        <Outlet />
      </main>
      <PlayerBar />
      {isMobile ? <MobileBottomNav /> : null}
    </div>
  )
}
