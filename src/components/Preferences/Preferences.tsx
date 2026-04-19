import { useEffect, useState } from 'react'
import './Preferences.css'

interface Props { onClose: () => void }

type StartupMode = 'readme' | 'blank' | 'recent'

export function Preferences({ onClose }: Props) {
  const [startup, setStartup] = useState<StartupMode>('readme')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    window.electronAPI?.getPreferences().then(p => {
      setStartup((p?.startup as StartupMode) ?? 'readme')
      setLoading(false)
    })
  }, [])

  const handleSave = async () => {
    const prefs = await window.electronAPI?.getPreferences() ?? {}
    await window.electronAPI?.setPreferences({ ...prefs, startup })
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
                ['readme',  'Open README document'],
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
