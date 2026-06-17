import { useEffect, useId, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Camera,
  Home,
  Search,
  Library,
  Heart,
  Download,
  LogOut,
  Music2,
} from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import InstallButton from './InstallButton'

const navItems = [
  { to: '/', icon: Home, label: 'Home' },
  { to: '/search', icon: Search, label: 'Search' },
  { to: '/library', icon: Library, label: 'Your Library' },
  { to: '/liked', icon: Heart, label: 'Liked Songs' },
  { to: '/downloads', icon: Download, label: 'Downloads' },
]

interface SidebarProps {
  navOpen?: boolean
  onNavigate?: () => void
}

function getEditableAvatarUrl(avatar?: string) {
  if (!avatar || avatar.includes('api.dicebear.com')) return ''
  return avatar
}

function isValidAvatarValue(value: string) {
  if (value.startsWith('data:image/')) return true
  if (value.startsWith('/avatars/')) return true

  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

export default function Sidebar({ navOpen = false, onNavigate }: SidebarProps) {
  const { user, logout, updateAvatar } = useAuth()
  const avatarFileInputId = useId()
  const [avatarUrl, setAvatarUrl] = useState('')
  const [avatarError, setAvatarError] = useState('')
  const [editingAvatar, setEditingAvatar] = useState(false)
  const [savingAvatar, setSavingAvatar] = useState(false)

  const defaultAvatars = [
    '/avatars/avatar-1.png',
    '/avatars/avatar-2.png',
    '/avatars/avatar-3.png',
    '/avatars/avatar-4.png',
  ]
  const avatarPreview = avatarUrl.trim() || user?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.name || 'HeartTune'}`

  useEffect(() => {
    setAvatarUrl(getEditableAvatarUrl(user?.avatar))
  }, [user?.avatar])

  const handleAvatarSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const trimmedUrl = avatarUrl.trim()
    if (trimmedUrl && !isValidAvatarValue(trimmedUrl)) {
      setAvatarError('Choose one of the default avatars or pick an image from your device')
      return
    }

    setSavingAvatar(true)
    setAvatarError('')

    const result = await updateAvatar(trimmedUrl)

    if (result.error) {
      setAvatarError(result.error)
      setSavingAvatar(false)
      return
    }

    setEditingAvatar(false)
    setSavingAvatar(false)
  }

  const handleAvatarFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setAvatarError('Please choose an image file')
      event.target.value = ''
      return
    }

    if (file.size > 1024 * 1024) {
      setAvatarError('Please choose an image smaller than 1 MB')
      event.target.value = ''
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : ''
      if (!result.startsWith('data:image/')) {
        setAvatarError('Unable to read that image file')
        return
      }

      setAvatarUrl(result)
      setAvatarError('')
    }
    reader.onerror = () => {
      setAvatarError('Unable to read that image file')
    }
    reader.readAsDataURL(file)
    event.target.value = ''
  }

  return (
    <aside className={`sidebar ${navOpen ? 'open' : ''}`} aria-hidden={!navOpen && undefined}>
      <div className="sidebar-brand">
        <motion.div
          className="brand-icon"
          animate={{ scale: [1, 1.08, 1] }}
          transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut' }}
        >
          <img src="/favicon.png" alt="HeartTune Logo" />
        </motion.div>
        <h1 className="brand-name">HeartTune</h1>
      </div>

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
              <button
                type="button"
                className="avatar-trigger"
                onClick={() => {
                  setEditingAvatar((current) => !current)
                  setAvatarError('')
                }}
                title="Change avatar"
              >
                <img
                  src={user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.name}`}
                  alt={user.name}
                  className="user-avatar"
                />
                <span className="avatar-edit-badge">
                  <Camera size={12} />
                </span>
              </button>
              <div className="user-info">
                <span className="user-name">{user.name}</span>
                <span className="user-email">{user.email}</span>
                <button
                  type="button"
                  className="avatar-edit-link"
                  onClick={() => {
                    setEditingAvatar((current) => !current)
                    setAvatarError('')
                  }}
                >
                  {editingAvatar ? 'Close avatar editor' : 'Edit avatar'}
                </button>
              </div>
            </div>

            {editingAvatar ? (
              <form className="avatar-form" onSubmit={handleAvatarSubmit}>
                <div className="avatar-preview-panel">
                  <img src={avatarPreview} alt={`${user.name} avatar preview`} className="avatar-preview-image" />
                  <div className="avatar-preview-copy">
                    <span className="avatar-form-label">Avatar preview</span>
                    <span className="avatar-preview-hint">Pick a file from your device or choose a default avatar.</span>
                  </div>
                </div>
                <div className="avatar-file-row">
                  <label className="avatar-file-btn" htmlFor={avatarFileInputId}>
                    Choose from device
                  </label>
                  <input
                    id={avatarFileInputId}
                    type="file"
                    accept="image/*"
                    className="avatar-file-input"
                    onChange={handleAvatarFileChange}
                  />
                  <span className="avatar-file-hint">PNG, JPG, WEBP up to 1 MB</span>
                </div>
                <div className="avatar-defaults">
                  {defaultAvatars.map((defaultAvatar, index) => (
                    <button
                      key={defaultAvatar}
                      type="button"
                      className={`avatar-default-option ${avatarUrl.trim() === defaultAvatar ? 'selected' : ''}`}
                      onClick={() => {
                        setAvatarUrl(defaultAvatar)
                        setAvatarError('')
                      }}
                      aria-label={`Choose default avatar ${index + 1}`}
                    >
                      <img src={defaultAvatar} alt="" />
                    </button>
                  ))}
                </div>
                <div className="avatar-actions">
                  <button type="submit" className="avatar-save-btn" disabled={savingAvatar}>
                    {savingAvatar ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    type="button"
                    className="avatar-reset-btn"
                    disabled={savingAvatar}
                    onClick={() => {
                      setAvatarUrl('')
                      setAvatarError('')
                    }}
                  >
                    Use default
                  </button>
                </div>
                {avatarError ? <p className="avatar-error">{avatarError}</p> : null}
              </form>
            ) : null}
          </div>
          <button
            className="logout-btn"
            onClick={() => {
              void logout()
              onNavigate?.()
            }}
            title="Log out"
          >
            <LogOut size={18} />
          </button>
        </div>
      ) : null}
    </aside>
  )
}
