import { Heart, Home, Search, Download, UserCircle2 } from 'lucide-react'
import { NavLink, useLocation } from 'react-router-dom'

const navItems = [
  { to: '/', icon: Home, label: 'Home' },
  { to: '/search', icon: Search, label: 'Search' },
  { to: '/liked', icon: Heart, label: 'Liked' },
  { to: '/downloads', icon: Download, label: 'Downloaded' },
  { to: '/profile', icon: UserCircle2, label: 'Profile' },
]

export default function MobileBottomNav() {
  const location = useLocation()

  return (
    <nav className="mobile-bottom-nav" aria-label="Mobile navigation">
      {navItems.map(({ to, icon: Icon, label }) => {
        const isHome = to === '/'
        const isActive = isHome
          ? location.pathname === '/' || location.pathname === '/top-picks'
          : location.pathname === to

        return (
          <NavLink
            key={to}
            to={to}
            className={`mobile-bottom-link ${isActive ? 'active' : ''}`}
            aria-current={isActive ? 'page' : undefined}
          >
            <Icon size={20} />
            <span>{label}</span>
          </NavLink>
        )
      })}
    </nav>
  )
}
