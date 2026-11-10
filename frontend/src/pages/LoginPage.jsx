import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiFetch, saveAuth } from '../api'
import { t, getLang } from '../i18n'
import LangSwitch from '../components/LangSwitch'

export default function LoginPage() {
  const [isRegister, setIsRegister] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const lang = getLang()

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const endpoint = isRegister ? '/api/auth/register' : '/api/auth/login'
      const body = isRegister
        ? { username, password, display_name: displayName }
        : { username, password }
      const data = await apiFetch(endpoint, { method: 'POST', body })
      saveAuth(data)
      if (data.is_admin) {
        navigate('/admin')
      } else if (!data.is_approved) {
        navigate('/pending')
      } else {
        navigate('/parties')
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page-center" style={{ flexDirection: 'column', gap: 24 }}>
      {/* Decorative sigil */}
      <div style={{ textAlign: 'center', marginBottom: 8 }}>
        <svg width="64" height="64" viewBox="0 0 64 64" style={{ opacity: 0.6 }}>
          <circle cx="32" cy="32" r="28" fill="none" stroke="var(--gold-dim)" strokeWidth="1.5" />
          <circle cx="32" cy="32" r="20" fill="none" stroke="var(--gold-dim)" strokeWidth="1" strokeDasharray="4 3" />
          <polygon points="32,8 38,24 56,24 42,34 47,50 32,40 17,50 22,34 8,24 26,24"
            fill="none" stroke="var(--gold-dim)" strokeWidth="1" opacity="0.5" />
          <circle cx="32" cy="32" r="4" fill="var(--gold-dim)" opacity="0.4" />
        </svg>
      </div>

      <div className="card fade-in" style={{ width: '100%', maxWidth: 400 }}>
        <h1 style={{ textAlign: 'center', fontSize: 22, marginBottom: 4 }}>
          {t('appTitle', lang)}
        </h1>
        <p style={{
          textAlign: 'center', fontFamily: 'var(--font-mono)',
          fontSize: 11, color: 'var(--text-dim)', letterSpacing: '0.15em',
          textTransform: 'uppercase', marginBottom: 28,
        }}>
          {t('appSubtitle', lang)}
        </p>

        <form onSubmit={handleSubmit}>
          {isRegister && (
            <div className="field">
              <label>{t('investigatorName', lang)}</label>
              <input
                type="text"
                placeholder={t('investigatorNamePh', lang)}
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                required
              />
            </div>
          )}
          <div className="field">
            <label>{t('username', lang)}</label>
            <input
              type="text"
              placeholder={t('usernamePh', lang)}
              value={username}
              onChange={e => setUsername(e.target.value)}
              required
              autoComplete="username"
            />
          </div>
          <div className="field">
            <label>{t('password', lang)}</label>
            <input
              type="password"
              placeholder={t('passwordPh', lang)}
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete={isRegister ? "new-password" : "current-password"}
            />
          </div>

          {error && <p className="error-msg">{error}</p>}

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ width: '100%', marginTop: 12 }}
          >
            {loading ? t('loading', lang) : isRegister ? t('register', lang) : t('enter', lang)}
          </button>
        </form>

        <hr className="divider" />

        <p style={{ textAlign: 'center', fontSize: 14, color: 'var(--text-faded)' }}>
          {isRegister ? t('haveAccount', lang) : t('noAccount', lang)}{' '}
          <a
            href="#"
            onClick={e => { e.preventDefault(); setIsRegister(!isRegister); setError('') }}
          >
            {isRegister ? t('signIn', lang) : t('register', lang)}
          </a>
        </p>
      </div>

      <LangSwitch />
    </div>
  )
}
