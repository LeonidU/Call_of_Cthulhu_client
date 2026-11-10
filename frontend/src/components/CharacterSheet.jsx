import React, { useState, useEffect } from 'react'
import { apiFetch } from '../api'
import { t, getLang, pickName } from '../i18n'

const STAT_LABELS = {
  str_stat: 'STR', con_stat: 'CON', siz_stat: 'SIZ', dex_stat: 'DEX',
  app_stat: 'APP', int_stat: 'INT', pow_stat: 'POW', edu_stat: 'EDU', luck_stat: 'LUCK',
}

export default function CharacterSheet({ character, isMaster, onUpdate, allSkills, lang: langProp }) {
  const lang = langProp || getLang()
  const [editing, setEditing] = useState(null) // which stat is being edited
  const [editValue, setEditValue] = useState('')
  const [skillImprove, setSkillImprove] = useState({ skillId: '', points: '' })
  const [saving, setSaving] = useState(false)
  const [inventoryText, setInventoryText] = useState('')
  const [inventoryEditing, setInventoryEditing] = useState(false)
  const [inventorySaved, setInventorySaved] = useState(false)

  useEffect(() => {
    setInventoryText(character?.inventory || '')
    setInventoryEditing(false)
  }, [character?.id])

  async function handleSaveInventory() {
    setSaving(true)
    try {
      await apiFetch(`/api/characters/${character.id}/biography`, {
        method: 'PATCH', body: { inventory: inventoryText },
      })
      onUpdate?.({ ...character, inventory: inventoryText })
      setInventoryEditing(false)
      setInventorySaved(true)
      setTimeout(() => setInventorySaved(false), 2000)
    } catch (err) {
      console.error(err)
    }
    setSaving(false)
  }

  if (!character) return null

  async function handleStatSave(field) {
    const val = parseInt(editValue)
    if (isNaN(val) || val < 0) { setEditing(null); return }

    setSaving(true)
    try {
      const body = { [field]: val }
      const updated = await apiFetch(`/api/characters/${character.id}/stats`, {
        method: 'PATCH', body,
      })
      onUpdate?.(updated)
    } catch (err) {
      console.error(err)
    }
    setSaving(false)
    setEditing(null)
  }

  async function handleSkillImprove(e) {
    e.preventDefault()
    if (!skillImprove.skillId || !skillImprove.points) return
    setSaving(true)
    try {
      const updated = await apiFetch(`/api/characters/${character.id}/improve-skill`, {
        method: 'POST',
        body: { skill_id: parseInt(skillImprove.skillId), add_points: parseInt(skillImprove.points) },
      })
      onUpdate?.(updated)
      setSkillImprove({ skillId: '', points: '' })
    } catch (err) {
      console.error(err)
    }
    setSaving(false)
  }

  function startEdit(field, currentVal) {
    setEditing(field)
    setEditValue(String(currentVal))
  }

  function EditableValue({ field, value, max, color, label }) {
    const isEditing = editing === field
    const pct = max > 0 ? (value / max) * 100 : 0

    return (
      <div style={{ marginBottom: 12 }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginBottom: 4,
        }}>
          <span style={{
            fontSize: 11, fontFamily: 'var(--font-display)', letterSpacing: '0.1em',
            color: 'var(--text-dim)', textTransform: 'uppercase',
          }}>
            {label}
          </span>
          {isEditing ? (
            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
              <input
                type="number"
                value={editValue}
                onChange={e => setEditValue(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleStatSave(field)
                  if (e.key === 'Escape') setEditing(null)
                }}
                autoFocus
                style={{
                  width: 60, padding: '2px 6px', fontSize: 14, textAlign: 'center',
                  fontFamily: 'var(--font-mono)', background: 'var(--bg-void)',
                }}
              />
              <button onClick={() => handleStatSave(field)} className="btn btn-sm"
                style={{ padding: '2px 8px', fontSize: 10 }}>✓</button>
            </div>
          ) : (
            <span
              onClick={() => startEdit(field, value)}
              style={{
                fontFamily: 'var(--font-mono)', fontSize: 16, fontWeight: 600,
                color, cursor: 'pointer',
                borderBottom: '1px dashed transparent',
                transition: 'border-color 0.2s',
              }}
              onMouseEnter={e => e.target.style.borderColor = color}
              onMouseLeave={e => e.target.style.borderColor = 'transparent'}
              title="Click to edit"
            >
              {value} / {max}
            </span>
          )}
        </div>
        {/* Bar */}
        <div style={{
          height: 6, background: 'var(--bg-void)', borderRadius: 3, overflow: 'hidden',
        }}>
          <div style={{
            height: '100%', width: `${Math.min(100, pct)}%`,
            background: color, borderRadius: 3,
            transition: 'width 0.4s ease',
          }} />
        </div>
      </div>
    )
  }

  // Quick adjust buttons
  function QuickAdjust({ field, currentValue, maxField, maxValue, color, amounts }) {
    async function adjust(delta) {
      const newVal = Math.max(0, Math.min(maxValue, currentValue + delta))
      if (newVal === currentValue) return
      setSaving(true)
      try {
        const updated = await apiFetch(`/api/characters/${character.id}/stats`, {
          method: 'PATCH', body: { [field]: newVal },
        })
        onUpdate?.(updated)
      } catch (err) { console.error(err) }
      setSaving(false)
    }

    return (
      <div style={{ display: 'flex', gap: 3, marginTop: 4 }}>
        {amounts.map(a => (
          <button
            key={a}
            onClick={() => adjust(a)}
            disabled={saving}
            style={{
              padding: '2px 8px', fontSize: 11, fontFamily: 'var(--font-mono)',
              background: a < 0 ? 'var(--bg-void)' : 'var(--bg-void)',
              border: `1px solid ${a < 0 ? 'var(--blood)' : 'var(--eldritch-green)'}`,
              color: a < 0 ? 'var(--blood-bright)' : 'var(--eldritch-green)',
              borderRadius: 3, cursor: 'pointer',
            }}
          >
            {a > 0 ? `+${a}` : a}
          </button>
        ))}
      </div>
    )
  }

  return (
    <div className="fade-in">
      {/* Header with avatar */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 20, alignItems: 'center' }}>
        {character.avatar_path && (
          <img src={character.avatar_path} alt=""
            style={{
              width: 64, height: 64, borderRadius: 'var(--radius)',
              objectFit: 'cover', border: '2px solid var(--border)',
            }} />
        )}
        <div>
          <h3 style={{ fontSize: 20, marginBottom: 2 }}>{character.name}</h3>
          {character.occupation && (
            <p style={{ color: 'var(--text-faded)', fontSize: 14 }}>{character.occupation}</p>
          )}
        </div>
      </div>

      {/* Vital Stats with bars + quick adjust */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16,
        padding: 16, background: 'var(--bg-deep)', borderRadius: 'var(--radius-lg)',
        marginBottom: 20,
      }}>
        <div>
          <EditableValue
            field="hp_current" value={character.hp_current} max={character.hp_max}
            color="var(--blood-bright)" label={t('hitPoints', lang)}
          />
          <QuickAdjust
            field="hp_current" currentValue={character.hp_current}
            maxField="hp_max" maxValue={character.hp_max}
            color="var(--blood)" amounts={[-5, -1, 1, 5]}
          />
        </div>
        <div>
          <EditableValue
            field="mp_current" value={character.mp_current} max={character.mp_max}
            color="var(--sanity-blue)" label={t('magicPoints', lang)}
          />
          <QuickAdjust
            field="mp_current" currentValue={character.mp_current}
            maxField="mp_max" maxValue={character.mp_max}
            color="var(--sanity-blue)" amounts={[-5, -1, 1, 5]}
          />
        </div>
        <div>
          <EditableValue
            field="sanity_current" value={character.sanity_current} max={character.sanity_max}
            color="var(--eldritch-green)" label={t('sanity', lang)}
          />
          <QuickAdjust
            field="sanity_current" currentValue={character.sanity_current}
            maxField="sanity_max" maxValue={character.sanity_max}
            color="var(--eldritch-green)" amounts={[-10, -1, 1, 10]}
          />
        </div>
      </div>

      {/* Luck (editable) */}
      <div style={{
        padding: '10px 16px', background: 'var(--bg-deep)', borderRadius: 'var(--radius)',
        marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <span style={{
          fontSize: 11, fontFamily: 'var(--font-display)', letterSpacing: '0.1em',
          color: 'var(--text-dim)', textTransform: 'uppercase',
        }}>
          {t('luck', lang)}
        </span>
        {editing === 'luck_stat' ? (
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            <input
              type="number" value={editValue}
              onChange={e => setEditValue(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') handleStatSave('luck_stat')
                if (e.key === 'Escape') setEditing(null)
              }}
              autoFocus
              style={{ width: 60, padding: '2px 6px', fontSize: 14, textAlign: 'center', fontFamily: 'var(--font-mono)' }}
            />
            <button onClick={() => handleStatSave('luck_stat')} className="btn btn-sm"
              style={{ padding: '2px 8px', fontSize: 10 }}>✓</button>
          </div>
        ) : (
          <span
            onClick={() => startEdit('luck_stat', character.luck_stat)}
            style={{ fontFamily: 'var(--font-mono)', fontSize: 18, color: 'var(--gold)', cursor: 'pointer' }}
            title="Click to edit"
          >
            {character.luck_stat}
          </span>
        )}
      </div>

      {/* Core characteristics (read-only for display) */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 20,
      }}>
        {Object.entries(STAT_LABELS).filter(([k]) => k !== 'luck_stat').map(([key, label]) => (
          <div key={key} style={{
            display: 'flex', justifyContent: 'space-between', padding: '6px 10px',
            background: 'var(--bg-deep)', borderRadius: 3,
          }}>
            <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>{label}</span>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 14 }}>
              <span style={{ color: 'var(--text-parchment)' }}>{character[key]}</span>
              <span style={{ color: 'var(--text-dim)', fontSize: 11, marginLeft: 6 }}>
                ½{Math.floor(character[key] / 2)} ⅕{Math.floor(character[key] / 5)}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Skills list */}
      <h4 style={{
        fontSize: 12, color: 'var(--text-dim)', letterSpacing: '0.1em', marginBottom: 8,
      }}>
        {t('skills', lang)}
      </h4>
      <div style={{
        maxHeight: 250, overflowY: 'auto', marginBottom: 16,
        display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 4,
      }}>
        {(character.skills || []).map(sk => (
          <div key={sk.skill_id} style={{
            display: 'flex', justifyContent: 'space-between', padding: '3px 8px',
            background: 'var(--bg-deep)', borderRadius: 3, fontSize: 13,
          }}>
            <span style={{ color: 'var(--text-faded)' }}>{pickName(sk.skill_name, sk.skill_name_ru, lang)}</span>
            <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--gold)' }}>
              {sk.total}%
            </span>
          </div>
        ))}
      </div>

      {/* Skill improvement form */}
      <div style={{
        padding: 14, background: 'var(--bg-deep)', borderRadius: 'var(--radius)',
        border: '1px solid var(--border)',
      }}>
        <h4 style={{ fontSize: 12, color: 'var(--text-dim)', letterSpacing: '0.1em', marginBottom: 10 }}>
        {t('improveSkill', lang)}
        </h4>
        <form onSubmit={handleSkillImprove} style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <select
              value={skillImprove.skillId}
              onChange={e => setSkillImprove(s => ({ ...s, skillId: e.target.value }))}
              style={{ fontSize: 13 }}
            >
              <option value="">{t('selectSkill', lang)}</option>
              {allSkills.map(sk => (
                <option key={sk.id} value={sk.id}>{pickName(sk.name, sk.name_ru, lang)}</option>
              ))}
            </select>
          </div>
          <div style={{ width: 70 }}>
            <input
              type="number" min={1} max={99}
              placeholder="+pts"
              value={skillImprove.points}
              onChange={e => setSkillImprove(s => ({ ...s, points: e.target.value }))}
              style={{ fontSize: 13, textAlign: 'center', fontFamily: 'var(--font-mono)' }}
            />
          </div>
          <button type="submit" className="btn btn-sm btn-primary" disabled={saving}
            style={{ whiteSpace: 'nowrap' }}>
            {t('improve', lang)}
          </button>
        </form>
      </div>

      {/* ── Weapons ────────────────────────────── */}
      {character.equipment_weapons && character.equipment_weapons.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <h4 style={{ fontSize: 12, color: 'var(--text-dim)', letterSpacing: '0.1em', marginBottom: 8 }}>
        {t('weaponsHeader', lang)}
          </h4>
          {character.equipment_weapons.map((w, i) => (
            <div key={i} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '6px 10px', marginBottom: 3, borderRadius: 3,
              background: 'var(--bg-deep)', border: '1px solid var(--border)',
            }}>
              <div>
                <span style={{ fontSize: 13, color: 'var(--text-parchment)' }}>{pickName(w.name, w.name_ru, lang)}</span>
                <span style={{
                  fontSize: 9, padding: '1px 5px', borderRadius: 3, marginLeft: 6,
                  background: w.type === 'melee' ? 'var(--blood)' : 'var(--sanity-blue)',
                  color: 'var(--bg-void)', fontFamily: 'var(--font-mono)',
                }}>
                  {w.type}
                </span>
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--blood-bright)' }}>
                {w.damage}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Inventory (editable by player & GM) ─── */}
      <div style={{ marginTop: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <h4 style={{ fontSize: 12, color: 'var(--text-dim)', letterSpacing: '0.1em' }}>
        {t('inventory', lang)}
          </h4>
          {inventorySaved && (
            <span style={{ fontSize: 11, color: 'var(--eldritch-green)' }}>✓ {t('saved', lang)}</span>
          )}
          {!inventoryEditing && (
            <button
              className="btn btn-sm"
              onClick={() => setInventoryEditing(true)}
              style={{ fontSize: 10, padding: '3px 10px' }}
            >
              {t('edit', lang)}
            </button>
          )}
        </div>

        {inventoryEditing ? (
          <div>
            <textarea
              value={inventoryText}
              onChange={e => setInventoryText(e.target.value)}
              rows={5}
              placeholder={t('inventoryPh', lang)}
              style={{ resize: 'vertical', fontSize: 13 }}
              autoFocus
            />
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button
                className="btn btn-sm"
                onClick={() => { setInventoryText(character.inventory || ''); setInventoryEditing(false) }}
              >
                {t('cancel', lang)}
              </button>
              <button
                className="btn btn-sm btn-primary"
                onClick={handleSaveInventory}
                disabled={saving}
                style={{ flex: 1 }}
              >
                {saving ? t('saving', lang) : t('saveInventory', lang)}
              </button>
            </div>
          </div>
        ) : (
          <div
            onClick={() => setInventoryEditing(true)}
            style={{
              padding: '10px 12px', background: 'var(--bg-deep)', borderRadius: 'var(--radius)',
              border: '1px solid var(--border)', cursor: 'pointer', minHeight: 44,
              fontSize: 13, color: character.inventory ? 'var(--text-faded)' : 'var(--text-dim)',
              whiteSpace: 'pre-wrap', lineHeight: 1.5, transition: 'border-color 0.2s',
            }}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--gold-dim)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
            title="Click to edit"
          >
            {character.inventory || t('inventoryEmpty', lang)}
          </div>
        )}
      </div>

      {/* ── Known Spells ───────────────────────── */}
      {character.spells && character.spells.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <h4 style={{ fontSize: 12, color: 'var(--text-dim)', letterSpacing: '0.1em', marginBottom: 8 }}>
        {t('knownSpells', lang)}
          </h4>
          {character.spells.map(s => (
            <div key={s.spell_id} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '5px 10px', marginBottom: 3, borderRadius: 3,
              background: 'var(--bg-deep)',
            }}>
              <span style={{ fontSize: 13, color: 'var(--sanity-blue)' }}>{pickName(s.spell_name, s.spell_name_ru, lang)}</span>
              <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-dim)' }}>
                −{s.cost_mp}MP −{s.cost_san}SAN
              </span>
            </div>
          ))}
        </div>
      )}

      {/* ── Biography ──────────────────────────── */}
      {(character.description || character.ideals || character.phobias || character.significant_people || character.possessions || character.injuries_scars || character.significant_places) && (
        <div style={{ marginTop: 20 }}>
          <h4 style={{ fontSize: 12, color: 'var(--text-dim)', letterSpacing: '0.1em', marginBottom: 10 }}>
        {t('biographyHeader', lang)}
          </h4>
          {[
            { key: 'description', label: t('descBackstory', lang) },
            { key: 'ideals', label: t('idealsPrinciples', lang) },
            { key: 'significant_people', label: t('significantPeople', lang) },
            { key: 'significant_places', label: t('significantPlaces', lang) },
            { key: 'possessions', label: t('possessions', lang) },
            { key: 'injuries_scars', label: t('injuriesScars', lang) },
            { key: 'phobias', label: t('phobias', lang) },
          ].filter(f => character[f.key]).map(f => (
            <div key={f.key} style={{ marginBottom: 10 }}>
              <label style={{ fontSize: 10, marginBottom: 3 }}>{f.label}</label>
              <p style={{
                fontSize: 13, color: 'var(--text-faded)', lineHeight: 1.5,
                padding: '6px 10px', background: 'var(--bg-deep)', borderRadius: 3,
                whiteSpace: 'pre-wrap',
              }}>
                {character[f.key]}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
