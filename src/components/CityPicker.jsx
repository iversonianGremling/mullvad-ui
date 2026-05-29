import { useState } from 'react'

export default function CityPicker({ city, currentRelay, daitaFilter, onDaitaToggle, onClose, onRefresh }) {
  const [busy, setBusy] = useState(null)

  if (!city) return null

  let relays = city.relays
  if (daitaFilter) relays = relays.filter(r => r.daita)

  async function applyRelay(name) {
    setBusy(name)
    await fetch('/api/action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'map_relay', relay: name }),
    })
    await onRefresh()
    onClose()
    setBusy(null)
  }

  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 12, overflow: 'hidden',
    }}>
      <div style={{
        background: 'var(--sidebar)', padding: '11px 16px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        borderBottom: '1px solid var(--border)',
      }}>
        <span style={{ fontWeight: 700, color: 'var(--text)', fontSize: 13 }}>
          {city.city}, {city.country}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <label style={{
            display: 'flex', alignItems: 'center', gap: 5,
            color: 'var(--accent)', fontSize: 12, cursor: 'pointer',
          }}>
            <input
              type="checkbox"
              checked={daitaFilter}
              onChange={onDaitaToggle}
              style={{ accentColor: 'var(--accent)', cursor: 'pointer' }}
            />
            DAITA only
          </label>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', color: 'var(--muted)',
              cursor: 'pointer', fontSize: 16, padding: '0 4px', lineHeight: 1,
            }}
          >
            ✕
          </button>
        </div>
      </div>

      <div style={{ maxHeight: 220, overflowY: 'auto' }}>
        {relays.length === 0 ? (
          <div style={{ color: 'var(--muted)', padding: 16, fontSize: 12, textAlign: 'center' }}>
            No {daitaFilter ? 'DAITA ' : ''}relays available here
          </div>
        ) : (
          relays.map(r => (
            <div
              key={r.name}
              onClick={() => applyRelay(r.name)}
              style={{
                padding: '9px 16px', cursor: busy ? 'wait' : 'pointer',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                borderLeft: `2px solid ${r.name === currentRelay ? 'var(--accent)' : 'transparent'}`,
                background: r.name === currentRelay ? 'var(--surface2)' : 'transparent',
                transition: 'background .1s',
              }}
              onMouseEnter={e => { if (r.name !== currentRelay) e.currentTarget.style.background = 'var(--surface2)' }}
              onMouseLeave={e => { if (r.name !== currentRelay) e.currentTarget.style.background = 'transparent' }}
            >
              <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text)' }}>
                {busy === r.name ? '…' : r.name}
              </span>
              <span style={{ display: 'flex', gap: 4 }}>
                {r.daita && (
                  <span style={{
                    background: 'rgba(167,139,250,.15)', color: 'var(--accent)',
                    fontSize: 9, padding: '1px 5px', borderRadius: 3, fontWeight: 700,
                  }}>DAITA</span>
                )}
                {r.type === 'ovpn' && (
                  <span style={{
                    background: 'rgba(251,191,36,.1)', color: '#fbbf24',
                    fontSize: 9, padding: '1px 5px', borderRadius: 3,
                  }}>OVPN</span>
                )}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
