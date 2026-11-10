import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiFetch, getUser, logout } from '../api'
import { t, getLang } from '../i18n'
import LangSwitch from '../components/LangSwitch'

export default function PartiesPage() {
  const [parties, setParties] = useState([])
  const [newName, setNewName] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()
  const user = getUser()
  const lang = getLang()

  useEffect(() => { loadParties() }, [])

  async function loadParties() {
    try {
      const data = await apiFetch('/api/parties')
      setParties(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function createParty(e) {
    e.preventDefault()
    if (!newName.trim()) return
    try {
      await apiFetch('/api/parties', { method: 'POST', body: { name: newName } })
      setNewName('')
      loadParties()
    } catch (err) {
      setError(err.message)
    }
  }

  async function joinParty(e) {
    e.preventDefault()
    if (!inviteCode.trim()) return
    try {
      await apiFetch('/api/parties/join', { method: 'POST', body: { invite_code: inviteCode } })
      setInviteCode('')
      loadParties()
    } catch (err) {
      setError(err.message)
    }
  }

  async function enterParty(party) {
    // Check if character exists
    try {
      const char = await apiFetch(`/api/characters/my/${party.id}`)
      const isMaster = party.members.find(m => m.user_id === user.id)?.role === 'master'
      if (char || isMaster) {
        navigate(`/party/${party.id}`)
      } else {
        navigate(`/party/${party.id}/create-character`)
      }
    } catch {
      navigate(`/party/${party.id}/create-character`)
    }
  }

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: '40px 20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 24, marginBottom: 4 }}>{t('yourExpeditions', lang)}</h1>
          <p style={{ color: 'var(--text-faded)', fontSize: 14 }}>
            {t('welcome', lang)}, {user?.display_name}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {user?.is_admin && (
            <button className="btn btn-sm" onClick={() => navigate('/admin')}
              style={{ borderColor: 'var(--blood)', color: 'var(--blood-bright)' }}>
              {t('admin', lang)}
            </button>
          )}
          <button className="btn btn-sm" onClick={handleLogout}>{t('logout', lang)}</button>
        </div>
      </div>

      {error && <p className="error-msg" style={{ marginBottom: 16 }}>{error}</p>}

      {/* Existing parties */}
      {loading ? (
        <p style={{ color: 'var(--text-dim)' }}>Loading...</p>
      ) : parties.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 48, marginBottom: 24 }}>
          <p style={{ color: 'var(--text-dim)', fontSize: 15 }}>
            {t('noParties', lang)}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 32 }}>
          {parties.map(party => {
            const myRole = party.members.find(m => m.user_id === user.id)?.role
            return (
              <div
                key={party.id}
                className="card fade-in"
                style={{ padding: '20px 24px', cursor: 'pointer', transition: 'border-color 0.2s' }}
                onClick={() => enterParty(party)}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--gold-dim)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h3 style={{ fontSize: 17, marginBottom: 4 }}>{party.name}</h3>
                    <p style={{ fontSize: 13, color: 'var(--text-faded)' }}>
                      {party.members.length} {party.members.length === 1 ? t('investigator', lang) : t('investigators', lang)}
                      {myRole === 'master' && (
                        <span style={{
                          marginLeft: 10, fontSize: 11, color: 'var(--gold)',
                          fontFamily: 'var(--font-mono)', letterSpacing: '0.08em',
                        }}>
                          {t('keeper', lang)}
                        </span>
                      )}
                    </p>
                  </div>
                  <div style={{
                    fontFamily: 'var(--font-mono)', fontSize: 12,
                    color: 'var(--text-dim)', letterSpacing: '0.05em',
                  }}>
                    {party.invite_code}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Create & Join */}
      <div className="grid-2">
        <div className="card">
          <h3 style={{ fontSize: 14, marginBottom: 14 }}>{t('createNewParty', lang)}</h3>
          <form onSubmit={createParty}>
            <div className="field">
              <input
                placeholder={t('partyName', lang)}
                value={newName}
                onChange={e => setNewName(e.target.value)}
              />
            </div>
            <button type="submit" className="btn btn-primary btn-sm" style={{ width: '100%' }}>
              {t('create', lang)}
            </button>
          </form>
        </div>

        <div className="card">
          <h3 style={{ fontSize: 14, marginBottom: 14 }}>{t('joinParty', lang)}</h3>
          <form onSubmit={joinParty}>
            <div className="field">
              <input
                placeholder={t('inviteCode', lang)}
                value={inviteCode}
                onChange={e => setInviteCode(e.target.value)}
                style={{ fontFamily: 'var(--font-mono)', letterSpacing: '0.1em' }}
              />
            </div>
            <button type="submit" className="btn btn-sm" style={{ width: '100%' }}>
              {t('join', lang)}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
