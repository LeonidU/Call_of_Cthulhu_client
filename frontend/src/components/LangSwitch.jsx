import React from 'react'
import { getLang, setLang } from '../i18n'
import { apiFetch, isLoggedIn } from '../api'

export default function LangSwitch({ compact }) {
  const current = getLang()

  async function change(lang) {
    if (lang === current) return
    setLang(lang)
    // Persist server-side when logged in (best effort)
    if (isLoggedIn()) {
      try {
        await apiFetch('/api/auth/language', { method: 'PATCH', body: { language: lang } })
      } catch {}
    }
    window.location.reload()
  }

  return (
    <div style={{ display: 'inline-flex', gap: 2, alignItems: 'center' }}>
      {['en', 'ru'].map(l => (
        <button
          key={l}
          onClick={() => change(l)}
          style={{
            padding: compact ? '2px 6px' : '3px 9px',
            fontSize: compact ? 10 : 11,
            fontFamily: 'var(--font-mono)',
            borderRadius: 3,
            cursor: 'pointer',
            border: `1px solid ${current === l ? 'var(--gold)' : 'var(--border)'}`,
            background: current === l ? 'var(--gold-dim)' : 'transparent',
            color: current === l ? 'var(--bg-void)' : 'var(--text-dim)',
            transition: 'all 0.15s',
          }}
          title={l === 'en' ? 'English' : 'Русский'}
        >
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  )
}
