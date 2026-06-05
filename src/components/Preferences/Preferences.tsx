import { useEffect, useState } from 'react'
import './Preferences.css'

interface Props { onClose: () => void }

type StartupMode = 'auto' | 'readme' | 'blank' | 'recent'

export function Preferences({ onClose }: Props) {
  const [startup, setStartup] = useState<StartupMode>('auto')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    window.electronAPI?.getPreferences().then(p => {
      setStartup((p?.startup as StartupMode) ?? 'auto')
      setLoading(false)
    })
  }, [])

  const handleSave = async () => {
    const prefs = await window.electronAPI?.getPreferences() ?? {}
    // startupChosen marks this as an explicit user choice so it is never
    // re-migrated by the legacy 'readme' → 'auto' migration in main.
    await window.electronAPI?.setPreferences({ ...prefs, startup, startupChosen: true })
    onClose()
  }

  if (loading) return null

  return (
    <div className="prefs-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="prefs-dialog">
        <div className="prefs-header">
          <h2>Preferences</h2>
          <button className="prefs-close" onClick={onClose}>✕</button>
        </div>

        <div className="prefs-body">
          <div className="prefs-row">
            <label className="prefs-label">On Launch</label>
            <div className="prefs-options">
              {([
                ['auto',    'Show README for the first few launches, then blank'],
                ['readme',  'Always open README document'],
                ['blank',   'Open blank document'],
                ['recent',  'Open most recent document'],
              ] as [StartupMode, string][]).map(([value, label]) => (
                <label key={value} className="prefs-radio">
                  <input
                    type="radio"
                    name="startup"
                    value={value}
                    checked={startup === value}
                    onChange={() => setStartup(value)}
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="prefs-footer">
          <button className="prefs-btn" onClick={onClose}>Cancel</button>
          <button className="prefs-btn prefs-btn-primary" onClick={handleSave}>Save</button>
        </div>
      </div>
    </div>
  )
}
