import React, { useState, useEffect, useCallback } from 'react'
import { apiFetch } from '../api'
import { t, getLang, pickName } from '../i18n'

export default function EncounterPanel({ partyId, isMaster, partyCharacters, myCharacterId, onEncounterChange, lang: langProp }) {
  const lang = langProp || getLang()
  const [encounters, setEncounters] = useState([])
  const [activeEnc, setActiveEnc] = useState(null)
  const [loading, setLoading] = useState(true)

  // Create encounter form
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [newType, setNewType] = useState('battle')

  // Add participants form
  const [showAddPart, setShowAddPart] = useState(false)
  const [selectedChars, setSelectedChars] = useState([])
  const [npcName, setNpcName] = useState('')
  const [npcInit, setNpcInit] = useState('')
  const [npcHp, setNpcHp] = useState('')
  const [npcNotes, setNpcNotes] = useState('')
  const [npcsToAdd, setNpcsToAdd] = useState([])

  // Damage form
  const [damageTarget, setDamageTarget] = useState(null)
  const [damageAmount, setDamageAmount] = useState('')
  const [damageDesc, setDamageDesc] = useState('')

  // Firearms
  const [firearms, setFirearms] = useState([])
  const [allWeapons, setAllWeapons] = useState([])
  const [shootModal, setShootModal] = useState(null) // { shooter, target }
  const [shootWeapon, setShootWeapon] = useState('')
  const [shootRange, setShootRange] = useState('normal')
  const [shootCalled, setShootCalled] = useState(false)
  const [shootShots, setShootShots] = useState(1)
  const [shootResult, setShootResult] = useState(null)
  const [weaponAssign, setWeaponAssign] = useState(null) // participant to assign weapon to

  // Melee
  const [meleeModal, setMeleeModal] = useState(null) // { attacker, defender }
  const [meleeWeapon, setMeleeWeapon] = useState('Fist/Punch')
  const [meleeSkill, setMeleeSkill] = useState(25)
  const [meleeDodge, setMeleeDodge] = useState(0)
  const [meleeCalled, setMeleeCalled] = useState(false)
  const [meleeResult, setMeleeResult] = useState(null)

  const loadEncounters = useCallback(async () => {
    try {
      const data = await apiFetch(`/api/parties/${partyId}/encounters?status=active`)
      setEncounters(data)
      if (data.length > 0 && !activeEnc) {
        setActiveEnc(data[0])
      } else if (activeEnc) {
        const updated = data.find(e => e.id === activeEnc.id)
        if (updated) setActiveEnc(updated)
        else if (data.length > 0) setActiveEnc(data[0])
        else setActiveEnc(null)
      }
    } catch (err) {
      console.error(err)
    }
    setLoading(false)
  }, [partyId, activeEnc?.id])

  useEffect(() => { loadEncounters() }, [partyId])
  useEffect(() => {
    apiFetch('/api/firearms').then(setFirearms).catch(console.error)
    apiFetch('/api/weapons').then(setAllWeapons).catch(console.error)
  }, [])

  // Refresh on WS encounter events
  useEffect(() => {
    if (onEncounterChange) {
      onEncounterChange(() => loadEncounters())
    }
  }, [onEncounterChange, loadEncounters])

  async function handleCreate(e) {
    e.preventDefault()
    if (!newName.trim()) return
    try {
      const enc = await apiFetch('/api/encounters', {
        method: 'POST',
        body: { party_id: parseInt(partyId), name: newName, encounter_type: newType },
      })
      setActiveEnc(enc)
      setNewName('')
      setShowCreate(false)
      loadEncounters()
    } catch (err) { console.error(err) }
  }

  function addNpcToList() {
    if (!npcName.trim()) return
    setNpcsToAdd(prev => [...prev, {
      npc_name: npcName,
      initiative: parseInt(npcInit) || 0,
      hp_max: parseInt(npcHp) || 10,
      notes: npcNotes || null,
    }])
    setNpcName('')
    setNpcInit('')
    setNpcHp('')
    setNpcNotes('')
  }

  async function handleAddParticipants() {
    if (!activeEnc) return
    try {
      const updated = await apiFetch(`/api/encounters/${activeEnc.id}/participants`, {
        method: 'POST',
        body: { character_ids: selectedChars, npcs: npcsToAdd },
      })
      setActiveEnc(updated)
      setShowAddPart(false)
      setSelectedChars([])
      setNpcsToAdd([])
    } catch (err) { console.error(err) }
  }

  async function handleNextTurn() {
    if (!activeEnc) return
    try {
      const updated = await apiFetch(`/api/encounters/${activeEnc.id}/next-turn`, {
        method: 'POST',
      })
      setActiveEnc(updated)
    } catch (err) { console.error(err) }
  }

  async function handleEnd() {
    if (!activeEnc) return
    if (!window.confirm('End this encounter?')) return
    try {
      await apiFetch(`/api/encounters/${activeEnc.id}/end`, { method: 'POST' })
      setActiveEnc(null)
      loadEncounters()
    } catch (err) { console.error(err) }
  }

  async function handleDamage(e) {
    e.preventDefault()
    if (!damageTarget || !damageAmount) return
    try {
      await apiFetch(`/api/encounter-participants/${damageTarget.id}/damage`, {
        method: 'POST',
        body: { amount: parseInt(damageAmount), description: damageDesc },
      })
      setDamageTarget(null)
      setDamageAmount('')
      setDamageDesc('')
      // Refresh encounter
      const updated = await apiFetch(`/api/encounters/${activeEnc.id}`)
      setActiveEnc(updated)
    } catch (err) { console.error(err) }
  }

  async function toggleActive(part) {
    try {
      await apiFetch(`/api/encounter-participants/${part.id}`, {
        method: 'PATCH',
        body: { is_active: !part.is_active },
      })
      const updated = await apiFetch(`/api/encounters/${activeEnc.id}`)
      setActiveEnc(updated)
    } catch (err) { console.error(err) }
  }

  async function handleAssignWeapon(partId, weaponName) {
    try {
      await apiFetch(`/api/encounter-participants/${partId}/weapon`, {
        method: 'POST',
        body: { weapon_name: weaponName },
      })
      const updated = await apiFetch(`/api/encounters/${activeEnc.id}`)
      setActiveEnc(updated)
      setWeaponAssign(null)
    } catch (err) { alert(err.message) }
  }

  async function handleReload(partId) {
    try {
      await apiFetch(`/api/encounter-participants/${partId}/reload`, { method: 'POST' })
      const updated = await apiFetch(`/api/encounters/${activeEnc.id}`)
      setActiveEnc(updated)
    } catch (err) { alert(err.message) }
  }

  async function handleShoot(e) {
    e.preventDefault()
    if (!shootModal || !shootWeapon) return
    setShootResult(null)
    try {
      const result = await apiFetch('/api/firearms/shoot', {
        method: 'POST',
        body: {
          encounter_id: activeEnc.id,
          shooter_participant_id: shootModal.shooter.id,
          target_participant_id: shootModal.target.id,
          weapon_name: shootWeapon,
          range_category: shootRange,
          called_shot: shootCalled,
          shots_fired: shootShots,
        },
      })
      setShootResult(result)
      const updated = await apiFetch(`/api/encounters/${activeEnc.id}`)
      setActiveEnc(updated)
    } catch (err) { alert(err.message) }
  }

  async function handleMelee(e) {
    e.preventDefault()
    if (!meleeModal) return
    setMeleeResult(null)
    try {
      const result = await apiFetch('/api/melee/attack', {
        method: 'POST',
        body: {
          encounter_id: activeEnc.id,
          attacker_participant_id: meleeModal.attacker.id,
          defender_participant_id: meleeModal.defender.id,
          weapon_name: meleeWeapon,
          attacker_skill_value: parseInt(meleeSkill) || 25,
          defender_dodge_value: parseInt(meleeDodge) || 0,
          called_shot: meleeCalled,
        },
      })
      setMeleeResult(result)
      const updated = await apiFetch(`/api/encounters/${activeEnc.id}`)
      setActiveEnc(updated)
    } catch (err) { alert(err.message) }
  }

  if (loading) return <p style={{ color: 'var(--text-dim)' }}>Loading encounters...</p>

  // No active encounter
  if (!activeEnc && !showCreate) {
    return (
      <div className="fade-in" style={{ textAlign: 'center', padding: 32 }}>
        <p style={{ color: 'var(--text-dim)', marginBottom: 16 }}>
          {t('noEncounter', lang)}
        </p>
        {isMaster && (
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
            {t('startEncounter', lang)}
          </button>
        )}
      </div>
    )
  }

  // Create form
  if (showCreate) {
    return (
      <div className="fade-in card" style={{ maxWidth: 400, margin: '0 auto' }}>
        <h3 style={{ fontSize: 16, marginBottom: 16 }}>{t('newEncounter', lang)}</h3>
        <form onSubmit={handleCreate}>
          <div className="field">
            <label>{t('name', lang)}</label>
            <input value={newName} onChange={e => setNewName(e.target.value)}
              placeholder="e.g. Ambush at the Docks" />
          </div>
          <div className="field">
            <label>{t('type', lang)}</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {['battle', 'chase'].map(ty => (
                <button
                  key={ty}
                  type="button"
                  onClick={() => setNewType(ty)}
                  style={{
                    flex: 1, padding: '8px 16px',
                    border: `1px solid ${newType === ty ? 'var(--gold)' : 'var(--border)'}`,
                    background: newType === ty ? 'var(--gold-dim)' : 'var(--bg-deep)',
                    color: newType === ty ? 'var(--bg-void)' : 'var(--text-faded)',
                    borderRadius: 'var(--radius)', cursor: 'pointer',
                    fontFamily: 'var(--font-display)', fontSize: 12, letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                  }}
                >
                  {ty === 'battle' ? '⚔ ' + t('battle', lang) : '🏃 ' + t('chase', lang)}
                </button>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <button type="button" className="btn btn-sm" onClick={() => setShowCreate(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary btn-sm" style={{ flex: 1 }}>
              Create
            </button>
          </div>
        </form>
      </div>
    )
  }

  // Active encounter view
  const activeParts = activeEnc.participants.filter(p => p.is_active)
  const downParts = activeEnc.participants.filter(p => !p.is_active)
  const currentTurnPart = activeParts[activeEnc.current_turn_index] || null

  return (
    <div className="fade-in">
      {/* Encounter header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 16, padding: '12px 16px',
        background: 'var(--bg-deep)', borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border)',
      }}>
        <div>
          <h3 style={{ fontSize: 16, marginBottom: 2 }}>
            {activeEnc.encounter_type === 'battle' ? '⚔' : '🏃'} {activeEnc.name}
          </h3>
          <div style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text-dim)' }}>
            {t('round', lang)} {activeEnc.current_round}
            {currentTurnPart && (
              <span style={{ color: 'var(--gold)', marginLeft: 8 }}>
                → {currentTurnPart.character_name}{t('turn', lang)}
              </span>
            )}
          </div>
        </div>
        {isMaster && (
          <div style={{ display: 'flex', gap: 6 }}>
            <button className="btn btn-sm" onClick={() => setShowAddPart(true)}
              style={{ fontSize: 10 }}>+ {t('add', lang)}</button>
            <button className="btn btn-sm btn-primary" onClick={handleNextTurn}
              style={{ fontSize: 10 }}>{t('nextTurn', lang)} →</button>
            <button className="btn btn-sm btn-danger" onClick={handleEnd}
              style={{ fontSize: 10 }}>{t('end', lang)}</button>
          </div>
        )}
      </div>

      {/* Add participants modal */}
      {showAddPart && isMaster && (
        <div className="card fade-in" style={{
          marginBottom: 16, padding: 16,
          border: '1px solid var(--gold-dim)',
        }}>
          <h4 style={{ fontSize: 13, marginBottom: 12 }}>{t('addParticipants', lang)}</h4>

          {/* Select characters */}
          <div style={{ marginBottom: 12 }}>
            <label>{t('playerCharacters', lang)}</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
              {(partyCharacters || []).map(c => {
                const already = activeEnc.participants.some(p => p.character_id === c.id)
                const selected = selectedChars.includes(c.id)
                return (
                  <button
                    key={c.id}
                    onClick={() => {
                      if (already) return
                      setSelectedChars(prev =>
                        selected ? prev.filter(id => id !== c.id) : [...prev, c.id]
                      )
                    }}
                    disabled={already}
                    style={{
                      padding: '4px 12px', fontSize: 12,
                      borderRadius: 'var(--radius)',
                      border: `1px solid ${selected ? 'var(--gold)' : already ? 'var(--text-dim)' : 'var(--border)'}`,
                      background: selected ? 'var(--gold-dim)' : 'transparent',
                      color: selected ? 'var(--bg-void)' : already ? 'var(--text-dim)' : 'var(--text-faded)',
                      cursor: already ? 'default' : 'pointer',
                      opacity: already ? 0.5 : 1,
                    }}
                  >
                    {c.name} {already && '✓'}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Add NPCs */}
          <label>{t('npcs', lang)}</label>
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 60px 60px 1fr auto',
            gap: 6, marginTop: 4, alignItems: 'center',
          }}>
            <input placeholder="NPC name" value={npcName}
              onChange={e => setNpcName(e.target.value)} style={{ fontSize: 12, padding: '6px 8px' }} />
            <input type="number" placeholder={activeEnc.encounter_type === 'battle' ? 'DEX' : 'CON'}
              value={npcInit} onChange={e => setNpcInit(e.target.value)}
              style={{ fontSize: 12, padding: '6px 8px', textAlign: 'center' }} />
            <input type="number" placeholder="HP" value={npcHp}
              onChange={e => setNpcHp(e.target.value)}
              style={{ fontSize: 12, padding: '6px 8px', textAlign: 'center' }} />
            <input placeholder="Notes" value={npcNotes}
              onChange={e => setNpcNotes(e.target.value)} style={{ fontSize: 12, padding: '6px 8px' }} />
            <button className="btn btn-sm" onClick={addNpcToList}
              style={{ fontSize: 10, padding: '4px 10px' }}>+</button>
          </div>

          {npcsToAdd.length > 0 && (
            <div style={{ marginTop: 8 }}>
              {npcsToAdd.map((npc, i) => (
                <div key={i} style={{
                  display: 'flex', justifyContent: 'space-between',
                  fontSize: 12, color: 'var(--text-faded)', padding: '2px 0',
                }}>
                  <span>{npc.npc_name} (Init: {npc.initiative}, HP: {npc.hp_max})</span>
                  <span style={{ cursor: 'pointer', color: 'var(--blood-bright)' }}
                    onClick={() => setNpcsToAdd(prev => prev.filter((_, j) => j !== i))}>✕</span>
                </div>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button className="btn btn-sm" onClick={() => { setShowAddPart(false); setNpcsToAdd([]) }}>
              {t('cancel', lang)}
            </button>
            <button className="btn btn-sm btn-primary" onClick={handleAddParticipants}
              style={{ flex: 1 }}
              disabled={selectedChars.length === 0 && npcsToAdd.length === 0}>
              {t('addToEncounter', lang)}
            </button>
          </div>
        </div>
      )}

      {/* Initiative order / turn tracker */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {activeParts.map((part, idx) => {
          const isCurrent = idx === activeEnc.current_turn_index
          const hpPct = part.hp_max > 0 ? (part.hp_current / part.hp_max) * 100 : 100
          const hpColor = hpPct > 50 ? 'var(--eldritch-green)' : hpPct > 25 ? 'var(--gold)' : 'var(--blood-bright)'

          return (
            <div
              key={part.id}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 14px', borderRadius: 'var(--radius)',
                background: isCurrent ? 'var(--bg-card)' : 'var(--bg-deep)',
                border: `1px solid ${isCurrent ? 'var(--gold-dim)' : 'var(--border)'}`,
                transition: 'all 0.2s',
                boxShadow: isCurrent ? '0 0 12px var(--eldritch-glow)' : 'none',
              }}
            >
              {/* Initiative badge */}
              <div style={{
                width: 32, height: 32, borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: isCurrent ? 'var(--gold-dim)' : 'var(--bg-surface)',
                color: isCurrent ? 'var(--bg-void)' : 'var(--text-dim)',
                fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600,
                flexShrink: 0,
              }}>
                {part.initiative}
              </div>

              {/* Avatar or NPC icon */}
              {part.avatar_path ? (
                <img src={part.avatar_path} alt="" style={{
                  width: 36, height: 36, borderRadius: '50%', objectFit: 'cover',
                  border: '1px solid var(--border)', flexShrink: 0,
                }} />
              ) : (
                <div style={{
                  width: 36, height: 36, borderRadius: '50%',
                  background: 'var(--bg-surface)', border: '1px solid var(--border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 16, flexShrink: 0,
                }}>
                  {part.character_id ? '🧑' : '👹'}
                </div>
              )}

              {/* Name + HP */}
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{
                    fontSize: 14, fontWeight: isCurrent ? 600 : 400,
                    color: isCurrent ? 'var(--gold)' : 'var(--text-parchment)',
                  }}>
                    {part.character_name}
                  </span>
                  {isCurrent && (
                    <span style={{
                      fontSize: 9, padding: '1px 6px', borderRadius: 3,
                      background: 'var(--gold)', color: 'var(--bg-void)',
                      fontFamily: 'var(--font-mono)', letterSpacing: '0.1em',
                    }}>
                      {t('active', lang)}
                    </span>
                  )}
                  {part.notes && (
                    <span style={{ fontSize: 11, color: 'var(--text-dim)', fontStyle: 'italic' }}>
                      — {part.notes}
                    </span>
                  )}
                </div>
                {/* HP bar */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3 }}>
                  <div style={{
                    flex: 1, height: 4, background: 'var(--bg-void)',
                    borderRadius: 2, overflow: 'hidden',
                  }}>
                    <div style={{
                      height: '100%', width: `${Math.min(100, hpPct)}%`,
                      background: hpColor, borderRadius: 2,
                      transition: 'width 0.3s ease',
                    }} />
                  </div>
                  <span style={{
                    fontSize: 11, fontFamily: 'var(--font-mono)', color: hpColor,
                    minWidth: 50, textAlign: 'right',
                  }}>
                    {part.hp_current}/{part.hp_max}
                  </span>
                </div>
                {/* Weapon & Ammo */}
                {part.weapon && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
                    <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>🔫</span>
                    <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-faded)' }}>
                      {part.weapon}
                    </span>
                    {part.ammo_current != null && (
                      <span style={{
                        fontSize: 10, fontFamily: 'var(--font-mono)',
                        color: part.ammo_current === 0 ? 'var(--blood-bright)' :
                          part.ammo_current <= 2 ? 'var(--gold)' : 'var(--text-dim)',
                        padding: '0 4px', borderRadius: 2,
                        background: 'var(--bg-void)',
                      }}>
                        {part.ammo_current}/{part.ammo_max} ammo
                      </span>
                    )}
                  </div>
                )}
                {/* Movement points (chase only) */}
                {activeEnc.encounter_type === 'chase' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
                    <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>🏃</span>
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 4,
                    }}>
                      {isMaster && (
                        <button onClick={async () => {
                          try {
                            await apiFetch(`/api/encounter-participants/${part.id}`, {
                              method: 'PATCH', body: { movement_points: Math.max(0, part.movement_points - 1) },
                            })
                            const u = await apiFetch(`/api/encounters/${activeEnc.id}`)
                            setActiveEnc(u)
                          } catch {}
                        }} style={{
                          width: 18, height: 18, fontSize: 11, border: '1px solid var(--border)',
                          background: 'transparent', color: 'var(--text-dim)', borderRadius: 2,
                          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>−</button>
                      )}
                      <span style={{
                        fontSize: 13, fontFamily: 'var(--font-mono)', fontWeight: 600,
                        color: part.movement_points > 0 ? 'var(--sanity-blue)' : 'var(--text-dim)',
                        minWidth: 20, textAlign: 'center',
                      }}>
                        {part.movement_points}
                      </span>
                      {isMaster && (
                        <button onClick={async () => {
                          try {
                            await apiFetch(`/api/encounter-participants/${part.id}`, {
                              method: 'PATCH', body: { movement_points: part.movement_points + 1 },
                            })
                            const u = await apiFetch(`/api/encounters/${activeEnc.id}`)
                            setActiveEnc(u)
                          } catch {}
                        }} style={{
                          width: 18, height: 18, fontSize: 11, border: '1px solid var(--border)',
                          background: 'transparent', color: 'var(--text-dim)', borderRadius: 2,
                          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>+</button>
                      )}
                    </div>
                    <span style={{ fontSize: 10, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
                      {t('locations', lang)}
                    </span>
                  </div>
                )}
              </div>
              {(() => {
                const isMine = part.character_id && part.character_id === myCharacterId
                const canAttack = isMaster || isMine
                const canManage = isMaster
                if (!canAttack && !canManage) return null
                return (
                <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap', justifyContent: 'flex-end', maxWidth: 120 }}>
                  {/* Weapon assign (GM only) */}
                  {canManage && (
                    <button
                      onClick={() => setWeaponAssign(weaponAssign?.id === part.id ? null : part)}
                      style={{
                        padding: '3px 6px', fontSize: 9, borderRadius: 3,
                        border: '1px solid var(--text-dim)', background: part.weapon ? 'var(--bg-surface)' : 'transparent',
                        color: 'var(--text-faded)', cursor: 'pointer',
                        fontFamily: 'var(--font-mono)',
                      }}
                      title="Assign weapon"
                    >
                      {part.weapon ? '🔫' : 'WPN'}
                    </button>
                  )}
                  {/* Shoot (needs weapon + target). GM for anyone; player for own char */}
                  {canAttack && part.weapon && activeParts.length > 1 && (
                    <button
                      onClick={() => {
                        const targets = activeParts.filter(p => p.id !== part.id)
                        if (targets.length > 0) {
                          setShootModal({ shooter: part, target: targets[0] })
                          setShootWeapon(part.weapon)
                          setShootRange('normal')
                          setShootCalled(false)
                          setShootShots(1)
                          setShootResult(null)
                        }
                      }}
                      style={{
                        padding: '3px 6px', fontSize: 9, borderRadius: 3,
                        border: '1px solid var(--gold-dim)', background: 'transparent',
                        color: 'var(--gold)', cursor: 'pointer',
                        fontFamily: 'var(--font-mono)',
                      }}
                      title="Fire weapon"
                    >
                      FIRE
                    </button>
                  )}
                  {/* Melee attack. GM for anyone; player for own char */}
                  {canAttack && activeParts.length > 1 && (
                    <button
                      onClick={() => {
                        const targets = activeParts.filter(p => p.id !== part.id)
                        if (targets.length > 0) {
                          setMeleeModal({ attacker: part, defender: targets[0] })
                          setMeleeWeapon('Fist/Punch')
                          setMeleeSkill(25)
                          setMeleeDodge(0)
                          setMeleeCalled(false)
                          setMeleeResult(null)
                        }
                      }}
                      style={{
                        padding: '3px 6px', fontSize: 9, borderRadius: 3,
                        border: '1px solid var(--text-faded)', background: 'transparent',
                        color: 'var(--text-faded)', cursor: 'pointer',
                        fontFamily: 'var(--font-mono)',
                      }}
                      title="Melee attack"
                    >
                      MELEE
                    </button>
                  )}
                  {/* Reload. GM for anyone; player for own char */}
                  {canAttack && part.weapon && part.ammo_current != null && part.ammo_current < (part.ammo_max || 0) && (
                    <button
                      onClick={() => handleReload(part.id)}
                      style={{
                        padding: '3px 6px', fontSize: 9, borderRadius: 3,
                        border: '1px solid var(--eldritch-green)', background: 'transparent',
                        color: 'var(--eldritch-green)', cursor: 'pointer',
                        fontFamily: 'var(--font-mono)',
                      }}
                      title="Reload"
                    >
                      RLD
                    </button>
                  )}
                  {/* Damage (GM only) */}
                  {canManage && (
                    <button
                      onClick={() => setDamageTarget(part)}
                      style={{
                        padding: '3px 6px', fontSize: 9, borderRadius: 3,
                        border: '1px solid var(--blood)', background: 'transparent',
                        color: 'var(--blood-bright)', cursor: 'pointer',
                        fontFamily: 'var(--font-mono)',
                      }}
                      title="Apply damage"
                    >
                      DMG
                    </button>
                  )}
                  {/* KO (GM only) */}
                  {canManage && (
                    <button
                      onClick={() => toggleActive(part)}
                      style={{
                        padding: '3px 6px', fontSize: 9, borderRadius: 3,
                        border: '1px solid var(--text-dim)', background: 'transparent',
                        color: 'var(--text-dim)', cursor: 'pointer',
                        fontFamily: 'var(--font-mono)',
                      }}
                      title="Remove from combat"
                    >
                      KO
                    </button>
                  )}
                </div>
                )
              })()}
            </div>
          )
        })}

        {/* Down/inactive participants */}
        {downParts.length > 0 && (
          <>
            <div style={{
              fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-dim)',
              letterSpacing: '0.1em', marginTop: 8, paddingLeft: 4,
            }}>
              {t('incapacitated', lang)}
            </div>
            {downParts.map(part => (
              <div key={part.id} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '8px 14px', borderRadius: 'var(--radius)',
                background: 'var(--bg-deep)', opacity: 0.5,
                border: '1px solid var(--border)',
              }}>
                <span style={{ fontSize: 14 }}>☠</span>
                <span style={{ fontSize: 13, textDecoration: 'line-through', color: 'var(--text-dim)' }}>
                  {part.character_name}
                </span>
                <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--blood)' }}>
                  HP {part.hp_current}/{part.hp_max}
                </span>
                {isMaster && (
                  <button onClick={() => toggleActive(part)} className="btn btn-sm"
                    style={{ marginLeft: 'auto', fontSize: 9, padding: '2px 8px' }}>
                    {t('revive', lang)}
                  </button>
                )}
              </div>
            ))}
          </>
        )}
      </div>

      {/* ── Chase Controls ───────────────────── */}
      {activeEnc.encounter_type === 'chase' && (
        <ChasePanel
          encounter={activeEnc}
          activeParts={activeParts}
          isMaster={isMaster}
          myCharacterId={myCharacterId}
          lang={lang}
          onRefresh={async () => {
            const u = await apiFetch(`/api/encounters/${activeEnc.id}`)
            setActiveEnc(u)
          }}
        />
      )}

      {/* Damage modal */}
      {damageTarget && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        }}
          onClick={() => setDamageTarget(null)}
        >
          <div className="card" style={{ width: 340 }} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: 16, marginBottom: 4 }}>{t('applyDamage', lang)}</h3>
            <p style={{ color: 'var(--text-faded)', fontSize: 13, marginBottom: 16 }}>
              Target: <strong style={{ color: 'var(--gold)' }}>{damageTarget.character_name}</strong>
              <span style={{ fontFamily: 'var(--font-mono)', marginLeft: 8 }}>
                HP {damageTarget.hp_current}/{damageTarget.hp_max}
              </span>
            </p>
            <form onSubmit={handleDamage}>
              <div className="field">
                <label>Damage (positive = hurt, negative = heal)</label>
                <input
                  type="number"
                  value={damageAmount}
                  onChange={e => setDamageAmount(e.target.value)}
                  placeholder="e.g. 6"
                  autoFocus
                  style={{ fontFamily: 'var(--font-mono)', fontSize: 20, textAlign: 'center' }}
                />
              </div>
              <div className="field">
                <label>Description (optional)</label>
                <input
                  value={damageDesc}
                  onChange={e => setDamageDesc(e.target.value)}
                  placeholder="e.g. Shotgun blast, Claw attack"
                />
              </div>
              <div style={{
                fontSize: 13, color: 'var(--text-dim)', marginBottom: 12,
                fontFamily: 'var(--font-mono)',
              }}>
                Result: HP {damageTarget.hp_current} → {Math.max(0, damageTarget.hp_current - (parseInt(damageAmount) || 0))}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" className="btn btn-sm"
                  onClick={() => setDamageTarget(null)}>Cancel</button>
                <button type="submit" className="btn btn-sm btn-danger" style={{ flex: 1 }}>
                  {t('applyDamage', lang)}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Melee Attack Modal */}
      {meleeModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        }}
          onClick={() => { setMeleeModal(null); setMeleeResult(null) }}
        >
          <div className="card" style={{ width: 440 }}
            onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: 16, marginBottom: 4 }}>⚔ {t('meleeAttack', lang)}</h3>
            <p style={{ color: 'var(--text-faded)', fontSize: 13, marginBottom: 12 }}>
              <strong style={{ color: 'var(--gold)' }}>{meleeModal.attacker.character_name}</strong>
              {' → '}
              <strong style={{ color: 'var(--blood-bright)' }}>{meleeModal.defender.character_name}</strong>
            </p>

            {!meleeResult ? (
              <form onSubmit={handleMelee}>
                <div className="field">
                  <label>{t('weapon', lang)}</label>
                  <select value={meleeWeapon} onChange={e => setMeleeWeapon(e.target.value)}>
                    {allWeapons.filter(w => w.type === 'melee').map(w => (
                      <option key={w.name} value={w.name}>{pickName(w.name, w.name_ru, lang)} ({w.damage})</option>
                    ))}
                  </select>
                </div>

                <div className="field">
                  <label>{t('defender', lang)}</label>
                  <select
                    value={meleeModal.defender.id}
                    onChange={e => {
                      const t = activeParts.find(p => p.id === parseInt(e.target.value))
                      if (t) setMeleeModal(prev => ({ ...prev, defender: t }))
                    }}
                  >
                    {activeParts.filter(p => p.id !== meleeModal.attacker.id).map(p => (
                      <option key={p.id} value={p.id}>
                        {p.character_name} (HP {p.hp_current}/{p.hp_max})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid-2" style={{ marginBottom: 12 }}>
                  <div className="field" style={{ marginBottom: 0 }}>
                    <label>{t('attackerSkill', lang)}</label>
                    <input type="number" min={1} max={99} value={meleeSkill}
                      onChange={e => setMeleeSkill(e.target.value)}
                      style={{ textAlign: 'center', fontFamily: 'var(--font-mono)' }} />
                    <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>
                      {meleeModal.attacker.character_id ? 'Auto-detected from sheet' : 'Set for NPC'}
                    </span>
                  </div>
                  <div className="field" style={{ marginBottom: 0 }}>
                    <label>{t('defenderDodge', lang)}</label>
                    <input type="number" min={0} max={99} value={meleeDodge}
                      onChange={e => setMeleeDodge(e.target.value)}
                      style={{ textAlign: 'center', fontFamily: 'var(--font-mono)' }} />
                    <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>
                      0 = no dodge attempt
                    </span>
                  </div>
                </div>

                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: 16 }}>
                  <input type="checkbox" checked={meleeCalled}
                    onChange={e => setMeleeCalled(e.target.checked)}
                    style={{ width: 'auto', accentColor: 'var(--gold)' }} />
                  <span style={{ fontSize: 13, color: 'var(--text-faded)' }}>
                    Called shot (½ skill, impale on extreme)
                  </span>
                </label>

                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="button" className="btn btn-sm"
                    onClick={() => { setMeleeModal(null); setMeleeResult(null) }}>Cancel</button>
                  <button type="submit" className="btn btn-sm btn-primary" style={{ flex: 1 }}>
                    ⚔ {t('attack', lang)}
                  </button>
                </div>
              </form>
            ) : (
              <div className="fade-in">
                <div style={{
                  padding: 16, background: 'var(--bg-deep)', borderRadius: 'var(--radius-lg)',
                  marginBottom: 12, textAlign: 'center',
                }}>
                  {/* Attack roll */}
                  <div style={{ marginBottom: 8 }}>
                    <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>Attack: </span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 28, fontWeight: 700 }}
                      className={
                        meleeResult.attack_level === 'critical' ? 'dice-critical' :
                        meleeResult.attack_level === 'fumble' ? 'dice-fumble' :
                        meleeResult.attack_success ? 'dice-regular' : 'dice-fail'
                      }>
                      {meleeResult.attack_roll}
                    </span>
                    <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text-dim)', marginLeft: 6 }}>
                      vs {meleeResult.attack_skill}
                    </span>
                    <span style={{ display: 'block', fontSize: 12, fontFamily: 'var(--font-display)', letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: 2 }}
                      className={meleeResult.attack_success ? 'dice-regular' : 'dice-fail'}>
                      {meleeResult.attack_level}
                    </span>
                  </div>

                  {/* Dodge roll */}
                  {meleeResult.dodge_roll != null && (
                    <div style={{ marginBottom: 8, padding: '6px 0', borderTop: '1px solid var(--border)' }}>
                      <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>Dodge: </span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 700 }}
                        className={meleeResult.dodged ? 'dice-regular' : 'dice-fail'}>
                        {meleeResult.dodge_roll}
                      </span>
                      <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text-dim)', marginLeft: 6 }}>
                        vs {meleeResult.dodge_skill}
                      </span>
                      <span style={{
                        display: 'block', fontSize: 13, fontWeight: 700, marginTop: 2,
                        color: meleeResult.dodged ? 'var(--eldritch-green)' : 'var(--blood-bright)',
                      }}>
                        {meleeResult.dodged ? t('dodged', lang) : t('failedDodge', lang)}
                      </span>
                    </div>
                  )}

                  {/* Damage */}
                  {meleeResult.damage > 0 && !meleeResult.dodged && (
                    <div style={{ padding: '8px 0', borderTop: '1px solid var(--border)' }}>
                      <span style={{
                        fontFamily: 'var(--font-mono)', fontSize: 24, fontWeight: 700,
                        color: 'var(--blood-bright)',
                      }}>
                        {meleeResult.damage} damage
                      </span>
                      {meleeResult.damage_bonus !== '0' && (
                        <span style={{ fontSize: 11, color: 'var(--text-dim)', marginLeft: 6, fontFamily: 'var(--font-mono)' }}>
                          (DB: {meleeResult.damage_bonus})
                        </span>
                      )}
                      <div style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text-dim)', marginTop: 4 }}>
                        {meleeResult.defender} HP: {meleeResult.defender_hp}
                        {!meleeResult.defender_active && (
                          <span style={{ color: 'var(--blood-bright)', marginLeft: 6 }}>☠ DOWN</span>
                        )}
                      </div>
                    </div>
                  )}

                  {!meleeResult.attack_success && (
                    <div style={{ color: 'var(--text-dim)', fontSize: 13, marginTop: 4 }}>
                      {t('attackMisses', lang)}
                    </div>
                  )}
                </div>

                <button className="btn btn-sm" onClick={() => { setMeleeModal(null); setMeleeResult(null) }}
                  style={{ width: '100%' }}>
                  {t('close', lang)}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Weapon Assignment Dropdown */}
      {weaponAssign && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        }}
          onClick={() => setWeaponAssign(null)}
        >
          <div className="card" style={{ width: 380, maxHeight: '80vh', overflow: 'auto' }}
            onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: 16, marginBottom: 4 }}>{t('assignWeapon', lang)}</h3>
            <p style={{ color: 'var(--text-faded)', fontSize: 13, marginBottom: 12 }}>
              {weaponAssign.character_name}
              {weaponAssign.weapon && (
                <span style={{ fontFamily: 'var(--font-mono)', marginLeft: 8 }}>
                  (current: {weaponAssign.weapon})
                </span>
              )}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {firearms.map(f => (
                <div
                  key={f.name}
                  onClick={() => handleAssignWeapon(weaponAssign.id, f.name)}
                  style={{
                    padding: '8px 12px', borderRadius: 'var(--radius)',
                    border: '1px solid var(--border)', cursor: 'pointer',
                    background: weaponAssign.weapon === f.name ? 'var(--bg-card)' : 'var(--bg-deep)',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--gold-dim)'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 13, color: 'var(--text-parchment)' }}>{pickName(f.name, f.name_ru, lang)}</span>
                    <span style={{
                      fontSize: 9, padding: '1px 5px', borderRadius: 3,
                      background: f.era === 'Modern' ? 'var(--sanity-blue)' : 'var(--gold-dim)',
                      color: 'var(--bg-void)', fontFamily: 'var(--font-mono)',
                    }}>
                      {f.era}
                    </span>
                  </div>
                  <div style={{
                    fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-dim)',
                    marginTop: 3, display: 'flex', gap: 10,
                  }}>
                    <span>DMG {f.damage}</span>
                    <span>RNG {f.range}yd</span>
                    <span>ROF {f.rate_of_fire}</span>
                    <span>CAP {f.ammo}</span>
                    <span>MAL {f.malfunction}</span>
                  </div>
                  {f.notes && (
                    <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 2, fontStyle: 'italic' }}>
                      {f.notes}
                    </div>
                  )}
                </div>
              ))}
            </div>
            <button className="btn btn-sm" onClick={() => setWeaponAssign(null)}
              style={{ width: '100%', marginTop: 12 }}>
              {t('cancel', lang)}
            </button>
          </div>
        </div>
      )}

      {/* Shooting Modal */}
      {shootModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        }}
          onClick={() => { setShootModal(null); setShootResult(null) }}
        >
          <div className="card" style={{ width: 420 }}
            onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: 16, marginBottom: 4 }}>🔫 {t('firearmAttack', lang)}</h3>
            <p style={{ color: 'var(--text-faded)', fontSize: 13, marginBottom: 12 }}>
              <strong style={{ color: 'var(--gold)' }}>{shootModal.shooter.character_name}</strong>
              {' → '}
              <strong style={{ color: 'var(--blood-bright)' }}>{shootModal.target.character_name}</strong>
            </p>

            {!shootResult ? (
              <form onSubmit={handleShoot}>
                <div className="field">
                  <label>{t('weapon', lang)}</label>
                  <select value={shootWeapon} onChange={e => setShootWeapon(e.target.value)}>
                    {firearms.map(f => (
                      <option key={f.name} value={f.name}>{pickName(f.name, f.name_ru, lang)} ({f.damage})</option>
                    ))}
                  </select>
                </div>

                {/* Target selector */}
                <div className="field">
                  <label>{t('target', lang)}</label>
                  <select
                    value={shootModal.target.id}
                    onChange={e => {
                      const t = activeParts.find(p => p.id === parseInt(e.target.value))
                      if (t) setShootModal(prev => ({ ...prev, target: t }))
                    }}
                  >
                    {activeParts.filter(p => p.id !== shootModal.shooter.id).map(p => (
                      <option key={p.id} value={p.id}>
                        {p.character_name} (HP {p.hp_current}/{p.hp_max})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid-2" style={{ marginBottom: 12 }}>
                  <div className="field" style={{ marginBottom: 0 }}>
                    <label>{t('range', lang)}</label>
                    <select value={shootRange} onChange={e => setShootRange(e.target.value)}>
                      <option value="point_blank">Point Blank (×2 skill)</option>
                      <option value="normal">Normal</option>
                      <option value="long">Long (½ skill)</option>
                      <option value="extreme">Extreme (⅕ skill)</option>
                    </select>
                  </div>
                  <div className="field" style={{ marginBottom: 0 }}>
                    <label>{t('shots', lang)}</label>
                    <input type="number" min={1} max={10} value={shootShots}
                      onChange={e => setShootShots(parseInt(e.target.value) || 1)}
                      style={{ textAlign: 'center', fontFamily: 'var(--font-mono)' }} />
                  </div>
                </div>

                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: 16 }}>
                  <input type="checkbox" checked={shootCalled}
                    onChange={e => setShootCalled(e.target.checked)}
                    style={{ width: 'auto', accentColor: 'var(--gold)' }} />
                  <span style={{ fontSize: 13, color: 'var(--text-faded)' }}>
                    Called shot (½ skill, impale on extreme)
                  </span>
                </label>

                {/* Ammo info */}
                {shootModal.shooter.ammo_current != null && (
                  <p style={{
                    fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text-dim)',
                    marginBottom: 12,
                  }}>
                    Ammo: {shootModal.shooter.ammo_current}/{shootModal.shooter.ammo_max}
                    {shootModal.shooter.ammo_current === 0 && (
                      <span style={{ color: 'var(--blood-bright)', marginLeft: 8 }}>EMPTY!</span>
                    )}
                  </p>
                )}

                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="button" className="btn btn-sm"
                    onClick={() => { setShootModal(null); setShootResult(null) }}>Cancel</button>
                  <button type="submit" className="btn btn-sm btn-primary" style={{ flex: 1 }}>
                    🔫 {t('fire', lang)}
                  </button>
                </div>
              </form>
            ) : (
              /* Shoot Result */
              <div className="fade-in">
                <div style={{
                  padding: 16, background: 'var(--bg-deep)', borderRadius: 'var(--radius-lg)',
                  marginBottom: 12,
                }}>
                  {shootResult.results.map((r, i) => (
                    <div key={i} style={{
                      padding: '6px 0',
                      borderBottom: i < shootResult.results.length - 1 ? '1px solid var(--border)' : 'none',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    }}>
                      <span style={{ fontSize: 13 }}>Shot {r.shot}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 14 }}>
                          [{r.roll}]
                        </span>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}
                          className={
                            r.result === 'critical' ? 'dice-critical' :
                            r.result === 'extreme' ? 'dice-extreme' :
                            r.result === 'hard' ? 'dice-hard' :
                            r.result === 'regular' ? 'dice-regular' :
                            r.result === 'fumble' || r.result === 'malfunction' ? 'dice-fumble' :
                            'dice-fail'
                          }
                        >
                          {r.result === 'malfunction' ? '⚠ JAM!' : r.result.toUpperCase()}
                        </span>
                        {r.damage > 0 && (
                          <span style={{
                            fontFamily: 'var(--font-mono)', fontWeight: 700,
                            color: 'var(--blood-bright)', fontSize: 14,
                          }}>
                            {r.damage} dmg
                          </span>
                        )}
                      </div>
                    </div>
                  ))}

                  {shootResult.total_damage > 0 && (
                    <div style={{
                      marginTop: 8, padding: '8px 0', borderTop: '1px solid var(--border)',
                      textAlign: 'center',
                    }}>
                      <span style={{
                        fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 700,
                        color: 'var(--blood-bright)',
                      }}>
                        {shootResult.total_damage} total damage
                      </span>
                      <br />
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-dim)' }}>
                        {shootResult.target} HP: {shootResult.target_hp}
                        {!shootResult.target_active && (
                          <span style={{ color: 'var(--blood-bright)', marginLeft: 6 }}>☠ DOWN</span>
                        )}
                      </span>
                    </div>
                  )}

                  {shootResult.total_damage === 0 && (
                    <div style={{ marginTop: 8, textAlign: 'center', color: 'var(--text-dim)', fontSize: 13 }}>
                      {shootResult.result === 'no_ammo' ? 'Click! No ammunition.' : 'All shots missed.'}
                    </div>
                  )}
                </div>

                <div style={{ textAlign: 'center', fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text-dim)', marginBottom: 12 }}>
                  Ammo remaining: {shootResult.shooter_ammo}
                </div>

                <button className="btn btn-sm" onClick={() => { setShootModal(null); setShootResult(null) }}
                  style={{ width: '100%' }}>
                  {t('close', lang)}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}


/* ── Chase Panel ─────────────────────────────── */
/* CoC 7e chase mechanics: movement actions, hazards, barriers, speed checks */

function ChasePanel({ encounter, activeParts, isMaster, myCharacterId, onRefresh, lang: langProp }) {
  const lang = langProp || getLang()
  const [hazardTarget, setHazardTarget] = useState(null)
  const [hazardType, setHazardType] = useState('obstacle')  // obstacle, hazard, barrier
  const [hazardDifficulty, setHazardDifficulty] = useState('regular')
  const [hazardResult, setHazardResult] = useState(null)
  const [speedCheckTarget, setSpeedCheckTarget] = useState(null)
  const [speedResult, setSpeedResult] = useState(null)

  // Which participant is the current player's own character?
  const myPart = activeParts.find(p => p.character_id && p.character_id === myCharacterId) || null

  // Sort participants by movement points (leader first)
  const sorted = [...activeParts].sort((a, b) => b.movement_points - a.movement_points)
  const maxMov = Math.max(...sorted.map(p => p.movement_points), 1)

  async function handleSpeedCheck(part) {
    setSpeedResult(null)
    try {
      const result = await apiFetch('/api/chase/speed-check', {
        method: 'POST',
        body: { encounter_id: encounter.id, participant_id: part.id, con_value: part.initiative },
      })
      setSpeedResult({
        name: result.participant, roll: result.roll, conValue: result.con_value,
        success: result.success, oldMov: result.old_mov, newMov: result.new_mov,
      })
      await onRefresh()
    } catch (err) { alert(err.message) }
  }

  async function handleHazardCheck(explicitTarget) {
    const target = explicitTarget || hazardTarget
    if (!target) return
    setHazardResult(null)
    try {
      const result = await apiFetch('/api/chase/hazard-check', {
        method: 'POST',
        body: {
          encounter_id: encounter.id, participant_id: target.id,
          hazard_type: hazardType, difficulty: hazardDifficulty, skill_value: 50,
        },
      })
      setHazardResult({
        name: result.participant, type: result.hazard_type, roll: result.roll,
        threshold: result.threshold, difficulty: result.difficulty, success: result.success,
        movChange: result.mov_change, hpLost: result.hp_lost,
      })
      await onRefresh()
    } catch (err) { alert(err.message) }
  }

  return (
    <div style={{
      marginTop: 16, padding: 16,
      background: 'var(--bg-deep)', borderRadius: 'var(--radius-lg)',
      border: '1px solid var(--border)',
    }}>
      <h4 style={{ fontSize: 13, marginBottom: 12, color: 'var(--gold)', letterSpacing: '0.08em' }}>
        🏃 {t('chaseTrack', lang)}
      </h4>

      {/* Visual chase track */}
      <div style={{
        position: 'relative', padding: '8px 0', marginBottom: 16,
      }}>
        {/* Track line */}
        <div style={{
          position: 'absolute', top: '50%', left: 0, right: 0, height: 2,
          background: 'var(--border)', transform: 'translateY(-50%)',
        }} />

        {/* Position markers */}
        <div style={{ position: 'relative', height: 50, display: 'flex', alignItems: 'center' }}>
          {sorted.map((part, idx) => {
            const pct = maxMov > 0 ? (part.movement_points / maxMov) * 85 + 5 : 10
            return (
              <div
                key={part.id}
                style={{
                  position: 'absolute', left: `${pct}%`,
                  transform: 'translateX(-50%)',
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  zIndex: sorted.length - idx,
                  transition: 'left 0.5s ease',
                }}
              >
                <div style={{
                  width: 28, height: 28, borderRadius: '50%',
                  background: part.character_id ? 'var(--eldritch-green)' : 'var(--blood)',
                  border: '2px solid var(--bg-void)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, color: 'var(--bg-void)', fontWeight: 700,
                  fontFamily: 'var(--font-mono)',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
                }}>
                  {part.movement_points}
                </div>
                <span style={{
                  fontSize: 9, color: 'var(--text-dim)', marginTop: 2,
                  whiteSpace: 'nowrap', fontFamily: 'var(--font-mono)',
                }}>
                  {part.character_name?.split(' ')[0]}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Player self-roll controls (own character only) */}
      {!isMaster && myPart && (
        <div style={{
          padding: 12, marginBottom: 12,
          background: 'var(--bg-surface)', borderRadius: 'var(--radius)',
          border: '1px solid var(--gold-dim)',
        }}>
          <div style={{ fontSize: 12, color: 'var(--gold)', marginBottom: 8, fontFamily: 'var(--font-display)', letterSpacing: '0.05em' }}>
            {t('yourTurn', lang)} — {myPart.character_name}
            <span style={{ color: 'var(--text-dim)', marginLeft: 8, fontFamily: 'var(--font-mono)', fontSize: 11 }}>
              {t('movement', lang)}: {myPart.movement_points}
            </span>
          </div>
          {/* Speed check */}
          <button
            className="btn btn-sm btn-primary"
            onClick={() => handleSpeedCheck(myPart)}
            style={{ width: '100%', marginBottom: 8, fontSize: 11 }}
          >
            🏃 {t('speedCheck', lang)} ({myPart.initiative})
          </button>
          {/* Obstacle/hazard/barrier for self */}
          <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
            {['obstacle', 'hazard', 'barrier'].map(ty => (
              <button
                key={ty}
                onClick={() => setHazardType(ty)}
                style={{
                  flex: 1, padding: '4px 6px', fontSize: 9, borderRadius: 3,
                  border: `1px solid ${hazardType === ty ? 'var(--gold)' : 'var(--border)'}`,
                  background: hazardType === ty ? 'var(--gold-dim)' : 'transparent',
                  color: hazardType === ty ? 'var(--bg-void)' : 'var(--text-faded)',
                  cursor: 'pointer', fontFamily: 'var(--font-display)',
                  textTransform: 'uppercase', letterSpacing: '0.05em',
                }}
              >
                {t(ty, lang)}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            <select value={hazardDifficulty} onChange={e => setHazardDifficulty(e.target.value)}
              style={{ flex: 1, fontSize: 11, padding: '5px 8px' }}>
              <option value="regular">Regular</option>
              <option value="hard">Hard</option>
              <option value="extreme">Extreme</option>
            </select>
            <button
              className="btn btn-sm"
              onClick={() => handleHazardCheck(myPart)}
              style={{ fontSize: 10, padding: '4px 12px', whiteSpace: 'nowrap' }}
            >
              {t('attempt', lang)}
            </button>
          </div>
        </div>
      )}

      {/* Chase actions (GM only) */}
      {isMaster && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
          {/* Speed check */}
          <div style={{ flex: 1, minWidth: 180 }}>
            <label>{t('speedCheck', lang)}</label>
            <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
              <select
                value={speedCheckTarget?.id || ''}
                onChange={e => {
                  const p = activeParts.find(p => p.id === parseInt(e.target.value))
                  setSpeedCheckTarget(p || null)
                  setSpeedResult(null)
                }}
                style={{ flex: 1, fontSize: 12, padding: '6px 8px' }}
              >
                <option value="">Select...</option>
                {activeParts.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.character_name} (CON {p.initiative})
                  </option>
                ))}
              </select>
              <button
                className="btn btn-sm"
                disabled={!speedCheckTarget}
                onClick={() => speedCheckTarget && handleSpeedCheck(speedCheckTarget)}
                style={{ fontSize: 10, padding: '4px 10px', whiteSpace: 'nowrap' }}
              >
                Roll
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Speed check result */}
      {speedResult && (
        <div className="fade-in" style={{
          padding: 10, background: 'var(--bg-surface)', borderRadius: 'var(--radius)',
          marginBottom: 12, fontSize: 13, border: '1px solid var(--border)',
        }}>
          <strong style={{ color: 'var(--gold)' }}>{speedResult.name}</strong>
          {' speed check: rolled '}
          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{speedResult.roll}</span>
          {' vs CON '}
          <span style={{ fontFamily: 'var(--font-mono)' }}>{speedResult.conValue}</span>
          {' → '}
          <span className={speedResult.success ? 'dice-regular' : 'dice-fail'} style={{ fontWeight: 700 }}>
            {speedResult.success ? t('pass', lang) : t('fail', lang)}
          </span>
          <span style={{ color: 'var(--text-dim)', marginLeft: 8, fontFamily: 'var(--font-mono)' }}>
            (Mov: {speedResult.oldMov} → {speedResult.newMov})
          </span>
        </div>
      )}

      {/* Hazard / Obstacle / Barrier */}
      {isMaster && (
        <div style={{
          padding: 12, background: 'var(--bg-surface)', borderRadius: 'var(--radius)',
          border: '1px solid var(--border)',
        }}>
          <label>Obstacle / Hazard / Barrier</label>
          <div style={{ display: 'flex', gap: 4, marginTop: 6, marginBottom: 8 }}>
            {['obstacle', 'hazard', 'barrier'].map(ty => (
              <button
                key={ty}
                onClick={() => setHazardType(ty)}
                style={{
                  flex: 1, padding: '5px 8px', fontSize: 10, borderRadius: 3,
                  border: `1px solid ${hazardType === ty ? 'var(--gold)' : 'var(--border)'}`,
                  background: hazardType === ty ? 'var(--gold-dim)' : 'transparent',
                  color: hazardType === ty ? 'var(--bg-void)' : 'var(--text-faded)',
                  cursor: 'pointer', fontFamily: 'var(--font-display)',
                  textTransform: 'uppercase', letterSpacing: '0.05em',
                }}
              >
                {ty === 'obstacle' ? '🧱 ' + t('obstacle', lang) : ty === 'hazard' ? '⚡ ' + t('hazard', lang) : '🚧 ' + t('barrier', lang)}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 6 }}>
            <select
              value={hazardTarget?.id || ''}
              onChange={e => {
                const p = activeParts.find(p => p.id === parseInt(e.target.value))
                setHazardTarget(p || null)
                setHazardResult(null)
              }}
              style={{ flex: 1, fontSize: 12, padding: '6px 8px' }}
            >
              <option value="">Select target...</option>
              {activeParts.map(p => (
                <option key={p.id} value={p.id}>{p.character_name}</option>
              ))}
            </select>
            <select value={hazardDifficulty} onChange={e => setHazardDifficulty(e.target.value)}
              style={{ width: 100, fontSize: 12, padding: '6px 8px' }}>
              <option value="regular">Regular</option>
              <option value="hard">Hard</option>
              <option value="extreme">Extreme</option>
            </select>
            <button
              className="btn btn-sm"
              disabled={!hazardTarget}
              onClick={handleHazardCheck}
              style={{ fontSize: 10, padding: '4px 10px' }}
            >
              Check
            </button>
          </div>

          <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 6, lineHeight: 1.5 }}>
            <strong>Obstacle:</strong> Fail = lose 1 movement.{' '}
            <strong>Hazard:</strong> Fail = lose 1 movement + 1d6 damage.{' '}
            <strong>Barrier:</strong> Fail = lose 1 movement, must attempt again next round.
          </div>
        </div>
      )}

      {/* Hazard result */}
      {hazardResult && (
        <div className="fade-in" style={{
          padding: 10, background: 'var(--bg-surface)', borderRadius: 'var(--radius)',
          marginTop: 8, fontSize: 13, border: '1px solid var(--border)',
        }}>
          <strong style={{ color: 'var(--gold)' }}>{hazardResult.name}</strong>
          {' faces '}
          <span style={{ color: 'var(--text-parchment)' }}>
            {hazardResult.type} ({hazardResult.difficulty})
          </span>
          {': rolled '}
          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{hazardResult.roll}</span>
          {' vs '}
          <span style={{ fontFamily: 'var(--font-mono)' }}>{hazardResult.threshold}</span>
          {' → '}
          <span className={hazardResult.success ? 'dice-regular' : 'dice-fail'} style={{ fontWeight: 700 }}>
            {hazardResult.success ? t('pass', lang) : t('fail', lang)}
          </span>
          {!hazardResult.success && (
            <span style={{ color: 'var(--text-dim)', marginLeft: 6, fontFamily: 'var(--font-mono)', fontSize: 11 }}>
              (−1 mov{hazardResult.hpLost > 0 ? `, −${hazardResult.hpLost} HP` : ''})
            </span>
          )}
        </div>
      )}

      {/* Chase rules reference */}
      <div style={{
        marginTop: 12, fontSize: 10, color: 'var(--text-dim)', lineHeight: 1.6,
        padding: '8px 10px', background: 'var(--bg-void)', borderRadius: 3,
      }}>
        <strong style={{ color: 'var(--text-faded)' }}>Chase Rules:</strong>{' '}
        Each round, participants make a <strong>Speed Check</strong> (CON roll). Pass = +1 movement, Fail = −1 movement.{' '}
        The Keeper can place <strong>obstacles</strong> (skill check, fail = −1 mov), <strong>hazards</strong> (fail = −1 mov + damage),{' '}
        or <strong>barriers</strong> (must pass to continue). Chase ends when the quarry escapes (enough distance) or is caught (0 movement).
      </div>
    </div>
  )
}
