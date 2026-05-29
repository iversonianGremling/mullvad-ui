import { useState, useRef } from 'react'

export default function StatusHero({ status, onRefresh, onStatusUpdate }) {
  const [busyAction, setBusyAction] = useState(null)
  const lastSnapshot = useRef({})

  const isReconnecting = busyAction === 'reconnect'
  const isBusy         = busyAction !== null

  // While reconnecting keep showing the pre-action values so nothing flickers to '—'
  const displayStatus = isReconnecting ? lastSnapshot.current : (status || {})
  const connected     = isReconnecting ? true : (displayStatus.connected ?? false)

  async function act(action) {
    lastSnapshot.current = { ...status }
    setBusyAction(action)
    try {
      const r = await fetch('/api/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      const data = await r.json()
      // Apply fresh status from the action response immediately — no polling lag
      if (data.status) onStatusUpdate(data.status)
    } catch {}
    setBusyAction(null)
    onRefresh()  // keep global poll in sync
  }

  const rows = [
    ['Relay',    displayStatus.relay    || '—'],
    ['Location', displayStatus.location || '—'],
    ['IP',       displayStatus.ip       || '—'],
    ['DNS',      (displayStatus.dns || []).join(', ') || '—'],
  ]

  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 10, padding: '16px 18px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 14 }}>
        <span style={{
          width: 10, height: 10, borderRadius: '50%', flexShrink: 0,
          background: isReconnecting ? 'var(--accent)' : connected ? 'var(--connected)' : 'var(--disconn)',
        }} />
        <span style={{
          fontSize: 15, fontWeight: 700, letterSpacing: '.2px',
          color: isReconnecting ? 'var(--accent-text)'
               : connected ? 'var(--connected)' : 'var(--disconn)',
        }}>
          {isReconnecting ? 'Reconnecting…'
           : connected ? 'Connected' : 'Disconnected'}
        </span>
      </div>

      <table style={{
        width: '100%', borderCollapse: 'collapse', marginBottom: 16,
        opacity: isReconnecting ? 0.4 : 1,
      }}>
        <tbody>
          {rows.map(([k, v]) => (
            <tr key={k}>
              <td style={{
                color: 'var(--muted)', fontSize: 11, fontWeight: 700,
                textTransform: 'uppercase', letterSpacing: '.5px',
                paddingRight: 12, paddingBottom: 5,
                whiteSpace: 'nowrap', verticalAlign: 'top', width: 1,
              }}>{k}</td>
              <td style={{
                color: 'var(--text-strong)', fontSize: 12,
                fontFamily: 'var(--mono)', paddingBottom: 5, wordBreak: 'break-all',
              }}>{v}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {isReconnecting && (
        <div style={{
          height: 2, borderRadius: 1, marginBottom: 14,
          background: 'var(--accent)', opacity: 0.4,
        }} />
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
        <button
          disabled={isBusy}
          onClick={() => act(connected ? 'disconnect' : 'connect')}
          style={{
            width: '100%', padding: '10px 16px', borderRadius: 7,
            border: `1.5px solid ${connected ? 'rgba(224,67,67,.35)' : 'rgba(68,229,122,.35)'}`,
            background: connected ? 'rgba(224,67,67,.07)' : 'rgba(68,229,122,.07)',
            color: connected ? 'var(--disconn)' : 'var(--connected)',
            fontWeight: 600, fontSize: 13,
            cursor: isBusy ? 'not-allowed' : 'pointer',
            opacity: isBusy && !isReconnecting ? 0.5 : 1,
          }}
        >
          {busyAction === 'connect'    ? 'Connecting…'
           : busyAction === 'disconnect' ? 'Disconnecting…'
           : connected ? 'Disconnect' : 'Connect'}
        </button>

        {(connected || isReconnecting) && (
          <button
            disabled={isBusy}
            onClick={() => act('reconnect')}
            style={{
              width: '100%', padding: '8px', borderRadius: 6,
              background: isReconnecting ? 'rgba(68,173,194,.08)' : 'var(--surface2)',
              color: isReconnecting ? 'var(--accent-text)' : 'var(--muted)',
              border: `1px solid ${isReconnecting ? 'rgba(68,173,194,.3)' : 'var(--border)'}`,
              fontSize: 12, cursor: isBusy ? 'not-allowed' : 'pointer',
            }}
          >
            {isReconnecting ? 'Finding new server…' : '↻ Reconnect to new server'}
          </button>
        )}
      </div>
    </div>
  )
}
