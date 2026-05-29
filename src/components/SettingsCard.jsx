import { useState } from 'react'

async function postAction(action, extra = {}) {
  await fetch('/api/action', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, ...extra }),
  })
}

function Toggle({ on, onChange, busy }) {
  return (
    <label style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', cursor: busy ? 'wait' : 'pointer' }}>
      <input
        type="checkbox"
        checked={on}
        onChange={onChange}
        disabled={busy}
        style={{ opacity: 0, width: 0, height: 0, position: 'absolute' }}
      />
      <span style={{
        display: 'inline-block',
        width: 40, height: 22,
        background: on ? 'var(--accent-dim)' : 'var(--muted2)',
        borderRadius: 11,
        position: 'relative',
      }}>
        <span style={{
          position: 'absolute',
          top: 3, left: on ? 21 : 3,
          width: 16, height: 16,
          borderRadius: '50%',
          background: on ? 'var(--accent)' : 'var(--muted)',
          boxShadow: on ? '0 0 6px var(--accent-glow)' : 'none',
        }} />
      </span>
    </label>
  )
}

export default function SettingsCard({ settings, relays, onRefresh }) {
  const [busy, setBusy] = useState(null)

  async function toggle(action) {
    setBusy(action)
    await postAction(action)
    await onRefresh()
    setBusy(null)
  }

  async function setEntry(country) {
    setBusy('set_entry')
    await postAction('set_entry', { entry_country: country })
    await onRefresh()
    setBusy(null)
  }

  const rows = [
    { label: 'DAITA',             key: 'daita',        action: 'toggle_daita',        highlight: true },
    { label: 'Auto-connect',      key: 'autoconnect',  action: 'toggle_autoconnect' },
    { label: 'Lockdown Mode',     key: 'lockdown',     action: 'toggle_lockdown' },
    { label: 'LAN Sharing',       key: 'lan_allow',    action: 'toggle_lan' },
    { label: 'Quantum Resistance',key: 'qr',           action: 'toggle_qr' },
    { label: 'Multihop',          key: 'multihop',     action: 'toggle_multihop' },
  ]

  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 12, padding: '18px 20px',
    }}>
      <div style={{
        fontSize: 10, fontWeight: 700, letterSpacing: '.7px',
        textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 14,
      }}>
        Settings
      </div>

      {rows.map(({ label, key, action, highlight }) => (
        <div key={key} style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '10px 0',
          borderBottom: '1px solid var(--border)',
          ...(highlight ? {
            margin: '0 -20px', padding: '10px 20px',
            background: settings?.[key] ? 'rgba(167,139,250,.05)' : 'transparent',
          } : {}),
        }}>
          <span style={{
            fontSize: 13, color: highlight ? 'var(--accent)' : 'var(--text)', fontWeight: highlight ? 600 : 400,
          }}>
            {label}
            {highlight && (
              <span style={{
                marginLeft: 7, fontSize: 9, fontWeight: 700,
                background: 'var(--accent-glow)', color: 'var(--accent)',
                padding: '1px 5px', borderRadius: 4, letterSpacing: '.5px',
              }}>KEY</span>
            )}
          </span>
          <Toggle
            on={settings?.[key] ?? false}
            onChange={() => toggle(action)}
            busy={busy === action}
          />
        </div>
      ))}

      {settings?.multihop && (
        <div style={{
          display: 'flex', gap: 8, alignItems: 'center',
          marginTop: 10, paddingTop: 10,
          borderTop: '1px solid var(--border)',
        }}>
          <span style={{ fontSize: 12, color: 'var(--muted)', whiteSpace: 'nowrap' }}>
            Entry:
          </span>
          <select
            defaultValue={settings.multihop_entry}
            onChange={e => setEntry(e.target.value)}
            disabled={busy === 'set_entry'}
            style={{
              flex: 1, padding: '6px 10px', borderRadius: 6,
              border: '1px solid var(--border)',
              background: 'var(--surface2)', color: 'var(--text)',
              fontSize: 12, cursor: 'pointer',
            }}
          >
            {Object.entries(relays || {}).map(([cc, c]) => (
              <option key={cc} value={cc}>{c.name}</option>
            ))}
          </select>
        </div>
      )}
    </div>
  )
}
