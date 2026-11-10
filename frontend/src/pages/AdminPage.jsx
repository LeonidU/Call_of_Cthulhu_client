import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiFetch, getUser, logout } from '../api'
import { t, getLang } from '../i18n'
import LangSwitch from '../components/LangSwitch'

export default function AdminPage() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const currentUser = getUser()
  const lang = getLang()

  useEffect(() => { loadUsers() }, [])

  async function loadUsers() {
    try {
      const data = await apiFetch('/api/admin/users')
      setUsers(data)
    } catch (err) {
      setError(err.message)
    }
    setLoading(false)
  }

  async function handleApprove(userId, approved) {
    try {
      await apiFetch('/api/admin/approve', {
        method: 'POST',
        body: { user_id: userId, approved },
      })
      loadUsers()
    } catch (err) {
      alert(err.message)
    }
  }

  async function handleToggleAdmin(userId, makeAdmin) {
    if (!window.confirm(makeAdmin ? 'Grant admin privileges?' : 'Revoke admin privileges?')) return
    try {
      await apiFetch('/api/admin/toggle-admin', {
        method: 'POST',
        body: { user_id: userId, approved: makeAdmin },
      })
      loadUsers()
    } catch (err) {
      alert(err.message)
    }
  }

  const pending = users.filter(u => !u.is_approved && !u.is_admin)
  const approved = users.filter(u => u.is_approved || u.is_admin)

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '32px 20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 24, marginBottom: 4 }}>{t('administration', lang)}</h1>
          <p style={{ color: 'var(--text-faded)', fontSize: 13 }}>
            {t('userManagement', lang)}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <LangSwitch compact />
          <button className="btn btn-sm" onClick={() => navigate('/parties')}>
            ← {t('game', lang)}
          </button>
          <button className="btn btn-sm" onClick={() => { logout(); navigate('/login') }}>
            {t('logout', lang)}
          </button>
        </div>
      </div>

      {error && <p className="error-msg" style={{ marginBottom: 16 }}>{error}</p>}

      {/* Pending Approvals */}
      <div style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 16, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
          {t('pendingApproval', lang)}
          {pending.length > 0 && (
            <span style={{
              fontSize: 11, padding: '2px 8px', borderRadius: 10,
              background: 'var(--blood)', color: 'var(--text-parchment)',
              fontFamily: 'var(--font-mono)',
            }}>
              {pending.length}
            </span>
          )}
        </h2>

        {loading ? (
          <p style={{ color: 'var(--text-dim)' }}>Loading...</p>
        ) : pending.length === 0 ? (
          <div className="card" style={{ padding: 24, textAlign: 'center' }}>
            <p style={{ color: 'var(--text-dim)', fontSize: 14 }}>{t('noPending', lang)}</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {pending.map(u => (
              <div key={u.id} className="card fade-in" style={{
                padding: '14px 20px', display: 'flex', justifyContent: 'space-between',
                alignItems: 'center', border: '1px solid var(--gold-dim)',
              }}>
                <div>
                  <strong style={{ color: 'var(--text-parchment)', fontSize: 15 }}>{u.display_name}</strong>
                  <span style={{
                    fontSize: 12, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)',
                    marginLeft: 10,
                  }}>
                    @{u.username}
                  </span>
                  {u.created_at && (
                    <span style={{ fontSize: 11, color: 'var(--text-dim)', marginLeft: 10 }}>
                      {new Date(u.created_at).toLocaleDateString()}
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    className="btn btn-sm btn-primary"
                    onClick={() => handleApprove(u.id, true)}
                    style={{ fontSize: 11 }}
                  >
                    {t('approve', lang)}
                  </button>
                  <button
                    className="btn btn-sm btn-danger"
                    onClick={() => handleApprove(u.id, false)}
                    style={{ fontSize: 11 }}
                  >
                    {t('reject', lang)}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* All Users */}
      <h2 style={{ fontSize: 16, marginBottom: 12 }}>
        {t('allUsers', lang)} ({approved.length})
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {approved.map(u => (
          <div key={u.id} style={{
            display: 'grid', gridTemplateColumns: '1fr auto auto auto',
            gap: 12, alignItems: 'center',
            padding: '10px 16px', background: 'var(--bg-surface)',
            borderRadius: 'var(--radius)', border: '1px solid var(--border)',
          }}>
            <div>
              <strong style={{ fontSize: 14 }}>{u.display_name}</strong>
              <span style={{
                fontSize: 12, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)',
                marginLeft: 8,
              }}>
                @{u.username}
              </span>
            </div>

            {/* Role badges */}
            <div style={{ display: 'flex', gap: 4 }}>
              {u.is_admin && (
                <span style={{
                  fontSize: 9, padding: '2px 6px', borderRadius: 3,
                  background: 'var(--blood)', color: 'var(--text-parchment)',
                  fontFamily: 'var(--font-mono)', letterSpacing: '0.08em',
                }}>
                  ADMIN
                </span>
              )}
              <span style={{
                fontSize: 9, padding: '2px 6px', borderRadius: 3,
                background: u.is_approved ? 'var(--eldritch-green)' : 'var(--gold-dim)',
                color: 'var(--bg-void)',
                fontFamily: 'var(--font-mono)', letterSpacing: '0.08em',
              }}>
                {u.is_approved ? t('approved', lang) : t('pending', lang)}
              </span>
            </div>

            {/* Admin toggle */}
            {u.id !== currentUser?.id && !u.is_admin && (
              <button
                className="btn btn-sm"
                onClick={() => handleToggleAdmin(u.id, true)}
                style={{ fontSize: 9, padding: '3px 8px' }}
              >
                {t('makeAdmin', lang)}
              </button>
            )}
            {u.id !== currentUser?.id && u.is_admin && (
              <button
                className="btn btn-sm btn-danger"
                onClick={() => handleToggleAdmin(u.id, false)}
                style={{ fontSize: 9, padding: '3px 8px' }}
              >
                {t('removeAdmin', lang)}
              </button>
            )}
            {u.id === currentUser?.id && (
              <span style={{ fontSize: 11, color: 'var(--text-dim)', fontStyle: 'italic' }}>{t('you', lang)}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
