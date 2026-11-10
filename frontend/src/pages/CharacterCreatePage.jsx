import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { apiFetch } from '../api'
import { t, getLang, pickName } from '../i18n'

const STAT_NAMES = [
  { key: 'str_stat', label: 'STR', full: 'Strength' },
  { key: 'con_stat', label: 'CON', full: 'Constitution' },
  { key: 'siz_stat', label: 'SIZ', full: 'Size' },
  { key: 'dex_stat', label: 'DEX', full: 'Dexterity' },
  { key: 'app_stat', label: 'APP', full: 'Appearance' },
  { key: 'int_stat', label: 'INT', full: 'Intelligence' },
  { key: 'pow_stat', label: 'POW', full: 'Power' },
  { key: 'edu_stat', label: 'EDU', full: 'Education' },
  { key: 'luck_stat', label: 'LUCK', full: 'Luck' },
]

function roll3d6x5() { return (Array.from({ length: 3 }, () => Math.ceil(Math.random() * 6)).reduce((a, b) => a + b, 0)) * 5 }
function roll2d6p6x5() { return (Array.from({ length: 2 }, () => Math.ceil(Math.random() * 6)).reduce((a, b) => a + b, 0) + 6) * 5 }

export default function CharacterCreatePage() {
  const { partyId } = useParams()
  const navigate = useNavigate()
  const lang = getLang()

  const [step, setStep] = useState(1) // 1: basics, 2: stats, 3: skills, 4: weapons, 5: biography, 6: review
  const [allSkills, setAllSkills] = useState([])
  const [allWeapons, setAllWeapons] = useState([])
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  // Step 1: Basics
  const [name, setName] = useState('')
  const [occupation, setOccupation] = useState('')
  const [age, setAge] = useState('')
  const [residence, setResidence] = useState('')
  const [birthplace, setBirthplace] = useState('')
  const [avatarFile, setAvatarFile] = useState(null)
  const [avatarPreview, setAvatarPreview] = useState(null)

  // Step 2: Stats
  const [stats, setStats] = useState({
    str_stat: 50, con_stat: 50, siz_stat: 50, dex_stat: 50,
    app_stat: 50, int_stat: 50, pow_stat: 50, edu_stat: 50, luck_stat: 50,
  })

  // Step 3: Skills — { [skill_id]: { occ: number, per: number } }
  const [skillAlloc, setSkillAlloc] = useState({})

  // Step 4: Weapons
  const [selectedWeapons, setSelectedWeapons] = useState([])

  // Step 5: Biography
  const [bio, setBio] = useState({
    description: '', ideals: '', significant_people: '',
    significant_places: '', possessions: '', injuries_scars: '', phobias: '',
  })

  useEffect(() => {
    apiFetch('/api/skills').then(setAllSkills).catch(console.error)
    apiFetch('/api/weapons').then(setAllWeapons).catch(console.error)
  }, [])

  // Point budgets based on EDU and INT (simplified CoC 7e rules)
  const occPoints = stats.edu_stat * 4
  const perPoints = stats.int_stat * 2

  const usedOcc = Object.values(skillAlloc).reduce((s, v) => s + (v.occ || 0), 0)
  const usedPer = Object.values(skillAlloc).reduce((s, v) => s + (v.per || 0), 0)

  // Group skills by parent
  const skillGroups = useMemo(() => {
    const groups = {}
    const standalone = []
    for (const sk of allSkills) {
      if (sk.is_specialization && sk.parent_skill_name) {
        if (!groups[sk.parent_skill_name]) groups[sk.parent_skill_name] = []
        groups[sk.parent_skill_name].push(sk)
      } else {
        standalone.push(sk)
      }
    }
    return { groups, standalone }
  }, [allSkills])

  function rollAllStats() {
    const newStats = {}
    STAT_NAMES.forEach(s => {
      if (['siz_stat', 'int_stat', 'edu_stat'].includes(s.key)) {
        newStats[s.key] = roll2d6p6x5()
      } else {
        newStats[s.key] = roll3d6x5()
      }
    })
    setStats(newStats)
  }

  function updateSkill(skillId, type, value) {
    const v = Math.max(0, parseInt(value) || 0)
    setSkillAlloc(prev => ({
      ...prev,
      [skillId]: { ...prev[skillId], [type]: v },
    }))
  }

  function getSkillTotal(skill) {
    let base = skill.base_value
    if (skill.name === 'Dodge') base = Math.floor(stats.dex_stat / 2)
    if (skill.name === 'Language (Own)') base = stats.edu_stat
    const alloc = skillAlloc[skill.id] || {}
    return base + (alloc.occ || 0) + (alloc.per || 0)
  }

  async function handleSubmit() {
    setError('')
    setSaving(true)
    try {
      const skills = Object.entries(skillAlloc)
        .filter(([_, v]) => (v.occ || 0) + (v.per || 0) > 0)
        .map(([id, v]) => ({
          skill_id: parseInt(id),
          occupation_points: v.occ || 0,
          personal_points: v.per || 0,
        }))

      const body = {
        name,
        party_id: parseInt(partyId),
        occupation: occupation || null,
        age: age ? parseInt(age) : null,
        residence: residence || null,
        birthplace: birthplace || null,
        ...stats,
        skills,
        equipment_weapons: selectedWeapons.length > 0 ? selectedWeapons : null,
        ...bio,
      }

      const char = await apiFetch('/api/characters', { method: 'POST', body })

      // Upload avatar if selected
      if (avatarFile) {
        const fd = new FormData()
        fd.append('file', avatarFile)
        await apiFetch(`/api/characters/${char.id}/avatar`, {
          method: 'POST',
          body: fd,
          isFormData: true,
        })
      }

      navigate(`/party/${partyId}`)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  function handleAvatarChange(e) {
    const file = e.target.files?.[0]
    if (file) {
      setAvatarFile(file)
      const reader = new FileReader()
      reader.onload = () => setAvatarPreview(reader.result)
      reader.readAsDataURL(file)
    }
  }

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '32px 20px' }}>
      <h1 style={{ fontSize: 22, marginBottom: 4 }}>{t('createInvestigator', lang)}</h1>
      <p style={{ color: 'var(--text-dim)', fontSize: 13, fontFamily: 'var(--font-mono)', marginBottom: 28 }}>
        {t('step', lang)} {step} {t('of', lang)} 6
      </p>

      {error && <p className="error-msg" style={{ marginBottom: 16 }}>{error}</p>}

      {/* ── Step 1: Basics ─────────────────────── */}
      {step === 1 && (
        <div className="card fade-in">
          <h2 style={{ fontSize: 18, marginBottom: 20 }}>{t('identity', lang)}</h2>

          <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
            {/* Avatar */}
            <div style={{ flexShrink: 0 }}>
              <label style={{ marginBottom: 8, display: 'block' }}>Avatar</label>
              <div
                onClick={() => document.getElementById('avatar-input').click()}
                style={{
                  width: 120, height: 120, borderRadius: 'var(--radius-lg)',
                  border: '2px dashed var(--border)', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  overflow: 'hidden', background: 'var(--bg-deep)',
                  transition: 'border-color 0.2s',
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--gold-dim)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
              >
                {avatarPreview ? (
                  <img src={avatarPreview} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <span style={{ color: 'var(--text-dim)', fontSize: 12, textAlign: 'center', padding: 8 }}>
                    {t('clickUpload', lang)}
                  </span>
                )}
              </div>
              <input id="avatar-input" type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarChange} />
            </div>

            <div style={{ flex: 1 }}>
              <div className="field">
                <label>{t('characterName', lang)} *</label>
                <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Harvey Walters" required />
              </div>
              <div className="field">
                <label>{t('occupation', lang)}</label>
                <input value={occupation} onChange={e => setOccupation(e.target.value)} placeholder="e.g. Professor, Private Eye" />
              </div>
              <div className="grid-3">
                <div className="field">
                  <label>{t('age', lang)}</label>
                  <input type="number" value={age} onChange={e => setAge(e.target.value)} placeholder="32" />
                </div>
                <div className="field">
                  <label>{t('residence', lang)}</label>
                  <input value={residence} onChange={e => setResidence(e.target.value)} placeholder="Arkham" />
                </div>
                <div className="field">
                  <label>{t('birthplace', lang)}</label>
                  <input value={birthplace} onChange={e => setBirthplace(e.target.value)} placeholder="Boston" />
                </div>
              </div>
            </div>
          </div>

          <div style={{ marginTop: 20, textAlign: 'right' }}>
            <button className="btn btn-primary" onClick={() => name.trim() && setStep(2)} disabled={!name.trim()}>
              {t('next', lang)} — {t('characteristics', lang)}
            </button>
          </div>
        </div>
      )}

      {/* ── Step 2: Stats ──────────────────────── */}
      {step === 2 && (
        <div className="card fade-in">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h2 style={{ fontSize: 18 }}>{t('characteristics', lang)}</h2>
            <button className="btn btn-sm" onClick={rollAllStats}>
              ⚄ {t('rollAll', lang)}
            </button>
          </div>

          <div className="grid-3">
            {STAT_NAMES.map(s => (
              <div key={s.key} className="field">
                <label>{s.label} — {s.full}</label>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input
                    type="number"
                    min={15} max={90}
                    value={stats[s.key]}
                    onChange={e => setStats({ ...stats, [s.key]: parseInt(e.target.value) || 0 })}
                    style={{ textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: 18, fontWeight: 500 }}
                  />
                  <div style={{ fontSize: 11, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' }}>
                    ½: {Math.floor(stats[s.key] / 2)}<br />
                    ⅕: {Math.floor(stats[s.key] / 5)}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Derived stats */}
          <hr className="divider" />
          <div className="grid-4" style={{ fontSize: 14 }}>
            <div>
              <label>{t('hitPoints', lang)}</label>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 18, color: 'var(--blood-bright)' }}>
                {Math.floor((stats.con_stat + stats.siz_stat) / 10)}
              </span>
            </div>
            <div>
              <label>{t('magicPoints', lang)}</label>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 18, color: 'var(--sanity-blue)' }}>
                {Math.floor(stats.pow_stat / 5)}
              </span>
            </div>
            <div>
              <label>{t('sanity', lang)}</label>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 18, color: 'var(--eldritch-green)' }}>
                {stats.pow_stat}
              </span>
            </div>
            <div>
              <label>{t('moveRate', lang)}</label>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 18, color: 'var(--text-parchment)' }}>
                {stats.dex_stat < stats.siz_stat && stats.str_stat < stats.siz_stat ? 7
                  : stats.dex_stat > stats.siz_stat && stats.str_stat > stats.siz_stat ? 9 : 8}
              </span>
            </div>
          </div>

          <div style={{ marginTop: 20, display: 'flex', justifyContent: 'space-between' }}>
            <button className="btn btn-sm" onClick={() => setStep(1)}>← {t('back', lang)}</button>
            <button className="btn btn-primary" onClick={() => setStep(3)}>
              {t('next', lang)} — {t('skills', lang)}
            </button>
          </div>
        </div>
      )}

      {/* ── Step 3: Skills ─────────────────────── */}
      {step === 3 && (
        <div className="card fade-in">
          <h2 style={{ fontSize: 18, marginBottom: 8 }}>{t('skills', lang)}</h2>

          {/* Point budget */}
          <div style={{
            display: 'flex', gap: 24, marginBottom: 20, padding: '12px 16px',
            background: 'var(--bg-deep)', borderRadius: 'var(--radius)', fontSize: 13,
          }}>
            <div>
              <span style={{ color: 'var(--text-dim)' }}>{t('occupationPoints', lang)}: </span>
              <span style={{
                fontFamily: 'var(--font-mono)', fontWeight: 500,
                color: usedOcc > occPoints ? 'var(--blood-bright)' : 'var(--gold)',
              }}>
                {usedOcc} / {occPoints}
              </span>
              <span style={{ color: 'var(--text-dim)', fontSize: 11, marginLeft: 4 }}>(EDU×4)</span>
            </div>
            <div>
              <span style={{ color: 'var(--text-dim)' }}>{t('personalPoints', lang)}: </span>
              <span style={{
                fontFamily: 'var(--font-mono)', fontWeight: 500,
                color: usedPer > perPoints ? 'var(--blood-bright)' : 'var(--gold)',
              }}>
                {usedPer} / {perPoints}
              </span>
              <span style={{ color: 'var(--text-dim)', fontSize: 11, marginLeft: 4 }}>(INT×2)</span>
            </div>
          </div>

          <div style={{ maxHeight: 500, overflowY: 'auto', paddingRight: 8 }}>
            {/* Standalone skills */}
            <SkillList
              skills={skillGroups.standalone}
              skillAlloc={skillAlloc}
              onUpdate={updateSkill}
              getTotal={getSkillTotal}
              lang={lang}
            />

            {/* Specialization groups */}
            {Object.entries(skillGroups.groups).map(([parentName, skills]) => (
              <div key={parentName} style={{ marginTop: 16 }}>
                <h4 style={{
                  fontSize: 12, color: 'var(--text-dim)', letterSpacing: '0.1em',
                  textTransform: 'uppercase', marginBottom: 8, borderBottom: '1px solid var(--border)',
                  paddingBottom: 4,
                }}>
                  {parentName}
                </h4>
                <SkillList
                  skills={skills}
                  skillAlloc={skillAlloc}
                  onUpdate={updateSkill}
                  getTotal={getSkillTotal}
                  lang={lang}
                />
              </div>
            ))}
          </div>

          <div style={{ marginTop: 20, display: 'flex', justifyContent: 'space-between' }}>
            <button className="btn btn-sm" onClick={() => setStep(2)}>← {t('back', lang)}</button>
            <button className="btn btn-primary" onClick={() => setStep(4)}>
              {t('next', lang)} — {t('weaponsEquipment', lang)}
            </button>
          </div>
        </div>
      )}

      {/* ── Step 4: Weapons ────────────────────── */}
      {step === 4 && (
        <div className="card fade-in">
          <h2 style={{ fontSize: 18, marginBottom: 16 }}>{t('weaponsEquipment', lang)}</h2>
          <p style={{ color: 'var(--text-faded)', fontSize: 13, marginBottom: 16 }}>
            {t('weaponsHint', lang)}
          </p>

          {/* Weapon type filter tabs */}
          {['all', 'melee', 'handgun', 'rifle', 'shotgun', 'smg', 'explosive'].map(t => (
            <span key={t} style={{
              display: 'inline-block', padding: '3px 10px', fontSize: 10, borderRadius: 3,
              marginRight: 4, marginBottom: 8, cursor: 'default',
              fontFamily: 'var(--font-display)', letterSpacing: '0.08em', textTransform: 'uppercase',
              background: 'var(--bg-deep)', color: 'var(--text-dim)', border: '1px solid var(--border)',
            }}>
              {t}
            </span>
          ))}

          <div style={{ maxHeight: 400, overflowY: 'auto', paddingRight: 8 }}>
            {allWeapons.map(w => {
              const isSelected = selectedWeapons.includes(w.name)
              return (
                <div
                  key={w.name}
                  onClick={() => {
                    if (isSelected) {
                      setSelectedWeapons(prev => prev.filter(n => n !== w.name))
                    } else {
                      setSelectedWeapons(prev => [...prev, w.name])
                    }
                  }}
                  style={{
                    padding: '8px 12px', marginBottom: 4, borderRadius: 'var(--radius)',
                    border: `1px solid ${isSelected ? 'var(--gold)' : 'var(--border)'}`,
                    background: isSelected ? 'var(--bg-card)' : 'var(--bg-deep)',
                    cursor: 'pointer', transition: 'all 0.15s',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span style={{
                        fontSize: 14,
                        color: isSelected ? 'var(--gold)' : 'var(--text-parchment)',
                        fontWeight: isSelected ? 600 : 400,
                      }}>
                        {isSelected ? '✓ ' : ''}{pickName(w.name, w.name_ru, lang)}
                      </span>
                      <span style={{
                        fontSize: 9, padding: '1px 5px', borderRadius: 3, marginLeft: 8,
                        background: w.type === 'melee' ? 'var(--blood)' : 'var(--sanity-blue)',
                        color: 'var(--bg-void)', fontFamily: 'var(--font-mono)',
                      }}>
                        {w.type.toUpperCase()}
                      </span>
                    </div>
                    <span style={{
                      fontSize: 13, fontFamily: 'var(--font-mono)', color: 'var(--blood-bright)',
                    }}>
                      {w.damage}
                    </span>
                  </div>
                  <div style={{
                    fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-dim)',
                    marginTop: 2, display: 'flex', gap: 10,
                  }}>
                    <span>{w.skill}</span>
                    {w.range && <span>RNG {w.range}yd</span>}
                    {w.ammo && <span>CAP {w.ammo}</span>}
                    {w.era && <span>{w.era}</span>}
                  </div>
                  {w.notes && (
                    <div style={{ fontSize: 10, color: 'var(--text-dim)', fontStyle: 'italic', marginTop: 2 }}>
                      {w.notes}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {selectedWeapons.length > 0 && (
            <p style={{ fontSize: 12, color: 'var(--gold)', marginTop: 8 }}>
              {selectedWeapons.length} {t('weaponsSelected', lang)}
            </p>
          )}

          <div style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between' }}>
            <button className="btn btn-sm" onClick={() => setStep(3)}>← {t('back', lang)}</button>
            <button className="btn btn-primary" onClick={() => setStep(5)}>
              {t('next', lang)} — {t('biography', lang)}
            </button>
          </div>
        </div>
      )}

      {/* ── Step 5: Biography ──────────────────── */}
      {step === 5 && (
        <div className="card fade-in">
          <h2 style={{ fontSize: 18, marginBottom: 16 }}>{t('biography', lang)}</h2>
          <p style={{ color: 'var(--text-faded)', fontSize: 13, marginBottom: 16 }}>
            {t('bioHint', lang)}
          </p>

          <div className="field">
            <label>{t('descBackstory', lang)}</label>
            <textarea rows={3} placeholder="Who is this person? What's their story?"
              value={bio.description} onChange={e => setBio(b => ({ ...b, description: e.target.value }))}
              style={{ resize: 'vertical' }} />
          </div>

          <div className="field">
            <label>{t('idealsPrinciples', lang)}</label>
            <textarea rows={2} placeholder="What does your investigator believe in? What drives them?"
              value={bio.ideals} onChange={e => setBio(b => ({ ...b, ideals: e.target.value }))}
              style={{ resize: 'vertical' }} />
          </div>

          <div className="grid-2">
            <div className="field">
              <label>{t('significantPeople', lang)}</label>
              <textarea rows={2} placeholder="Family, mentors, rivals, allies..."
                value={bio.significant_people} onChange={e => setBio(b => ({ ...b, significant_people: e.target.value }))}
                style={{ resize: 'vertical' }} />
            </div>
            <div className="field">
              <label>{t('significantPlaces', lang)}</label>
              <textarea rows={2} placeholder="Home, university, that old church..."
                value={bio.significant_places} onChange={e => setBio(b => ({ ...b, significant_places: e.target.value }))}
                style={{ resize: 'vertical' }} />
            </div>
          </div>

          <div className="field">
            <label>{t('possessions', lang)}</label>
            <textarea rows={2} placeholder="Treasured items, tools, non-weapon equipment..."
              value={bio.possessions} onChange={e => setBio(b => ({ ...b, possessions: e.target.value }))}
              style={{ resize: 'vertical' }} />
          </div>

          <div className="grid-2">
            <div className="field">
              <label>{t('injuriesScars', lang)}</label>
              <textarea rows={2} placeholder="Old wounds, missing finger, burn scars..."
                value={bio.injuries_scars} onChange={e => setBio(b => ({ ...b, injuries_scars: e.target.value }))}
                style={{ resize: 'vertical' }} />
            </div>
            <div className="field">
              <label>{t('phobias', lang)}</label>
              <textarea rows={2} placeholder="Fear of deep water, obsessed with the occult..."
                value={bio.phobias} onChange={e => setBio(b => ({ ...b, phobias: e.target.value }))}
                style={{ resize: 'vertical' }} />
            </div>
          </div>

          <div style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between' }}>
            <button className="btn btn-sm" onClick={() => setStep(4)}>← {t('back', lang)}</button>
            <button className="btn btn-primary" onClick={() => setStep(6)}>
              {t('next', lang)} — {t('review', lang)}
            </button>
          </div>
        </div>
      )}

      {/* ── Step 6: Review ─────────────────────── */}
      {step === 6 && (
        <div className="card fade-in">
          <h2 style={{ fontSize: 18, marginBottom: 16 }}>{t('reviewInvestigator', lang)}</h2>

          <div style={{ display: 'flex', gap: 20, marginBottom: 20 }}>
            {avatarPreview && (
              <img src={avatarPreview} alt="" style={{
                width: 80, height: 80, borderRadius: 'var(--radius)', objectFit: 'cover',
                border: '1px solid var(--border)',
              }} />
            )}
            <div>
              <h3 style={{ fontSize: 20, marginBottom: 4 }}>{name}</h3>
              {occupation && <p style={{ color: 'var(--text-faded)', fontSize: 14 }}>{occupation}</p>}
              <p style={{ color: 'var(--text-dim)', fontSize: 13 }}>
                {[age && `Age ${age}`, residence, birthplace].filter(Boolean).join(' · ')}
              </p>
            </div>
          </div>

          {/* Stats summary */}
          <div className="grid-3" style={{ marginBottom: 20, fontSize: 14 }}>
            {STAT_NAMES.map(s => (
              <div key={s.key} style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-faded)' }}>{s.label}</span>
                <span style={{ fontFamily: 'var(--font-mono)' }}>{stats[s.key]}</span>
              </div>
            ))}
          </div>

          {/* Allocated skills */}
          <h4 style={{ fontSize: 13, color: 'var(--text-dim)', marginBottom: 8, letterSpacing: '0.1em' }}>
            {t('trainedSkills', lang)}
          </h4>
          <div style={{ fontSize: 14, marginBottom: 20 }}>
            {allSkills
              .filter(sk => {
                const a = skillAlloc[sk.id]
                return a && ((a.occ || 0) + (a.per || 0)) > 0
              })
              .map(sk => (
                <div key={sk.id} style={{
                  display: 'flex', justifyContent: 'space-between',
                  padding: '4px 0', borderBottom: '1px solid var(--border)',
                }}>
                  <span>{pickName(sk.name, sk.name_ru, lang)}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--gold)' }}>
                    {getSkillTotal(sk)}%
                  </span>
                </div>
              ))}
            {Object.keys(skillAlloc).length === 0 && (
              <p style={{ color: 'var(--text-dim)' }}>{t('noSkillsAllocated', lang)}</p>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <button className="btn btn-sm" onClick={() => setStep(5)}>← {t('back', lang)}</button>
            <button
              className="btn btn-primary"
              onClick={handleSubmit}
              disabled={saving}
            >
              {saving ? t('creating', lang) : t('createInvestigator', lang)}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Skill List Component ────────────────────── */

function SkillList({ skills, skillAlloc, onUpdate, getTotal, lang }) {
  return (
    <div>
      {skills.map(sk => {
        const alloc = skillAlloc[sk.id] || {}
        const total = getTotal(sk)
        const categoryBadge = sk.category !== 'standard' ? (
          <span style={{
            fontSize: 9, padding: '1px 5px', borderRadius: 3, marginLeft: 6,
            background: sk.category === 'modern' ? 'var(--sanity-blue)' : 'var(--gold-dim)',
            color: 'var(--bg-void)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase',
          }}>
            {sk.category}
          </span>
        ) : null

        return (
          <div
            key={sk.id}
            style={{
              display: 'grid', gridTemplateColumns: '1fr 70px 70px 60px',
              gap: 8, alignItems: 'center', padding: '5px 0',
              borderBottom: '1px solid var(--bg-deep)',
              fontSize: 14,
            }}
          >
            <div>
              <span>{pickName(sk.name, sk.name_ru, lang)}</span>
              {categoryBadge}
              <span style={{
                color: 'var(--text-dim)', fontSize: 11, marginLeft: 6,
                fontFamily: 'var(--font-mono)',
              }}>
                ({sk.base_value}%)
              </span>
            </div>
            <input
              type="number" min={0} max={99}
              placeholder="Occ"
              value={alloc.occ || ''}
              onChange={e => onUpdate(sk.id, 'occ', e.target.value)}
              style={{
                padding: '4px 6px', fontSize: 13, textAlign: 'center',
                fontFamily: 'var(--font-mono)',
              }}
            />
            <input
              type="number" min={0} max={99}
              placeholder="Per"
              value={alloc.per || ''}
              onChange={e => onUpdate(sk.id, 'per', e.target.value)}
              style={{
                padding: '4px 6px', fontSize: 13, textAlign: 'center',
                fontFamily: 'var(--font-mono)',
              }}
            />
            <div style={{
              fontFamily: 'var(--font-mono)', textAlign: 'center', fontWeight: 500,
              color: total > sk.base_value ? 'var(--gold)' : 'var(--text-dim)',
            }}>
              {total}%
            </div>
          </div>
        )
      })}
    </div>
  )
}
