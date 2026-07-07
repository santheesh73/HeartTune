import { useEffect, useId, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Camera, LogOut, PencilLine, User2, Settings as SettingsIcon, Play } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useRecentlyPlayed } from '../hooks/useRecentlyPlayed'
import { getArtistNames } from '../api/saavn'
import ArtworkImage from '../components/ArtworkImage'
import { getArtworkUrl } from '../lib/utils/artwork'
import type { Song } from '../types'

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

export default function Profile() {
  const { user, logout, updateProfileDetails } = useAuth()
  const { recentlyPlayed } = useRecentlyPlayed(100) // fetch up to 100 for stats
  const avatarFileInputId = useId()
  const defaultAvatars = useMemo(
    () => ['/avatars/avatar-1.png', '/avatars/avatar-2.png', '/avatars/avatar-3.png', '/avatars/avatar-4.png'],
    []
  )

  const [name, setName] = useState(user?.name || '')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    setName(user?.name || '')
    setAvatarUrl(getEditableAvatarUrl(user?.avatar))
  }, [user?.avatar, user?.name])

  const avatarPreview =
    avatarUrl.trim() || user?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.name || 'HeartTune'}`

  const handleAvatarFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setError('Please choose an image file')
      event.target.value = ''
      return
    }

    if (file.size > 1024 * 1024) {
      setError('Please choose an image smaller than 1 MB')
      event.target.value = ''
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : ''
      if (!result.startsWith('data:image/')) {
        setError('Unable to read that image file')
        return
      }

      setAvatarUrl(result)
      setError('')
    }
    reader.onerror = () => {
      setError('Unable to read that image file')
    }
    reader.readAsDataURL(file)
    event.target.value = ''
  }

  const handleSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmedAvatar = avatarUrl.trim()

    if (trimmedAvatar && !isValidAvatarValue(trimmedAvatar)) {
      setError('Choose one of the default avatars or pick an image from your device')
      return
    }

    setSaving(true)
    setError('')
    setSuccess('')

    const result = await updateProfileDetails({
      name,
      avatarUrl: trimmedAvatar,
    })

    if (result.error) {
      setError(result.error)
      setSaving(false)
      return
    }

    setSuccess('Profile updated')
    setSaving(false)
  }

  // Compute stats
  const topStats = useMemo(() => {
    if (!recentlyPlayed.length) return { topSong: null, topArtist: null, totalPlays: 0 }
    
    const songCounts: Record<string, { count: number; song: Song }> = {}
    const artistCounts: Record<string, { count: number; name: string }> = {}
    
    recentlyPlayed.forEach(entry => {
      const songId = entry.song.id
      if (!songCounts[songId]) songCounts[songId] = { count: 0, song: entry.song }
      songCounts[songId].count++
      
      const artistName = getArtistNames(entry.song)
      if (artistName) {
        if (!artistCounts[artistName]) artistCounts[artistName] = { count: 0, name: artistName }
        artistCounts[artistName].count++
      }
    })
    
    const topSong = Object.values(songCounts).sort((a, b) => b.count - a.count)[0]
    const topArtist = Object.values(artistCounts).sort((a, b) => b.count - a.count)[0]
    
    return {
      topSong,
      topArtist,
      totalPlays: recentlyPlayed.length
    }
  }, [recentlyPlayed])

  return (
    <div className="page profile-page">
      <motion.header
        className="page-header profile-page-header"
        initial={{ opacity: 0, y: -18 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1>Profile</h1>
        <p>Change your avatar and edit the name shown across the app.</p>
      </motion.header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-32">
        <motion.div
          className="lg:col-span-2"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <form
            className="profile-editor-card"
            onSubmit={handleSave}
          >
        <div className="profile-editor-top">
          <div className="profile-avatar-stack">
            <div className="profile-avatar-shell">
              <img src={avatarPreview} alt={user?.name || 'Profile'} className="profile-avatar-preview" />
              <span className="profile-avatar-badge">
                <Camera size={14} />
              </span>
            </div>
            <label className="profile-avatar-upload" htmlFor={avatarFileInputId}>
              Choose photo
            </label>
            <input
              id={avatarFileInputId}
              type="file"
              accept="image/*"
              className="avatar-file-input"
              onChange={handleAvatarFileChange}
            />
          </div>

          <div className="profile-editor-copy">
            <span className="profile-editor-kicker">Your account</span>
            <h2>{user?.name || 'HeartTune User'}</h2>
            <p>{user?.email}</p>
          </div>
        </div>

        <div className="profile-form-grid">
          <label className="profile-field">
            <span>
              <User2 size={16} />
              Display name
            </span>
            <input
              type="text"
              value={name}
              onChange={(event) => {
                setName(event.target.value)
                setSuccess('')
              }}
              placeholder="Enter your name"
              maxLength={40}
            />
          </label>

          <div className="profile-field profile-readonly-field">
            <span>
              <PencilLine size={16} />
              Email
            </span>
            <div className="profile-readonly-value">{user?.email || 'No email available'}</div>
          </div>
        </div>

        <div className="avatar-defaults profile-avatar-defaults">
          {defaultAvatars.map((defaultAvatar, index) => (
            <button
              key={defaultAvatar}
              type="button"
              className={`avatar-default-option ${avatarUrl.trim() === defaultAvatar ? 'selected' : ''}`}
              onClick={() => {
                setAvatarUrl(defaultAvatar)
                setError('')
                setSuccess('')
              }}
              aria-label={`Choose default avatar ${index + 1}`}
            >
              <img src={defaultAvatar} alt="" />
            </button>
          ))}
        </div>

        <div className="profile-editor-actions">
          <button type="submit" className="avatar-save-btn profile-save-btn" disabled={saving}>
            {saving ? 'Saving...' : 'Save profile'}
          </button>
          <button
            type="button"
            className="avatar-reset-btn"
            disabled={saving}
            onClick={() => {
              setAvatarUrl('')
              setError('')
              setSuccess('')
            }}
          >
            Use default avatar
          </button>
          <Link
            to="/settings"
            className="flex items-center justify-center gap-2 px-6 py-3 rounded-full font-bold bg-white/10 hover:bg-white/20 text-white transition mt-4 md:mt-0 md:ml-auto"
          >
            <SettingsIcon size={16} />
            Settings
          </Link>
          <button
            type="button"
            className="profile-logout-btn"
            onClick={() => {
              void logout()
            }}
          >
            <LogOut size={16} />
            Log out
          </button>
        </div>

        {error ? <p className="avatar-error">{error}</p> : null}
        {!error && success ? <p className="profile-success">{success}</p> : null}
      </form>
      </motion.div>

      <motion.div
        className="space-y-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="bg-white/5 border border-white/5 rounded-2xl p-6 shadow-xl">
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <Play size={20} className="text-[var(--color-primary)]" />
            Top Song
          </h2>
          {topStats.topSong ? (
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-md overflow-hidden bg-white/10 flex-shrink-0 shadow-lg">
                <ArtworkImage src={getArtworkUrl(topStats.topSong.song.image, '150x150')} alt="" className="w-full h-full object-cover" sizes="64px" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-white truncate text-lg">{topStats.topSong.song.name}</h3>
                <p className="text-white/50 truncate">{getArtistNames(topStats.topSong.song)}</p>
                <p className="text-xs text-[var(--color-primary)] font-medium mt-1">{topStats.topSong.count} plays recently</p>
              </div>
            </div>
          ) : (
            <p className="text-white/50 text-sm">Not enough data to determine your top song yet.</p>
          )}
        </div>

        <div className="bg-white/5 border border-white/5 rounded-2xl p-6 shadow-xl">
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <User2 size={20} className="text-[var(--color-primary)]" />
            Top Artist
          </h2>
          {topStats.topArtist ? (
            <div className="flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-white truncate text-2xl">{topStats.topArtist.name}</h3>
                <p className="text-sm text-[var(--color-primary)] font-medium mt-1">{topStats.topArtist.count} plays recently</p>
              </div>
            </div>
          ) : (
            <p className="text-white/50 text-sm">Not enough data to determine your top artist yet.</p>
          )}
        </div>
      </motion.div>
      </div>
    </div>
  )
}
