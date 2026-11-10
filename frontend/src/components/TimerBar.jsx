import React, { useState, useEffect, useRef } from 'react'
import { apiFetch } from '../api'
import { t, getLang } from '../i18n'

function fmt(sec) {
  if (sec == null) return '--:--'
  const s = Math.max(0, Math.floor(sec))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const ss = s % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}`
  return `${m}:${String(ss).padStart(2, '0')}`
}

export default function TimerBar({ partyId, isMaster, timer, onTimerChange }) {
  const lang = getLang()
  const [localRemaining, setLocalRemaining] = useState(timer?.timer_remaining_seconds ?? null)
  const [showControls, setShowControls] = useState(false)
  const [durMin, setDurMin] = useState(5)
  const [label, setLabel] = useState('')
  const tickRef = useRef(null)

  // Sync from server state
  useEffect(() => {
    setLocalRemaining(timer?.timer_remaining_seconds ?? null)
  }, [timer?.timer_remaining_seconds, timer?.timer_running])

  // Local countdown tick
  useEffect(() => {
    clearInterval(tickRef.current)
    if (timer?.timer_running && localRemaining != null && localRemaining > 0) {
      tickRef.current = setInterval(() => {
        setLocalRemaining(prev => (prev == null ? null : Math.max(0, prev - 1)))
      }, 1000)
    }
    return () => clearInterval(tickRef.current)
  }, [timer?.timer_running, localRemaining != null])

  async function call(path, body) {
    try {
      const res = await apiFetch(`/api/parties/${partyId}/timer/${path}`, {
        method: 'POST', body: body || {},
      })
      onTimerChange?.(res)
    } catch (err) { alert(err.message) }
  }

  const hasTimer = timer?.timer_total_seconds != null
  const total = timer?.timer_total_seconds || 1
  const pct = hasTimer ? Math.max(0, Math.min(100, (localRemaining / total) * 100)) : 0
  const expired = hasTimer && localRemaining === 0

  // Color shifts as time runs out
  const barColor = expired ? 'var(--blood-bright)'
    : pct < 15 ? 'var(--blood-bright)'
    : pct < 35 ? 'var(--gold)'
    : 'var(--eldritch-green)'

  // Nothing set and not GM → render nothing
  if (!hasTimer && !isMaster) return null

  return (
    <div style={{
      background: 'var(--bg-surface)',
      borderBottom: '1px solid var(--border)',
      flexShrink: 0,
    }}>
      {/* Bar */}
      {hasTimer && (
        <div style={{ position: 'relative' }}>
          <div style={{
            height: 4, background: 'var(--bg-void)', width: '100%',
          }}>
            <div style={{
              height: '100%', width: `${pct}%`, background: barColor,
              transition: 'width 1s linear, background 0.5s',
              boxShadow: pct < 15 ? `0 0 8px ${barColor}` : 'none',
            }} />
          </div>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: 12, padding: '5px 12px',
          }}>
            <span style={{ fontSize: 13, color: 'var(--text-dim)' }}>⏳</span>
            {timer.timer_label && (
              <span style={{ fontSize: 12, color: 'var(--text-faded)', fontStyle: 'italic' }}>
                {timer.timer_label}
              </span>
            )}
            <span style={{
              fontFamily: 'var(--font-mono)', fontSize: 18, fontWeight: 700,
              color: expired ? 'var(--blood-bright)' : barColor,
              letterSpacing: '0.05em',
              animation: expired ? 'pulse-glow 1s infinite' : 'none',
            }}>
              {expired ? t('timeUp', lang) : fmt(localRemaining)}
            </span>
            {!timer.timer_running && !expired && (
              <span style={{
                fontSize: 9, padding: '1px 6px', borderRadius: 3,
                background: 'var(--bg-deep)', color: 'var(--text-dim)',
                fontFamily: 'var(--font-mono)', letterSpacing: '0.08em',
              }}>
                {t('pause', lang).toUpperCase()}
              </span>
            )}
            {isMaster && (
              <button
                onClick={() => setShowControls(v => !v)}
                style={{
                  padding: '2px 8px', fontSize: 10, borderRadius: 3,
                  border: '1px solid var(--border)', background: 'transparent',
                  color: 'var(--text-dim)', cursor: 'pointer', fontFamily: 'var(--font-mono)',
                }}
              >
                {showControls ? '▲' : '▼'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* GM controls */}
      {isMaster && (!hasTimer || showControls) && (
        <div style={{
          padding: '8px 12px', display: 'flex', gap: 6, alignItems: 'center',
          flexWrap: 'wrap', justifyContent: 'center',
          borderTop: hasTimer ? '1px solid var(--border)' : 'none',
          background: 'var(--bg-deep)',
        }}>
          {!hasTimer ? (
            <>
              <span style={{
                fontSize: 10, color: 'var(--text-dim)', fontFamily: 'var(--font-display)',
                letterSpacing: '0.1em',
              }}>
                {t('sessionTimer', lang)}
              </span>
              <input
                placeholder={t('timerLabelPh', lang)}
                value={label}
                onChange={e => setLabel(e.target.value)}
                style={{ width: 170, fontSize: 12, padding: '4px 8px' }}
              />
              <input
                type="number" min={1} value={durMin}
                onChange={e => setDurMin(e.target.value)}
                style={{ width: 60, fontSize: 12, padding: '4px 8px', textAlign: 'center', fontFamily: 'var(--font-mono)' }}
              />
              <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>{t('minutes', lang).toLowerCase()}</span>
              <button className="btn btn-sm btn-primary"
                onClick={() => call('start', {
                  duration_seconds: Math.max(1, parseInt(durMin) || 5) * 60,
                  label: label || null,
                })}
                style={{ fontSize: 10, padding: '4px 12px' }}>
                {t('start', lang)}
              </button>
            </>
          ) : (
            <>
              {/* Adjust */}
              {[-300, -60, -10, 10, 60, 300].map(d => (
                <button key={d}
                  onClick={() => call('adjust', { delta_seconds: d })}
                  style={{
                    padding: '3px 8px', fontSize: 10, borderRadius: 3,
                    border: `1px solid ${d < 0 ? 'var(--blood)' : 'var(--eldritch-green)'}`,
                    background: 'transparent',
                    color: d < 0 ? 'var(--blood-bright)' : 'var(--eldritch-green)',
                    cursor: 'pointer', fontFamily: 'var(--font-mono)',
                  }}>
                  {d > 0 ? '+' : ''}{Math.abs(d) >= 60 ? `${d / 60}m` : `${d}s`}
                </button>
              ))}
              <span style={{ width: 8 }} />
              {timer.timer_running ? (
                <button className="btn btn-sm" onClick={() => call('pause')}
                  style={{ fontSize: 10, padding: '4px 10px' }}>
                  {t('pause', lang)}
                </button>
              ) : (
                <button className="btn btn-sm" onClick={() => call('resume')}
                  style={{ fontSize: 10, padding: '4px 10px' }}>
                  {t('resume', lang)}
                </button>
              )}
              <button className="btn btn-sm" onClick={() => call('reset')}
                style={{ fontSize: 10, padding: '4px 10px' }}>
                {t('reset', lang)}
              </button>
              <button className="btn btn-sm btn-danger" onClick={() => call('clear')}
                style={{ fontSize: 10, padding: '4px 10px' }}>
                {t('clear', lang)}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
