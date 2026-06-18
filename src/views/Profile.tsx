import { useEffect, useId, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Camera, LogOut, PencilLine, User2 } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'

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

      <motion.form
        className="profile-editor-card"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
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
      </motion.form>
    </div>
  )
}
