import { Link, NavLink } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Home, Search, Library, Heart, Download, UserCircle2 } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import InstallButton from './InstallButton'

const navItems = [
  { to: '/', icon: Home, label: 'Home' },
  { to: '/search', icon: Search, label: 'Search' },
  { to: '/library', icon: Library, label: 'Your Library' },
  { to: '/liked', icon: Heart, label: 'Liked Songs' },
  { to: '/downloads', icon: Download, label: 'Downloads' },
  { to: '/profile', icon: UserCircle2, label: 'Profile' },
]

interface SidebarProps {
  navOpen?: boolean
  onNavigate?: () => void
}

export default function Sidebar({ navOpen = false, onNavigate }: SidebarProps) {
  const { user } = useAuth()

  return (
    <aside className={`sidebar ${navOpen ? 'open' : ''}`} aria-hidden={!navOpen && undefined}>
      <Link to="/" className="sidebar-brand" onClick={onNavigate} aria-label="Go to home page">
        <motion.div
          className="brand-icon"
          animate={{ scale: [1, 1.08, 1] }}
          transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut' }}
        >
          <img src="/favicon.png" alt="HeartTune Logo" />
        </motion.div>
        <h1 className="brand-name">HeartTune</h1>
      </Link>

      <nav className="sidebar-nav">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            onClick={onNavigate}
          >
            <Icon size={22} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <InstallButton className="sidebar-install-btn" />

      {user ? (
        <div className="sidebar-footer">
          <div className="sidebar-profile">
            <div className="user-card">
              <Link to="/profile" className="user-card-link" onClick={onNavigate} aria-label="Open profile">
                <img
                  src={user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.name}`}
                  alt={user.name}
                  className="user-avatar"
                />
                <div className="user-info">
                  <span className="user-name">{user.name}</span>
                  <span className="user-email">{user.email}</span>
                </div>
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </aside>
  )
}
