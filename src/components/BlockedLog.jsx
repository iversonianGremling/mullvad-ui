import { useEffect, useState } from 'react'

export default function BlockedLog() {
  const [entries, setEntries] = useState([])

  useEffect(() => {
    fetch('/api/log?n=5')
      .then(r => r.json())
      .then(data => setEntries(data))
      .catch(() => {})
  }, [])

  if (entries.length === 0) return null

  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 12, padding: '18px 20px',
    }}>
      <div style={{
        fontSize: 10, fontWeight: 700, letterSpacing: '.7px',
        textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 14,
      }}>
        Recent Block Events
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {entries.map((e, i) => (
          <div key={i} style={{
            background: 'var(--surface2)', borderRadius: 8,
            padding: '10px 12px',
            border: '1px solid var(--border)',
          }}>
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              marginBottom: 5, flexWrap: 'wrap', gap: 4,
            }}>
              <span style={{
                fontFamily: 'var(--mono)', fontSize: 12,
                color: 'var(--disconn)', fontWeight: 600,
              }}>
                {e.domain || 'unknown domain'}
              </span>
              <span style={{ fontSize: 10, color: 'var(--muted)' }}>
                {e.ts}
              </span>
            </div>
            <div style={{
              fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--muted)',
            }}>
              {e.old_relay} ({e.old_ip}) →{' '}
              <span style={{ color: 'var(--connected)' }}>
                {e.new_relay} ({e.new_ip})
              </span>
            </div>
            {e.reporter && (
              <div style={{ fontSize: 10, color: 'var(--muted2)', marginTop: 3 }}>
                reported by {e.reporter}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
