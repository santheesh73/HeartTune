import { useEffect, useState } from 'react'
import { Menu, X } from 'lucide-react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import PlayerBar from './PlayerBar'

export default function Layout() {
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
    <div className="app-layout">
      <header className="mobile-topbar">
        <button
          type="button"
          className="mobile-menu-btn"
          onClick={() => setNavOpen((open) => !open)}
          aria-label={navOpen ? 'Close navigation menu' : 'Open navigation menu'}
          aria-expanded={navOpen}
        >
          {navOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
        <div className="mobile-topbar-brand">
          <span className="mobile-topbar-kicker">Music streaming</span>
          <strong>HeartWave</strong>
        </div>
      </header>

      <Sidebar navOpen={navOpen} onNavigate={() => setNavOpen(false)} />
      {navOpen ? <button className="sidebar-backdrop" onClick={() => setNavOpen(false)} /> : null}

      <main className="main-content">
        <Outlet />
      </main>
      <PlayerBar />
    </div>
  )
}
