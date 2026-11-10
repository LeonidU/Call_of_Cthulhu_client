import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { apiFetch, getUser } from '../api'
import CharacterSheet from '../components/CharacterSheet'
import EncounterPanel from '../components/EncounterPanel'
import TimerBar from '../components/TimerBar'
import LangSwitch from '../components/LangSwitch'
import { t, getLang, pickName } from '../i18n'

const DICE_OPTIONS = ['1d2', '1d3', '1d4', '1d6', '1d8', '1d10', '1d12', '1d20', '1d100', '2d6', '3d6']

export default function GamePage() {
  const { partyId } = useParams()
  const navigate = useNavigate()
  const user = getUser()
  const lang = getLang()
  const wsRef = useRef(null)

  const [party, setParty] = useState(null)
  const [character, setCharacter] = useState(null)
  const [artifacts, setArtifacts] = useState([])
  const [actions, setActions] = useState([])
  const [skills, setSkills] = useState([])
  const [allSkills, setAllSkills] = useState([])
  const [isMaster, setIsMaster] = useState(false)
  const [loading, setLoading] = useState(true)
  const [partyCharacters, setPartyCharacters] = useState([])
  const encounterRefreshRef = useRef(null)

  // Dice state
  const [selectedDice, setSelectedDice] = useState('1d100')
  const [selectedSkill, setSelectedSkill] = useState('')
  const [rolling, setRolling] = useState(false)
  const [lastRoll, setLastRoll] = useState(null)

  // GM state
  const [gmTab, setGmTab] = useState('artifacts') // artifacts, members, events
  const [newArtifactName, setNewArtifactName] = useState('')
  const [newArtifactDesc, setNewArtifactDesc] = useState('')
  const [newArtifactFile, setNewArtifactFile] = useState(null)
  const [newMemberName, setNewMemberName] = useState('')
  const [gmDice, setGmDice] = useState('1d100')
  const [gmEventLabel, setGmEventLabel] = useState('')

  // Game time state
  const [timeInput, setTimeInput] = useState('')
  const [timeAdvAmount, setTimeAdvAmount] = useState('1')
  const [timeAdvUnit, setTimeAdvUnit] = useState('hour')

  // Active tab for players
  const [activePanel, setActivePanel] = useState('dice') // dice, character, battle, spells, artifacts, log

  // Spells state
  const [allSpells, setAllSpells] = useState([])
  const [castSpellId, setCastSpellId] = useState('')
  const [castTarget, setCastTarget] = useState('')
  const [castNpcName, setCastNpcName] = useState('')
  const [lastCastResult, setLastCastResult] = useState(null)

  // Artifact lightbox
  const [lightboxArtifact, setLightboxArtifact] = useState(null)

  const loadData = useCallback(async () => {
    try {
      const [partyData, allSk] = await Promise.all([
        apiFetch(`/api/parties/${partyId}`),
        apiFetch('/api/skills'),
      ])
      setParty(partyData)
      setAllSkills(allSk)

      const membership = partyData.members.find(m => m.user_id === user.id)
      const master = membership?.role === 'master'
      setIsMaster(master)

      // Load character (if player)
      try {
        const charData = await apiFetch(`/api/characters/my/${partyId}`)
        if (charData) {
          setCharacter(charData)
          setSkills(charData.skills || [])
        } else if (!master) {
          navigate(`/party/${partyId}/create-character`)
          return
        }
      } catch {
        if (!master) {
          navigate(`/party/${partyId}/create-character`)
          return
        }
      }

      const [artifactData, actionData, charList, spellData] = await Promise.all([
        apiFetch(`/api/parties/${partyId}/artifacts`),
        apiFetch(`/api/parties/${partyId}/actions?limit=50`),
        apiFetch(`/api/parties/${partyId}/characters`).catch(() => []),
        apiFetch('/api/spells').catch(() => []),
      ])
      setArtifacts(artifactData)
      setActions(actionData)
      setPartyCharacters(charList)
      setAllSpells(spellData)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [partyId, user.id, navigate])

  useEffect(() => { loadData() }, [loadData])

  // WebSocket
  useEffect(() => {
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const ws = new WebSocket(`${proto}//${window.location.host}/ws/${partyId}`)
    wsRef.current = ws

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data)
      if (msg.type === 'dice_roll') {
        setActions(prev => [{
          id: Date.now(), action_type: 'dice_roll', payload: msg,
          username: msg.roller, created_at: new Date().toISOString(),
        }, ...prev])
      } else if (msg.type === 'artifact_revealed') {
        setArtifacts(prev => {
          const exists = prev.find(a => a.id === msg.artifact.id)
          if (exists) {
            return prev.map(a => a.id === msg.artifact.id ? { ...a, is_revealed: true } : a)
          }
          return [...prev, { ...msg.artifact, is_revealed: true }]
        })
        setActions(prev => [{
          id: Date.now(), action_type: 'artifact_reveal',
          payload: { name: msg.artifact.name },
          username: 'Keeper', created_at: new Date().toISOString(),
        }, ...prev])
      } else if (msg.type === 'gm_event') {
        setActions(prev => [{
          id: Date.now(), action_type: 'gm_event', payload: msg,
          username: 'Keeper', created_at: new Date().toISOString(),
        }, ...prev])
      } else if (msg.type === 'stat_change') {
        // Update character if it's ours
        setCharacter(prev => {
          if (prev && prev.id === msg.character_id) {
            return { ...prev, [msg.field]: msg.new_value }
          }
          return prev
        })
        setActions(prev => [{
          id: Date.now(), action_type: 'stat_change', payload: msg,
          username: msg.changed_by, created_at: new Date().toISOString(),
        }, ...prev])
      } else if (msg.type === 'skill_improve') {
        setActions(prev => [{
          id: Date.now(), action_type: 'skill_improve', payload: msg,
          username: msg.character_name, created_at: new Date().toISOString(),
        }, ...prev])
      } else if (msg.type === 'encounter_started' || msg.type === 'encounter_updated' || msg.type === 'encounter_ended') {
        // Trigger encounter panel refresh
        if (encounterRefreshRef.current) encounterRefreshRef.current()
        if (msg.type === 'damage_applied' || msg.type === 'encounter_started' || msg.type === 'encounter_ended') {
          setActions(prev => [{
            id: Date.now(), action_type: msg.type, payload: msg,
            username: 'Keeper', created_at: new Date().toISOString(),
          }, ...prev])
        }
      } else if (msg.type === 'damage_applied') {
        if (encounterRefreshRef.current) encounterRefreshRef.current()
        // Update local character HP if we're the target
        setCharacter(prev => {
          if (prev && prev.name === msg.target) {
            return { ...prev, hp_current: msg.new_hp }
          }
          return prev
        })
        setActions(prev => [{
          id: Date.now(), action_type: 'damage', payload: msg,
          username: 'Keeper', created_at: new Date().toISOString(),
        }, ...prev])
      } else if (msg.type === 'time_changed' || msg.type === 'time_advanced') {
        setParty(prev => prev ? { ...prev, game_time: msg.new_time, game_era: msg.game_era || prev.game_era } : prev)
        setActions(prev => [{
          id: Date.now(), action_type: msg.type, payload: msg,
          username: 'Keeper', created_at: new Date().toISOString(),
        }, ...prev])
      } else if (msg.type === 'firearm_attack') {
        if (encounterRefreshRef.current) encounterRefreshRef.current()
        setCharacter(prev => {
          if (prev && prev.name === msg.target) {
            return { ...prev, hp_current: msg.target_hp }
          }
          return prev
        })
        setActions(prev => [{
          id: Date.now(), action_type: 'firearm_attack', payload: msg,
          username: 'Keeper', created_at: new Date().toISOString(),
        }, ...prev])
      } else if (msg.type === 'weapon_reloaded') {
        if (encounterRefreshRef.current) encounterRefreshRef.current()
        setActions(prev => [{
          id: Date.now(), action_type: 'weapon_reloaded', payload: msg,
          username: msg.participant, created_at: new Date().toISOString(),
        }, ...prev])
      } else if (msg.type === 'spell_cast') {
        // Update character MP/SAN if it's ours
        setCharacter(prev => {
          if (prev && prev.name === msg.caster && msg.mp_remaining != null) {
            return { ...prev, mp_current: msg.mp_remaining, sanity_current: msg.san_remaining }
          }
          return prev
        })
        setActions(prev => [{
          id: Date.now(), action_type: 'spell_cast', payload: msg,
          username: msg.caster, created_at: new Date().toISOString(),
        }, ...prev])
      } else if (msg.type === 'spell_learned') {
        setActions(prev => [{
          id: Date.now(), action_type: 'spell_learned', payload: msg,
          username: msg.character_name, created_at: new Date().toISOString(),
        }, ...prev])
      } else if (msg.type === 'melee_attack') {
        if (encounterRefreshRef.current) encounterRefreshRef.current()
        setCharacter(prev => {
          if (prev && prev.name === msg.defender) return { ...prev, hp_current: msg.defender_hp }
          return prev
        })
        setActions(prev => [{
          id: Date.now(), action_type: 'melee_attack', payload: msg,
          username: 'Keeper', created_at: new Date().toISOString(),
        }, ...prev])
      } else if (msg.type === 'timer_update') {
        setParty(prev => prev ? { ...prev,
          timer_label: msg.timer_label,
          timer_total_seconds: msg.timer_total_seconds,
          timer_remaining_seconds: msg.timer_remaining_seconds,
          timer_running: msg.timer_running,
        } : prev)
      } else if (msg.type === 'chase_speed' || msg.type === 'chase_hazard') {
        if (encounterRefreshRef.current) encounterRefreshRef.current()
        setActions(prev => [{
          id: Date.now(), action_type: msg.type, payload: msg,
          username: msg.participant, created_at: new Date().toISOString(),
        }, ...prev])
      }
    }

    return () => ws.close()
  }, [partyId])

  // ── Dice Roll ──────────────────────────────

  async function handleRoll() {
    setRolling(true)
    try {
      const body = {
        party_id: parseInt(partyId),
        dice: selectedDice,
        skill_id: selectedSkill ? parseInt(selectedSkill) : null,
      }
      const result = await apiFetch('/api/dice/roll', { method: 'POST', body })
      setLastRoll(result)
    } catch (err) {
      console.error(err)
    } finally {
      setRolling(false)
    }
  }

  // ── GM Actions ─────────────────────────────

  async function handleAddArtifact(e) {
    e.preventDefault()
    if (!newArtifactFile || !newArtifactName) return
    const fd = new FormData()
    fd.append('name', newArtifactName)
    fd.append('description', newArtifactDesc)
    fd.append('file', newArtifactFile)
    try {
      await apiFetch(`/api/parties/${partyId}/artifacts`, {
        method: 'POST', body: fd, isFormData: true,
      })
      setNewArtifactName('')
      setNewArtifactDesc('')
      setNewArtifactFile(null)
      const data = await apiFetch(`/api/parties/${partyId}/artifacts`)
      setArtifacts(data)
    } catch (err) { console.error(err) }
  }

  async function handleReveal(artifactId) {
    try {
      await apiFetch(`/api/artifacts/${artifactId}/reveal`, { method: 'POST' })
      const data = await apiFetch(`/api/parties/${partyId}/artifacts`)
      setArtifacts(data)
    } catch (err) { console.error(err) }
  }

  async function handleAddMember(e) {
    e.preventDefault()
    if (!newMemberName) return
    const fd = new FormData()
    fd.append('username', newMemberName)
    try {
      await apiFetch(`/api/parties/${partyId}/add-member`, {
        method: 'POST', body: fd, isFormData: true,
      })
      setNewMemberName('')
      const data = await apiFetch(`/api/parties/${partyId}`)
      setParty(data)
    } catch (err) { alert(err.message) }
  }

  async function handleGmRoll() {
    setRolling(true)
    try {
      const body = { party_id: parseInt(partyId), dice: gmDice }
      await apiFetch('/api/dice/roll', { method: 'POST', body })
    } catch (err) { console.error(err) }
    setRolling(false)
  }

  if (loading) {
    return (
      <div className="page-center">
        <p style={{ color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', fontSize: 13 }}>
          {t('openingGate', lang)}
        </p>
      </div>
    )
  }

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* ── Header Bar ──────────────────────── */}
      <header style={{
        padding: '10px 20px', background: 'var(--bg-deep)',
        borderBottom: '1px solid var(--border)', display: 'flex',
        justifyContent: 'space-between', alignItems: 'center', flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <h2
            style={{ fontSize: 16, cursor: 'pointer' }}
            onClick={() => navigate('/parties')}
            title="Back to parties"
          >
            ← {party?.name}
          </h2>
          {isMaster && (
            <span style={{
              fontSize: 10, padding: '2px 8px', borderRadius: 3,
              background: 'var(--gold-dim)', color: 'var(--bg-void)',
              fontFamily: 'var(--font-mono)', letterSpacing: '0.1em',
            }}>
              {t('keeper', lang)}
            </span>
          )}
        </div>
        {/* Game Time */}
        {party?.game_time && (
          <div style={{
            padding: '4px 12px', background: 'var(--bg-surface)',
            borderRadius: 'var(--radius)', border: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>⏱</span>
            <span style={{
              fontSize: 13, fontFamily: 'var(--font-body)', color: 'var(--gold)',
              fontStyle: 'italic',
            }}>
              {party.game_time}
            </span>
            {party.game_era && (
              <span style={{
                fontSize: 9, padding: '1px 5px', borderRadius: 3,
                background: 'var(--bg-deep)', color: 'var(--text-dim)',
                fontFamily: 'var(--font-mono)',
              }}>
                {party.game_era}
              </span>
            )}
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 13 }}>
          {character && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {character.avatar_path && (
                <img src={character.avatar_path} alt=""
                  style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--border)' }} />
              )}
              <span style={{ color: 'var(--text-faded)' }}>{character.name}</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-dim)' }}>
                HP {character.hp_current}/{character.hp_max} · SAN {character.sanity_current}/{character.sanity_max}
              </span>
            </div>
          )}
          <LangSwitch compact />
          <span style={{
            fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-dim)',
            padding: '3px 8px', background: 'var(--bg-surface)', borderRadius: 3,
          }}>
            {party?.invite_code}
          </span>
        </div>
      </header>

      {/* ── Session Timer ───────────────────── */}
      <TimerBar
        partyId={partyId}
        isMaster={isMaster}
        timer={party}
        onTimerChange={(res) => setParty(prev => prev ? { ...prev, ...res } : prev)}
      />

      {/* ── Main Content ────────────────────── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* Left: Game Panels */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* Panel Tabs */}
          <div style={{
            display: 'flex', borderBottom: '1px solid var(--border)', background: 'var(--bg-surface)',
          }}>
            {[
              { key: 'dice', label: '⚄ ' + t('tabDice', lang) },
              { key: 'character', label: '📋 ' + t('tabCharacter', lang) },
              { key: 'battle', label: '⚔ ' + t('tabBattle', lang) },
              { key: 'spells', label: '✦ ' + t('tabSpells', lang) },
              { key: 'artifacts', label: '📜 ' + t('tabArtifacts', lang) },
              { key: 'log', label: '🕮 ' + t('tabLog', lang) },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActivePanel(tab.key)}
                style={{
                  padding: '10px 16px', background: 'transparent', border: 'none',
                  borderBottom: activePanel === tab.key ? '2px solid var(--gold)' : '2px solid transparent',
                  color: activePanel === tab.key ? 'var(--gold)' : 'var(--text-dim)',
                  fontFamily: 'var(--font-display)', fontSize: 11, letterSpacing: '0.08em',
                  textTransform: 'uppercase', cursor: 'pointer', transition: 'all 0.2s',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Panel Content */}
          <div style={{ flex: 1, overflow: 'auto', padding: 20 }}>
            {activePanel === 'dice' && (
              <DicePanel
                lang={lang}
                skills={skills}
                allSkills={allSkills}
                selectedDice={selectedDice}
                setSelectedDice={setSelectedDice}
                selectedSkill={selectedSkill}
                setSelectedSkill={setSelectedSkill}
                rolling={rolling}
                handleRoll={handleRoll}
                lastRoll={lastRoll}
                character={character}
              />
            )}
            {activePanel === 'character' && (
              <CharacterPartyView
                lang={lang}
                character={character}
                isMaster={isMaster}
                allSkills={allSkills}
                partyCharacters={partyCharacters}
                onUpdate={(updated) => {
                  // Update own character if it's ours
                  if (character && updated.id === character.id) {
                    setCharacter(updated)
                    setSkills(updated.skills || [])
                  }
                  // Update in party list
                  setPartyCharacters(prev =>
                    prev.map(c => c.id === updated.id ? updated : c)
                  )
                }}
              />
            )}
            {activePanel === 'battle' && (
              <EncounterPanel
                lang={lang}
                partyId={partyId}
                isMaster={isMaster}
                partyCharacters={partyCharacters}
                myCharacterId={character?.id || null}
                onEncounterChange={(cb) => { encounterRefreshRef.current = cb }}
              />
            )}
            {activePanel === 'spells' && (
              <SpellsPanel
                lang={lang}
                character={character}
                isMaster={isMaster}
                allSpells={allSpells}
                partyId={partyId}
                partyCharacters={partyCharacters}
                onCharUpdate={(updated) => {
                  if (character && updated.id === character.id) {
                    setCharacter(updated)
                    setSkills(updated.skills || [])
                  }
                  setPartyCharacters(prev => prev.map(c => c.id === updated.id ? updated : c))
                }}
                castSpellId={castSpellId} setCastSpellId={setCastSpellId}
                castTarget={castTarget} setCastTarget={setCastTarget}
                castNpcName={castNpcName} setCastNpcName={setCastNpcName}
                lastCastResult={lastCastResult} setLastCastResult={setLastCastResult}
              />
            )}
            {activePanel === 'artifacts' && (
              <ArtifactsPanel
                lang={lang}
                artifacts={artifacts}
                isMaster={isMaster}
                onReveal={handleReveal}
                onClickArtifact={setLightboxArtifact}
              />
            )}
            {activePanel === 'log' && (
              <ActionLogPanel actions={actions} lang={lang} />
            )}
          </div>
        </div>

        {/* Right Sidebar: GM Panel or Party Info */}
        {isMaster && (
          <div style={{
            width: 340, borderLeft: '1px solid var(--border)',
            background: 'var(--bg-deep)', display: 'flex', flexDirection: 'column',
            overflow: 'hidden',
          }}>
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border)' }}>
              {['artifacts', 'members', 'events'].map(tab => (
                <button
                  key={tab}
                  onClick={() => setGmTab(tab)}
                  style={{
                    flex: 1, padding: '10px 8px', background: 'transparent', border: 'none',
                    borderBottom: gmTab === tab ? '2px solid var(--gold)' : '2px solid transparent',
                    color: gmTab === tab ? 'var(--gold)' : 'var(--text-dim)',
                    fontFamily: 'var(--font-display)', fontSize: 10, letterSpacing: '0.1em',
                    textTransform: 'uppercase', cursor: 'pointer',
                  }}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
              {gmTab === 'artifacts' && (
                <div>
                  <h4 style={{ fontSize: 13, marginBottom: 12 }}>Add Artifact</h4>
                  <form onSubmit={handleAddArtifact}>
                    <div className="field">
                      <input placeholder="Artifact name" value={newArtifactName}
                        onChange={e => setNewArtifactName(e.target.value)} />
                    </div>
                    <div className="field">
                      <textarea placeholder="Description (optional)" value={newArtifactDesc}
                        onChange={e => setNewArtifactDesc(e.target.value)}
                        rows={2} style={{ resize: 'vertical' }} />
                    </div>
                    <div className="field">
                      <input type="file" accept="image/*"
                        onChange={e => setNewArtifactFile(e.target.files?.[0] || null)}
                        style={{ fontSize: 12 }} />
                    </div>
                    <button type="submit" className="btn btn-sm btn-primary" style={{ width: '100%' }}>
                      Upload Artifact
                    </button>
                  </form>

                  <hr className="divider" />
                  <h4 style={{ fontSize: 13, marginBottom: 8 }}>All Artifacts</h4>
                  {artifacts.map(a => (
                    <div key={a.id} style={{
                      display: 'flex', gap: 8, alignItems: 'center',
                      padding: '8px 0', borderBottom: '1px solid var(--border)',
                    }}>
                      <img src={a.image_path} alt="" style={{
                        width: 40, height: 40, objectFit: 'cover', borderRadius: 3,
                        border: '1px solid var(--border)',
                      }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13 }}>{a.name}</div>
                        <div style={{
                          fontSize: 10, fontFamily: 'var(--font-mono)',
                          color: a.is_revealed ? 'var(--eldritch-green)' : 'var(--text-dim)',
                        }}>
                          {a.is_revealed ? 'REVEALED' : 'HIDDEN'}
                        </div>
                      </div>
                      {!a.is_revealed && (
                        <button className="btn btn-sm" onClick={() => handleReveal(a.id)}
                          style={{ fontSize: 10, padding: '4px 10px' }}>
                          Reveal
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {gmTab === 'members' && (
                <div>
                  <h4 style={{ fontSize: 13, marginBottom: 12 }}>Add Player</h4>
                  <form onSubmit={handleAddMember}>
                    <div className="field">
                      <input placeholder="Username" value={newMemberName}
                        onChange={e => setNewMemberName(e.target.value)} />
                    </div>
                    <button type="submit" className="btn btn-sm" style={{ width: '100%' }}>
                      Add to Party
                    </button>
                  </form>

                  <hr className="divider" />
                  <h4 style={{ fontSize: 13, marginBottom: 8 }}>Party Members</h4>
                  {party?.members.map(m => (
                    <div key={m.user_id} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: 14,
                    }}>
                      <span>{m.display_name}</span>
                      <span style={{
                        fontSize: 10, fontFamily: 'var(--font-mono)',
                        color: m.role === 'master' ? 'var(--gold)' : 'var(--text-dim)',
                      }}>
                        {m.role.toUpperCase()}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {gmTab === 'events' && (
                <div>
                  {/* Game Time Management */}
                  <h4 style={{ fontSize: 13, marginBottom: 10 }}>⏱ Game Time</h4>
                  <div style={{
                    padding: 10, background: 'var(--bg-surface)', borderRadius: 'var(--radius)',
                    border: '1px solid var(--border)', marginBottom: 16,
                  }}>
                    {party?.game_time && (
                      <p style={{
                        fontSize: 14, fontStyle: 'italic', color: 'var(--gold)',
                        marginBottom: 8, textAlign: 'center',
                      }}>
                        {party.game_time}
                      </p>
                    )}
                    <div className="field" style={{ marginBottom: 8 }}>
                      <input
                        placeholder="Set time (e.g. March 15, 1925 — 3:00 PM)"
                        value={timeInput}
                        onChange={e => setTimeInput(e.target.value)}
                        style={{ fontSize: 12 }}
                      />
                    </div>
                    <button className="btn btn-sm" onClick={async () => {
                      if (!timeInput.trim()) return
                      try {
                        const updated = await apiFetch(`/api/parties/${partyId}/time`, {
                          method: 'PATCH', body: { game_time: timeInput },
                        })
                        setParty(prev => ({ ...prev, game_time: updated.game_time }))
                        setTimeInput('')
                      } catch (err) { console.error(err) }
                    }} style={{ width: '100%', fontSize: 10, marginBottom: 8 }}>
                      Set Time
                    </button>

                    <div style={{ display: 'flex', gap: 4 }}>
                      <input type="number" min={1} value={timeAdvAmount}
                        onChange={e => setTimeAdvAmount(e.target.value)}
                        style={{ width: 50, fontSize: 12, textAlign: 'center', padding: '4px 6px' }} />
                      <select value={timeAdvUnit} onChange={e => setTimeAdvUnit(e.target.value)}
                        style={{ flex: 1, fontSize: 12, padding: '4px 6px' }}>
                        <option value="minute">Minutes</option>
                        <option value="hour">Hours</option>
                        <option value="day">Days</option>
                        <option value="week">Weeks</option>
                        <option value="month">Months</option>
                      </select>
                      <button className="btn btn-sm" onClick={async () => {
                        try {
                          const updated = await apiFetch(`/api/parties/${partyId}/time/advance`, {
                            method: 'POST',
                            body: { amount: parseInt(timeAdvAmount) || 1, unit: timeAdvUnit },
                          })
                          setParty(prev => ({ ...prev, game_time: updated.game_time }))
                        } catch (err) { console.error(err) }
                      }} style={{ fontSize: 10, whiteSpace: 'nowrap', padding: '4px 8px' }}>
                        Advance →
                      </button>
                    </div>
                  </div>

                  <hr className="divider" />

                  <h4 style={{ fontSize: 13, marginBottom: 12 }}>GM Dice Roll</h4>
                  <div className="field">
                    <select value={gmDice} onChange={e => setGmDice(e.target.value)}>
                      {DICE_OPTIONS.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                  <button className="btn btn-sm btn-primary" onClick={handleGmRoll}
                    disabled={rolling} style={{ width: '100%', marginBottom: 20 }}>
                    {rolling ? 'Rolling...' : 'Roll for NPC / Event'}
                  </button>

                  <h4 style={{ fontSize: 13, marginBottom: 8 }}>Quick Reference</h4>
                  <div style={{ fontSize: 12, color: 'var(--text-faded)', lineHeight: 1.8 }}>
                    <p><strong style={{ color: 'var(--gold)' }}>Opposed rolls:</strong> Both sides roll d100 against skill.</p>
                    <p><strong style={{ color: 'var(--gold)' }}>Chase:</strong> CON roll to keep pace, DEX for obstacles.</p>
                    <p><strong style={{ color: 'var(--gold)' }}>Combat:</strong> Fighting vs Dodge/Fighting. Damage = weapon die + damage bonus.</p>
                    <p><strong style={{ color: 'var(--gold)' }}>Sanity:</strong> 0/1d6 for minor, 1/1d10 for major, 1d10/1d100 for Great Old Ones.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightboxArtifact && (
        <div
          onClick={() => setLightboxArtifact(null)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000, cursor: 'pointer',
          }}
        >
          <div style={{ maxWidth: '90vw', maxHeight: '90vh', textAlign: 'center' }}
            onClick={e => e.stopPropagation()}>
            <img src={lightboxArtifact.image_path} alt={lightboxArtifact.name}
              style={{ maxWidth: '100%', maxHeight: '80vh', borderRadius: 'var(--radius-lg)', border: '2px solid var(--border)' }} />
            <h3 style={{ marginTop: 12, fontSize: 18 }}>{lightboxArtifact.name}</h3>
            {lightboxArtifact.description && (
              <p style={{ color: 'var(--text-faded)', marginTop: 4, fontSize: 14, maxWidth: 500, margin: '4px auto 0' }}>
                {lightboxArtifact.description}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Dice Panel ────────────────────────────── */

function DicePanel({ lang, skills, allSkills, selectedDice, setSelectedDice, selectedSkill, setSelectedSkill, rolling, handleRoll, lastRoll, character }) {
  // Build complete skill list: merge character allocations with all skills
  const mergedSkills = React.useMemo(() => {
    const charSkillMap = {}
    for (const s of skills) {
      charSkillMap[s.skill_id] = s
    }
    return allSkills.map(sk => {
      const allocated = charSkillMap[sk.id]
      const dispName = pickName(sk.name, sk.name_ru)
      if (allocated) {
        return { skill_id: sk.id, skill_name: dispName, total: allocated.total, trained: true }
      }
      // Dynamic base values
      let base = sk.base_value
      if (character) {
        if (sk.name === 'Dodge') base = Math.floor(character.dex_stat / 2)
        else if (sk.name === 'Language (Own)') base = character.edu_stat
      }
      return { skill_id: sk.id, skill_name: dispName, total: base, trained: false }
    }).sort((a, b) => a.skill_name.localeCompare(b.skill_name))
  }, [allSkills, skills, character])

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
        {/* Dice selector */}
        <div>
          <label>{t('dice', lang)}</label>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
            {DICE_OPTIONS.map(d => (
              <button
                key={d}
                onClick={() => setSelectedDice(d)}
                style={{
                  padding: '6px 12px', borderRadius: 'var(--radius)',
                  border: `1px solid ${selectedDice === d ? 'var(--gold)' : 'var(--border)'}`,
                  background: selectedDice === d ? 'var(--gold-dim)' : 'var(--bg-deep)',
                  color: selectedDice === d ? 'var(--bg-void)' : 'var(--text-faded)',
                  fontFamily: 'var(--font-mono)', fontSize: 13, cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        {/* Skill selector — shows ALL skills */}
        {mergedSkills.length > 0 && (
          <div style={{ minWidth: 240, flex: 1 }}>
            <label>{t('skillForChecks', lang)}</label>
            <select
              value={selectedSkill}
              onChange={e => setSelectedSkill(e.target.value)}
              style={{ marginTop: 4 }}
            >
              <option value="">{t('noSkill', lang)}</option>
              {mergedSkills.map(sk => (
                <option key={sk.skill_id} value={sk.skill_id}>
                  {sk.skill_name} ({sk.total}%)
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <button
        className="btn btn-primary"
        onClick={handleRoll}
        disabled={rolling}
        style={{
          marginTop: 20, padding: '14px 40px', fontSize: 16,
          animation: rolling ? 'pulse-glow 0.6s infinite' : 'none',
        }}
      >
        {rolling ? t('rolling', lang) : `${t('roll', lang)} ${selectedDice}`}
      </button>

      {/* Result Display */}
      {lastRoll && (
        <div className="fade-in" style={{
          marginTop: 24, padding: 24, background: 'var(--bg-deep)',
          borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)',
          textAlign: 'center',
        }}>
          <div style={{
            fontFamily: 'var(--font-mono)', fontSize: 56, fontWeight: 700,
            lineHeight: 1,
          }}
            className={lastRoll.success_level ? `dice-${lastRoll.success_level}` : ''}
          >
            {lastRoll.total}
          </div>
          <div style={{ fontSize: 14, color: 'var(--text-dim)', marginTop: 8, fontFamily: 'var(--font-mono)' }}>
            {lastRoll.dice}: [{lastRoll.rolls.join(', ')}]
          </div>
          {lastRoll.skill_name && (
            <div style={{ marginTop: 12, fontSize: 15 }}>
              <span style={{ color: 'var(--text-faded)' }}>{lastRoll.skill_name}</span>
              <span style={{ color: 'var(--text-dim)', margin: '0 8px' }}>vs</span>
              <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--gold)' }}>{lastRoll.skill_value}%</span>
            </div>
          )}
          {lastRoll.success_level && (
            <div style={{
              marginTop: 8, fontSize: 16, fontFamily: 'var(--font-display)',
              letterSpacing: '0.15em', textTransform: 'uppercase',
            }}
              className={`dice-${lastRoll.success_level}`}
            >
              {lastRoll.success_level === 'critical' ? '★ ' + t('criticalSuccess', lang) + ' ★' :
                lastRoll.success_level === 'extreme' ? t('extremeSuccess', lang) :
                  lastRoll.success_level === 'hard' ? t('hardSuccess', lang) :
                    lastRoll.success_level === 'regular' ? t('success', lang) :
                      lastRoll.success_level === 'fumble' ? '☠ ' + t('fumble', lang) + ' ☠' : t('failure', lang)}
            </div>
          )}
        </div>
      )}

      {/* ALL character skills */}
      {character && mergedSkills.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <hr className="divider" />
          <h4 style={{ fontSize: 12, color: 'var(--text-dim)', letterSpacing: '0.1em', marginBottom: 10 }}>
            {t('allSkills', lang)}
          </h4>
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: 3, fontSize: 13,
          }}>
            {mergedSkills.map(sk => (
              <div key={sk.skill_id} style={{
                display: 'flex', justifyContent: 'space-between',
                padding: '3px 8px', borderRadius: 3,
                background: sk.trained ? 'var(--bg-card)' : 'var(--bg-deep)',
                borderLeft: sk.trained ? '2px solid var(--gold-dim)' : '2px solid transparent',
              }}>
                <span style={{ color: sk.trained ? 'var(--text-parchment)' : 'var(--text-dim)' }}>
                  {sk.skill_name}
                </span>
                <span style={{
                  fontFamily: 'var(--font-mono)',
                  color: sk.trained ? 'var(--gold)' : 'var(--text-dim)',
                }}>
                  {sk.total}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Artifacts Panel ───────────────────────── */

function ArtifactsPanel({ artifacts, isMaster, onReveal, onClickArtifact, lang }) {
  const revealed = artifacts.filter(a => a.is_revealed)
  const hidden = artifacts.filter(a => !a.is_revealed)

  return (
    <div className="fade-in">
      {revealed.length === 0 && !isMaster && (
        <p style={{ color: 'var(--text-dim)', textAlign: 'center', padding: 40 }}>
          {t('noArtifacts', lang)}
        </p>
      )}

      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
        gap: 16,
      }}>
        {revealed.map(a => (
          <div
            key={a.id}
            className="card fade-in"
            style={{ padding: 0, overflow: 'hidden', cursor: 'pointer', transition: 'transform 0.2s' }}
            onClick={() => onClickArtifact(a)}
            onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.03)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
          >
            <img src={a.image_path} alt={a.name} style={{
              width: '100%', height: 140, objectFit: 'cover',
              borderBottom: '1px solid var(--border)',
            }} />
            <div style={{ padding: '10px 12px' }}>
              <h4 style={{ fontSize: 14, marginBottom: 2 }}>{a.name}</h4>
              {a.description && (
                <p style={{ fontSize: 12, color: 'var(--text-dim)', lineHeight: 1.4 }}>
                  {a.description}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* GM sees hidden artifacts inline */}
      {isMaster && hidden.length > 0 && (
        <>
          <hr className="divider" />
          <h4 style={{ fontSize: 12, color: 'var(--text-dim)', letterSpacing: '0.1em', marginBottom: 12 }}>
            {t('hiddenArtifacts', lang)}
          </h4>
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
            gap: 16,
          }}>
            {hidden.map(a => (
              <div key={a.id} className="card" style={{ padding: 0, overflow: 'hidden', opacity: 0.6 }}>
                <img src={a.image_path} alt={a.name} style={{
                  width: '100%', height: 120, objectFit: 'cover',
                  borderBottom: '1px solid var(--border)', filter: 'grayscale(0.5)',
                }} />
                <div style={{ padding: '10px 12px' }}>
                  <h4 style={{ fontSize: 13 }}>{a.name}</h4>
                  <button className="btn btn-sm" onClick={() => onReveal(a.id)}
                    style={{ marginTop: 6, width: '100%', fontSize: 10 }}>
                    {t('revealToPlayers', lang)}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

/* ── Action Log Panel ──────────────────────── */

function ActionLogPanel({ actions, lang }) {
  return (
    <div className="fade-in" style={{ maxWidth: 600 }}>
      {actions.length === 0 && (
        <p style={{ color: 'var(--text-dim)', textAlign: 'center', padding: 40 }}>
          {t('noActions', lang)}
        </p>
      )}
      {actions.map(a => (
        <div key={a.id} style={{
          padding: '10px 0', borderBottom: '1px solid var(--bg-deep)',
          fontSize: 14, display: 'flex', gap: 12,
        }}>
          <div style={{
            fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-dim)',
            whiteSpace: 'nowrap', paddingTop: 2, minWidth: 50,
          }}>
            {new Date(a.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
          <div>
            {a.action_type === 'dice_roll' && a.payload && (
              <span>
                <strong style={{ color: 'var(--gold)' }}>{a.payload.roller || a.username}</strong>
                {' rolled '}
                <span style={{ fontFamily: 'var(--font-mono)' }}>{a.payload.dice}</span>
                {' → '}
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}
                  className={a.payload.success_level ? `dice-${a.payload.success_level}` : ''}
                >
                  {a.payload.total}
                </span>
                {a.payload.skill_name && (
                  <span style={{ color: 'var(--text-faded)' }}>
                    {' '}({a.payload.skill_name}: {a.payload.skill_value}% — {a.payload.success_level || 'n/a'})
                  </span>
                )}
              </span>
            )}
            {a.action_type === 'artifact_reveal' && a.payload && (
              <span>
                <strong style={{ color: 'var(--gold)' }}>Keeper</strong>
                {' revealed artifact: '}
                <em style={{ color: 'var(--text-parchment)' }}>{a.payload.name}</em>
              </span>
            )}
            {a.action_type === 'gm_event' && a.payload && (
              <span>
                <strong style={{ color: 'var(--gold)' }}>Keeper</strong>
                {': '}{a.payload.label || JSON.stringify(a.payload)}
              </span>
            )}
            {a.action_type === 'stat_change' && a.payload && (
              <span>
                <strong style={{ color: 'var(--gold)' }}>{a.payload.changed_by || a.username}</strong>
                {' changed '}
                <em>{a.payload.character_name || 'character'}</em>
                {' '}<span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-faded)' }}>{a.payload.field}</span>
                {' '}
                <span style={{ fontFamily: 'var(--font-mono)' }}>
                  {a.payload.old_value} → {a.payload.new_value}
                </span>
              </span>
            )}
            {a.action_type === 'skill_improve' && a.payload && (
              <span>
                <strong style={{ color: 'var(--gold)' }}>{a.payload.character_name}</strong>
                {' improved '}
                <em>{a.payload.skill_name}</em>
                {' '}
                <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--eldritch-green)' }}>
                  {a.payload.old_value} → {a.payload.new_value}
                </span>
              </span>
            )}
            {a.action_type === 'damage' && a.payload && (
              <span>
                <strong style={{ color: 'var(--blood-bright)' }}>
                  {a.payload.target}
                </strong>
                {a.payload.amount > 0 ? ' took ' : ' healed '}
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: a.payload.amount > 0 ? 'var(--blood-bright)' : 'var(--eldritch-green)' }}>
                  {Math.abs(a.payload.amount)} {a.payload.amount > 0 ? 'damage' : 'HP'}
                </span>
                {a.payload.description && (
                  <span style={{ color: 'var(--text-dim)' }}> — {a.payload.description}</span>
                )}
                <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-dim)', marginLeft: 6 }}>
                  (HP {a.payload.old_hp} → {a.payload.new_hp})
                </span>
              </span>
            )}
            {a.action_type === 'encounter_started' && a.payload && (
              <span>
                <strong style={{ color: 'var(--gold)' }}>Keeper</strong>
                {' started '}
                <em style={{ color: 'var(--text-parchment)' }}>
                  {a.payload.encounter_type === 'chase' ? '🏃 ' : '⚔ '}
                  {a.payload.name}
                </em>
              </span>
            )}
            {a.action_type === 'encounter_ended' && a.payload && (
              <span>
                <strong style={{ color: 'var(--gold)' }}>Keeper</strong>
                {' ended encounter: '}
                <em style={{ color: 'var(--text-dim)' }}>{a.payload.name}</em>
              </span>
            )}
            {(a.action_type === 'time_changed' || a.action_type === 'time_advanced') && a.payload && (
              <span>
                <strong style={{ color: 'var(--gold)' }}>Keeper</strong>
                {a.action_type === 'time_advanced' ? ' advanced time ' : ' set time to '}
                <em style={{ color: 'var(--text-parchment)', fontStyle: 'italic' }}>
                  {a.payload.new_time || a.payload.advance || ''}
                </em>
              </span>
            )}
            {a.action_type === 'firearm_attack' && a.payload && (
              <span>
                <strong style={{ color: 'var(--gold)' }}>{a.payload.shooter}</strong>
                {' fires '}
                <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-parchment)' }}>
                  {a.payload.weapon}
                </span>
                {' at '}
                <strong style={{ color: 'var(--blood-bright)' }}>{a.payload.target}</strong>
                {a.payload.results && a.payload.results.map((r, i) => (
                  <span key={i} style={{ marginLeft: 6 }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                      [{r.roll}]
                    </span>
                    {' '}
                    <span className={r.result === 'critical' ? 'dice-critical' :
                      r.result === 'fumble' ? 'dice-fumble' :
                      r.result === 'malfunction' ? 'dice-fumble' :
                      r.result === 'fail' ? 'dice-fail' : 'dice-regular'}
                      style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>
                      {r.result === 'malfunction' ? 'JAM!' : r.result.toUpperCase()}
                    </span>
                    {r.damage > 0 && (
                      <span style={{ color: 'var(--blood-bright)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                        {' '}{r.damage}dmg
                      </span>
                    )}
                  </span>
                ))}
                {a.payload.total_damage > 0 && (
                  <span style={{
                    marginLeft: 8, fontFamily: 'var(--font-mono)', fontWeight: 700,
                    color: 'var(--blood-bright)',
                  }}>
                    Total: {a.payload.total_damage}
                  </span>
                )}
              </span>
            )}
            {a.action_type === 'weapon_reloaded' && a.payload && (
              <span>
                <strong style={{ color: 'var(--gold)' }}>{a.payload.participant}</strong>
                {' reloads '}
                <span style={{ fontFamily: 'var(--font-mono)' }}>{a.payload.weapon}</span>
              </span>
            )}
            {a.action_type === 'spell_cast' && a.payload && (
              <span>
                <strong style={{ color: 'var(--gold)' }}>{a.payload.caster}</strong>
                {' casts '}
                <em style={{ color: 'var(--sanity-blue)' }}>{a.payload.spell}</em>
                {a.payload.target && (
                  <span style={{ color: 'var(--text-dim)' }}> at {a.payload.target}</span>
                )}
                {' — '}
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                  [{a.payload.roll}]
                </span>
                {' '}
                <span className={
                  a.payload.success_level === 'critical' ? 'dice-critical' :
                  a.payload.success_level === 'fumble' ? 'dice-fumble' :
                  a.payload.success ? 'dice-regular' : 'dice-fail'
                } style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>
                  {a.payload.success_level?.toUpperCase()}
                </span>
                <span style={{ color: 'var(--text-dim)', fontSize: 11, fontFamily: 'var(--font-mono)', marginLeft: 6 }}>
                  (−{a.payload.mp_cost}MP −{a.payload.san_cost}SAN)
                </span>
              </span>
            )}
            {a.action_type === 'spell_learned' && a.payload && (
              <span>
                <strong style={{ color: 'var(--gold)' }}>{a.payload.character}</strong>
                {' learned spell '}
                <em style={{ color: 'var(--sanity-blue)' }}>{a.payload.spell}</em>
                {a.payload.san_cost > 0 && (
                  <span style={{ color: 'var(--blood-bright)', fontSize: 11, fontFamily: 'var(--font-mono)', marginLeft: 6 }}>
                    (−{a.payload.san_cost} SAN)
                  </span>
                )}
              </span>
            )}
            {a.action_type === 'melee_attack' && a.payload && (
              <span>
                <strong style={{ color: 'var(--gold)' }}>{a.payload.attacker}</strong>
                {' attacks '}
                <strong style={{ color: 'var(--blood-bright)' }}>{a.payload.defender}</strong>
                {' with '}
                <span style={{ fontFamily: 'var(--font-mono)' }}>{a.payload.weapon}</span>
                {' — '}
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>[{a.payload.attack_roll}]</span>
                {' '}
                <span className={
                  a.payload.attack_level === 'critical' ? 'dice-critical' :
                  a.payload.attack_level === 'fumble' ? 'dice-fumble' :
                  a.payload.attack_success ? 'dice-regular' : 'dice-fail'
                } style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>
                  {a.payload.attack_level?.toUpperCase()}
                </span>
                {a.payload.dodged && (
                  <span style={{ color: 'var(--eldritch-green)', fontSize: 11, marginLeft: 4 }}>DODGED!</span>
                )}
                {a.payload.damage > 0 && !a.payload.dodged && (
                  <span style={{ color: 'var(--blood-bright)', fontFamily: 'var(--font-mono)', fontSize: 12, marginLeft: 4 }}>
                    {a.payload.damage}dmg
                  </span>
                )}
              </span>
            )}
            {a.action_type === 'chase_speed' && a.payload && (
              <span>
                <strong style={{ color: 'var(--gold)' }}>{a.payload.participant}</strong>
                {' speed check '}
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>[{a.payload.roll}]</span>
                {' vs CON '}
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>{a.payload.con_value}</span>
                {' → '}
                <span className={a.payload.success ? 'dice-regular' : 'dice-fail'} style={{ fontWeight: 700, fontFamily: 'var(--font-mono)', fontSize: 11 }}>
                  {a.payload.success ? 'PASS' : 'FAIL'}
                </span>
                <span style={{ color: 'var(--text-dim)', fontSize: 11, fontFamily: 'var(--font-mono)', marginLeft: 4 }}>
                  (mov {a.payload.old_mov}→{a.payload.new_mov})
                </span>
              </span>
            )}
            {a.action_type === 'chase_hazard' && a.payload && (
              <span>
                <strong style={{ color: 'var(--gold)' }}>{a.payload.participant}</strong>
                {' faces '}
                <span style={{ color: 'var(--text-parchment)' }}>{a.payload.hazard_type} ({a.payload.difficulty})</span>
                {' '}
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>[{a.payload.roll}]</span>
                {' → '}
                <span className={a.payload.success ? 'dice-regular' : 'dice-fail'} style={{ fontWeight: 700, fontFamily: 'var(--font-mono)', fontSize: 11 }}>
                  {a.payload.success ? 'PASS' : 'FAIL'}
                </span>
                {!a.payload.success && (
                  <span style={{ color: 'var(--blood-bright)', fontSize: 11, fontFamily: 'var(--font-mono)', marginLeft: 4 }}>
                    (−1 mov{a.payload.hp_lost > 0 ? `, −${a.payload.hp_lost} HP` : ''})
                  </span>
                )}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

/* ── Character Party View ──────────────────── */
/* GM sees all characters with a selector tab; player sees their own */

function CharacterPartyView({ character, isMaster, allSkills, partyCharacters, onUpdate, lang }) {
  const [selectedCharId, setSelectedCharId] = React.useState(null)

  const charsToShow = isMaster ? partyCharacters : (character ? [character] : [])

  // Default to first character
  React.useEffect(() => {
    if (charsToShow.length > 0 && !charsToShow.find(c => c.id === selectedCharId)) {
      setSelectedCharId(charsToShow[0].id)
    }
  }, [charsToShow.length, selectedCharId])

  const activeChar = charsToShow.find(c => c.id === selectedCharId) || charsToShow[0] || null

  if (charsToShow.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-dim)' }}>
        {isMaster
          ? t('noInvestigators', lang)
          : t('noCharacterYet', lang)}
      </div>
    )
  }

  return (
    <div className="fade-in">
      {/* Character selector tabs */}
      {charsToShow.length > 1 && (
        <div style={{
          display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap',
        }}>
          {charsToShow.map(c => (
            <button
              key={c.id}
              onClick={() => setSelectedCharId(c.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '6px 12px', borderRadius: 'var(--radius)',
                border: `1px solid ${selectedCharId === c.id ? 'var(--gold)' : 'var(--border)'}`,
                background: selectedCharId === c.id ? 'var(--bg-card)' : 'var(--bg-deep)',
                color: selectedCharId === c.id ? 'var(--gold)' : 'var(--text-faded)',
                cursor: 'pointer', transition: 'all 0.15s', fontSize: 13,
              }}
            >
              {c.avatar_path && (
                <img src={c.avatar_path} alt="" style={{
                  width: 22, height: 22, borderRadius: '50%', objectFit: 'cover',
                  border: '1px solid var(--border)',
                }} />
              )}
              {c.name}
              <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-dim)' }}>
                HP {c.hp_current}/{c.hp_max}
              </span>
            </button>
          ))}
        </div>
      )}

      {activeChar && (
        <CharacterSheet
          character={activeChar}
          isMaster={isMaster}
          allSkills={allSkills}
          onUpdate={onUpdate}
          lang={lang}
        />
      )}
    </div>
  )
}

/* ── Spells Panel ──────────────────────────── */

function SpellsPanel({
  lang, character, isMaster, allSpells, partyId, partyCharacters,
  onCharUpdate, castSpellId, setCastSpellId, castTarget, setCastTarget,
  castNpcName, setCastNpcName, lastCastResult, setLastCastResult,
}) {
  const [learnSpellId, setLearnSpellId] = useState('')
  const [learnCharId, setLearnCharId] = useState(character?.id || '')
  const [casting, setCasting] = useState(false)

  // Character's known spells
  const mySpells = character?.spells || []

  async function handleCast(e) {
    e.preventDefault()
    if (!castSpellId) return
    setCasting(true)
    setLastCastResult(null)
    try {
      const body = {
        party_id: parseInt(partyId),
        spell_id: parseInt(castSpellId),
        target_description: castTarget,
      }
      if (isMaster && castNpcName) {
        body.npc_name = castNpcName
      } else if (character) {
        body.character_id = character.id
      }
      const result = await apiFetch('/api/spells/cast', { method: 'POST', body })
      setLastCastResult(result)
      // Refresh character data
      if (character) {
        try {
          const updated = await apiFetch(`/api/characters/my/${partyId}`)
          if (updated) onCharUpdate?.(updated)
        } catch {}
      }
    } catch (err) {
      setLastCastResult({ success: false, message: err.message })
    }
    setCasting(false)
  }

  async function handleLearn() {
    if (!learnSpellId || !learnCharId) return
    try {
      await apiFetch(`/api/characters/${learnCharId}/learn-spell`, {
        method: 'POST',
        body: { character_id: parseInt(learnCharId), spell_id: parseInt(learnSpellId) },
      })
      setLearnSpellId('')
      // Refresh
      if (character && parseInt(learnCharId) === character.id) {
        const updated = await apiFetch(`/api/characters/my/${partyId}`)
        if (updated) onCharUpdate?.(updated)
      }
    } catch (err) { alert(err.message) }
  }

  // Group spells by category
  const categories = ['attack', 'summon', 'enchant', 'divination', 'other']

  return (
    <div className="fade-in">
      {/* Cast Spell Form */}
      <div style={{
        padding: 16, background: 'var(--bg-deep)', borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border)', marginBottom: 20,
      }}>
        <h3 style={{ fontSize: 15, marginBottom: 12 }}>✦ Cast Spell</h3>
        <form onSubmit={handleCast}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {/* GM can cast for NPCs */}
            {isMaster && (
              <div style={{ width: 140 }}>
                <label>NPC Caster (optional)</label>
                <input value={castNpcName} onChange={e => setCastNpcName(e.target.value)}
                  placeholder="e.g. Deep One" style={{ fontSize: 12 }} />
              </div>
            )}
            <div style={{ flex: 1, minWidth: 180 }}>
              <label>Spell</label>
              <select value={castSpellId} onChange={e => setCastSpellId(e.target.value)} style={{ fontSize: 12 }}>
                <option value="">Select spell...</option>
                {/* Show character's known spells first */}
                {mySpells.length > 0 && (
                  <optgroup label="Known Spells">
                    {mySpells.map(s => {
                      const full = allSpells.find(sp => sp.id === s.spell_id)
                      return (
                        <option key={s.spell_id} value={s.spell_id}>
                          {s.spell_name} (−{s.cost_mp}MP −{s.cost_san}SAN)
                        </option>
                      )
                    })}
                  </optgroup>
                )}
                {/* GM sees all spells */}
                {isMaster && (
                  <optgroup label="All Spells">
                    {allSpells.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name} (−{s.cost_mp}MP −{s.cost_san}SAN)
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
            </div>
            <div style={{ flex: 1, minWidth: 140 }}>
              <label>Target</label>
              <input value={castTarget} onChange={e => setCastTarget(e.target.value)}
                placeholder="e.g. the Shoggoth" style={{ fontSize: 12 }} />
            </div>
          </div>

          {/* Spell details */}
          {castSpellId && (() => {
            const sp = allSpells.find(s => s.id === parseInt(castSpellId))
            if (!sp) return null
            return (
              <div style={{
                marginTop: 10, padding: 10, background: 'var(--bg-surface)',
                borderRadius: 'var(--radius)', fontSize: 12, color: 'var(--text-faded)',
                border: '1px solid var(--border)',
              }}>
                <div style={{ marginBottom: 4 }}>
                  <strong style={{ color: 'var(--sanity-blue)' }}>{sp.name}</strong>
                  <span style={{ color: 'var(--text-dim)', marginLeft: 8, fontFamily: 'var(--font-mono)', fontSize: 10 }}>
                    {sp.category.toUpperCase()} · Cast: {sp.cast_time}
                  </span>
                </div>
                <p style={{ marginBottom: 4, fontStyle: 'italic' }}>{sp.description}</p>
                <p style={{ color: 'var(--text-parchment)' }}>{sp.effect}</p>
              </div>
            )
          })()}

          <button type="submit" className="btn btn-primary" disabled={!castSpellId || casting}
            style={{ marginTop: 12, width: '100%' }}>
            {casting ? 'Channeling...' : '✦ Cast Spell'}
          </button>
        </form>

        {/* Cast result */}
        {lastCastResult && (
          <div className="fade-in" style={{
            marginTop: 12, padding: 14, borderRadius: 'var(--radius)',
            background: 'var(--bg-surface)', border: '1px solid var(--border)',
            textAlign: 'center',
          }}>
            <div style={{
              fontFamily: 'var(--font-mono)', fontSize: 36, fontWeight: 700, lineHeight: 1,
            }}
              className={lastCastResult.success_level === 'critical' ? 'dice-critical' :
                lastCastResult.success_level === 'fumble' ? 'dice-fumble' :
                lastCastResult.success ? 'dice-regular' : 'dice-fail'}
            >
              {lastCastResult.roll || '—'}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 4, fontFamily: 'var(--font-mono)' }}>
              vs POW {lastCastResult.pow}
            </div>
            <div style={{
              marginTop: 8, fontSize: 15, fontFamily: 'var(--font-display)',
              letterSpacing: '0.1em', textTransform: 'uppercase',
            }}
              className={lastCastResult.success ? 'dice-regular' : 'dice-fail'}
            >
              {lastCastResult.success_level === 'critical' ? '★ Critical Success ★' :
                lastCastResult.success_level === 'fumble' ? '☠ Fumble ☠' :
                lastCastResult.success ? 'Spell Succeeds' : 'Spell Fails'}
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-faded)', marginTop: 8 }}>
              {lastCastResult.effect}
            </p>
            {lastCastResult.mp_remaining != null && (
              <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-dim)', marginTop: 6 }}>
                MP: {lastCastResult.mp_remaining} · SAN: {lastCastResult.san_remaining}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Learn Spell (GM or player) */}
      {(isMaster || character) && (
        <div style={{
          padding: 14, background: 'var(--bg-deep)', borderRadius: 'var(--radius)',
          border: '1px solid var(--border)', marginBottom: 20,
        }}>
          <h4 style={{ fontSize: 12, color: 'var(--text-dim)', letterSpacing: '0.1em', marginBottom: 8 }}>
            LEARN NEW SPELL
          </h4>
          <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end' }}>
            {isMaster && (
              <div style={{ width: 140 }}>
                <label>Character</label>
                <select value={learnCharId} onChange={e => setLearnCharId(e.target.value)} style={{ fontSize: 12 }}>
                  {partyCharacters.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            )}
            <div style={{ flex: 1 }}>
              <label>Spell</label>
              <select value={learnSpellId} onChange={e => setLearnSpellId(e.target.value)} style={{ fontSize: 12 }}>
                <option value="">Select spell...</option>
                {allSpells.map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.category})</option>
                ))}
              </select>
            </div>
            <button className="btn btn-sm" onClick={handleLearn} disabled={!learnSpellId}
              style={{ whiteSpace: 'nowrap' }}>Learn</button>
          </div>
        </div>
      )}

      {/* Known Spells */}
      {mySpells.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <h4 style={{ fontSize: 12, color: 'var(--text-dim)', letterSpacing: '0.1em', marginBottom: 8 }}>
            KNOWN SPELLS
          </h4>
          {mySpells.map(s => {
            const full = allSpells.find(sp => sp.id === s.spell_id)
            return (
              <div key={s.spell_id} style={{
                padding: '8px 12px', marginBottom: 4, borderRadius: 'var(--radius)',
                background: 'var(--bg-deep)', border: '1px solid var(--border)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 14, color: 'var(--sanity-blue)' }}>{s.spell_name}</span>
                  <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-dim)' }}>
                    −{s.cost_mp}MP −{s.cost_san}SAN
                  </span>
                </div>
                {s.effect && (
                  <p style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>{s.effect}</p>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Spell Reference by Category */}
      <h4 style={{ fontSize: 12, color: 'var(--text-dim)', letterSpacing: '0.1em', marginBottom: 8 }}>
        SPELL GRIMOIRE
      </h4>
      {categories.map(cat => {
        const spells = allSpells.filter(s => s.category === cat)
        if (spells.length === 0) return null
        return (
          <div key={cat} style={{ marginBottom: 12 }}>
            <h5 style={{
              fontSize: 10, color: 'var(--text-dim)', textTransform: 'uppercase',
              letterSpacing: '0.1em', marginBottom: 4, borderBottom: '1px solid var(--border)',
              paddingBottom: 3,
            }}>
              {cat}
            </h5>
            {spells.map(sp => (
              <div key={sp.id} style={{
                padding: '6px 10px', fontSize: 12, borderBottom: '1px solid var(--bg-deep)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <div>
                  <span style={{ color: 'var(--text-parchment)' }}>{sp.name}</span>
                  <span style={{ color: 'var(--text-dim)', fontSize: 10, marginLeft: 6, fontStyle: 'italic' }}>
                    {sp.cast_time}
                  </span>
                </div>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-dim)' }}>
                  {sp.cost_mp}MP {sp.cost_san}SAN
                </span>
              </div>
            ))}
          </div>
        )
      })}
    </div>
  )
}
