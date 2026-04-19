import { useEffect, useState } from 'react'
import { useDocumentStore } from '../../store/documentStore'
import './DocumentInfo.css'

interface FileStat {
  created: string
  modified: string
  size: number
}

interface Props {
  onClose: () => void
}

function computeStats(content: string) {
  const chars      = content.length
  const charsNoSp  = content.replace(/\s/g, '').length
  const lines      = content.split('\n').length
  // Words: split on whitespace, filter empties
  const words      = content.trim() === '' ? 0 : content.trim().split(/\s+/).length
  // Headings: lines starting with #
  const headings   = content.split('\n').filter(l => /^#{1,6}\s/.test(l)).length
  // Reading time: ~238 wpm average
  const readMins   = Math.max(1, Math.round(words / 238))
  // Pages: ~250 words per page
  const pages      = Math.max(1, Math.round(words / 250 * 10) / 10)
  return { chars, charsNoSp, lines, words, headings, readMins, pages }
}

function fmt(iso: string) {
  const d = new Date(iso)
  return d.toLocaleString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function fmtSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

export function DocumentInfo({ onClose }: Props) {
  const { content, filePath } = useDocumentStore()
  const [stat, setStat] = useState<FileStat | null>(null)
  const stats = computeStats(content)

  useEffect(() => {
    if (filePath) {
      window.electronAPI?.statFile(filePath).then(s => setStat(s ?? null))
    }
  }, [filePath])

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div className="docinfo-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="docinfo-dialog" role="dialog" aria-label="Document Info">
        <div className="docinfo-header">
          <h2>Document Info</h2>
          <button className="docinfo-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div className="docinfo-body">
          {/* File Info */}
          <section className="docinfo-section">
            <h3>File</h3>
            <dl>
              <dt>Name</dt>
              <dd>{filePath ? filePath.split('/').pop() : '(unsaved)'}</dd>

              {filePath && <>
                <dt>Location</dt>
                <dd className="docinfo-path">{filePath}</dd>
              </>}

              {stat && <>
                <dt>Size</dt>
                <dd>{fmtSize(stat.size)}</dd>

                <dt>Created</dt>
                <dd>{fmt(stat.created)}</dd>

                <dt>Modified</dt>
                <dd>{fmt(stat.modified)}</dd>
              </>}
            </dl>
          </section>

          {/* Content Stats */}
          <section className="docinfo-section">
            <h3>Content</h3>
            <div className="docinfo-grid">
              <div className="docinfo-stat">
                <span className="docinfo-stat-value">{stats.words.toLocaleString()}</span>
                <span className="docinfo-stat-label">Words</span>
              </div>
              <div className="docinfo-stat">
                <span className="docinfo-stat-value">{stats.chars.toLocaleString()}</span>
                <span className="docinfo-stat-label">Characters</span>
              </div>
              <div className="docinfo-stat">
                <span className="docinfo-stat-value">{stats.charsNoSp.toLocaleString()}</span>
                <span className="docinfo-stat-label">Chars (no spaces)</span>
              </div>
              <div className="docinfo-stat">
                <span className="docinfo-stat-value">{stats.lines.toLocaleString()}</span>
                <span className="docinfo-stat-label">Lines</span>
              </div>
              <div className="docinfo-stat">
                <span className="docinfo-stat-value">{stats.headings}</span>
                <span className="docinfo-stat-label">Headings</span>
              </div>
              <div className="docinfo-stat">
                <span className="docinfo-stat-value">~{stats.pages}</span>
                <span className="docinfo-stat-label">Pages</span>
              </div>
              <div className="docinfo-stat docinfo-stat--wide">
                <span className="docinfo-stat-value">{stats.readMins} min</span>
                <span className="docinfo-stat-label">Reading time</span>
              </div>
            </div>
          </section>
        </div>

        <div className="docinfo-footer">
          <button className="docinfo-btn docinfo-btn--primary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
