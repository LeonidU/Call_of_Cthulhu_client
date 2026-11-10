import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiFetch, getUser, logout, saveAuth } from '../api'
import { t, getLang } from '../i18n'
import LangSwitch from '../components/LangSwitch'

export default function PendingPage() {
  const user = getUser()
  const navigate = useNavigate()
  const lang = getLang()
  const [checking, setChecking] = useState(false)

  async function checkStatus() {
    setChecking(true)
    try {
      const data = await apiFetch('/api/auth/me')
      if (data.is_approved || data.is_admin) {
        // Re-login to refresh token data
        const stored = getUser()
        stored.is_approved = data.is_approved
        stored.is_admin = data.is_admin
        localStorage.setItem('cthulhu_user', JSON.stringify(stored))
        navigate('/parties')
      }
    } catch {
      // still pending
    }
    setChecking(false)
  }

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <div className="page-center" style={{ flexDirection: 'column', gap: 24 }}>
      <div className="card fade-in" style={{ width: '100%', maxWidth: 440, textAlign: 'center' }}>
        {/* Hourglass sigil */}
        <svg width="48" height="48" viewBox="0 0 48 48" style={{ margin: '0 auto 16px', display: 'block', opacity: 0.5 }}>
          <circle cx="24" cy="24" r="22" fill="none" stroke="var(--gold-dim)" strokeWidth="1" />
          <path d="M16 12 L32 12 L28 24 L32 36 L16 36 L20 24 Z" fill="none" stroke="var(--gold-dim)" strokeWidth="1.5" />
          <circle cx="24" cy="28" r="2" fill="var(--gold-dim)" opacity="0.6" />
        </svg>

        <h1 style={{ fontSize: 20, marginBottom: 8 }}>{t('awaitingApproval', lang)}</h1>
        <p style={{ color: 'var(--text-faded)', fontSize: 15, marginBottom: 8, lineHeight: 1.6 }}>
          <strong style={{ color: 'var(--gold)' }}>{user?.display_name}</strong> {t('pendingMsg', lang)}
        </p>
        <p style={{ color: 'var(--text-dim)', fontSize: 13, marginBottom: 24 }}>
          {t('pendingHint', lang)}
        </p>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <button className="btn btn-primary" onClick={checkStatus} disabled={checking}>
            {checking ? t('checking', lang) : t('checkStatus', lang)}
          </button>
          <button className="btn btn-sm" onClick={handleLogout}>
            {t('logout', lang)}
          </button>
        </div>
      </div>

      <LangSwitch />
    </div>
  )
}
