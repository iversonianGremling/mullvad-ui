import { useState, useEffect, useCallback } from 'react'

function IconEye({ crossed }) {
  return crossed ? (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
      <path d="M1 1l12 12M5.9 5.3A2 2 0 009 8.1"/>
      <path d="M3.2 3.7C1.9 4.7 1 6 1 7s2.2 4 6 4c1.2 0 2.2-.3 3-.7"/>
      <path d="M11.5 9.3C12.5 8.4 13 7.3 13 7c0-1-2.2-4-6-4-.7 0-1.4.1-2 .3"/>
    </svg>
  ) : (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
      <ellipse cx="7" cy="7" rx="6" ry="4"/>
      <circle cx="7" cy="7" r="1.8"/>
    </svg>
  )
}

function IconCopy({ done }) {
  return done ? (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2.5 7.5l3 3 6-6"/>
    </svg>
  ) : (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="5" width="7" height="7" rx="1.5"/>
      <path d="M9 5V3.5A1.5 1.5 0 007.5 2h-4A1.5 1.5 0 002 3.5v4A1.5 1.5 0 003.5 9H5"/>
    </svg>
  )
}

const iconBtn = {
  background: 'none', border: 'none', padding: '3px 5px', cursor: 'pointer',
  color: 'var(--muted)', borderRadius: 4, display: 'flex', alignItems: 'center',
  lineHeight: 1,
}

function formatNum(num, revealed) {
  if (!num) return '—'
  const groups = num.match(/.{1,4}/g) || []
  if (!revealed) return '•••• •••• •••• ••••'
  return groups.join(' ')
}

export default function AccountCard() {
  const [account,  setAccount]  = useState(null)
  const [revealed, setRevealed] = useState(false)
  const [copied,   setCopied]   = useState(false)
  const [changing, setChanging] = useState(false)
  const [newNum,   setNewNum]   = useState('')
  const [saving,   setSaving]   = useState(false)
  const [error,    setError]    = useState(null)

  const load = useCallback(async () => {
    try {
      const r = await fetch('/api/account')
      setAccount(await r.json())
    } catch {}
  }, [])

  useEffect(() => { load() }, [load])

  async function copy() {
    if (!account?.number) return
    try { await navigator.clipboard.writeText(account.number) } catch { return }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function save() {
    const num = newNum.replace(/\D/g, '')
    if (!/^\d{16}$/.test(num)) { setError('Must be a 16-digit account number'); return }
    setSaving(true); setError(null)
    try {
      const r = await fetch('/api/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'set_account', number: num }),
      })
      const data = await r.json()
      if (data.error) { setError(data.error); setSaving(false); return }
      setChanging(false); setNewNum('')
      await load()
    } catch { setError('Request failed') }
    setSaving(false)
  }

  const days = account?.daysLeft
  const daysColor = days == null ? 'var(--muted)'
    : days <= 7  ? 'var(--disconn)'
    : days <= 30 ? '#e0a843'
    : 'var(--connected)'

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '16px 18px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 14 }}>
        <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', color: 'var(--muted)', flex: 1 }}>
          Account
        </span>
        <a
          href="https://mullvad.net/en/account"
          target="_blank" rel="noreferrer"
          style={{ fontSize: 11, color: 'var(--accent-text)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 3 }}
          onMouseEnter={e => e.currentTarget.style.textDecoration = 'underline'}
          onMouseLeave={e => e.currentTarget.style.textDecoration = 'none'}
        >
          Add time ↗
        </a>
      </div>

      {/* Account number row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 12 }}>
        <span style={{
          fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text-strong)',
          flex: 1, letterSpacing: '0.3px', userSelect: revealed ? 'text' : 'none',
        }}>
          {account ? formatNum(account.number, revealed) : '—'}
        </span>
        <button
          onClick={() => setRevealed(r => !r)}
          style={{ ...iconBtn, color: revealed ? 'var(--accent-text)' : 'var(--muted)' }}
          title={revealed ? 'Hide' : 'Reveal'}
        >
          <IconEye crossed={!revealed} />
        </button>
        <button
          onClick={copy}
          style={{ ...iconBtn, color: copied ? 'var(--connected)' : 'var(--muted)' }}
          title="Copy account number"
        >
          <IconCopy done={copied} />
        </button>
      </div>

      {/* Days remaining */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 14, paddingBottom: 14, borderBottom: '1px solid var(--border)' }}>
        <span style={{ fontSize: 24, fontWeight: 700, fontFamily: 'var(--mono)', color: daysColor, lineHeight: 1 }}>
          {days ?? '—'}
        </span>
        <span style={{ fontSize: 11, color: 'var(--muted)' }}>days remaining</span>
        {days !== null && days !== undefined && days <= 30 && (
          <span style={{ marginLeft: 'auto', fontSize: 10, color: daysColor, fontWeight: 600 }}>
            {days <= 0 ? 'Expired' : days <= 7 ? 'Expiring soon' : 'Low'}
          </span>
        )}
      </div>

      {/* Change account */}
      {!changing ? (
        <button
          onClick={() => setChanging(true)}
          style={{
            width: '100%', padding: '7px', borderRadius: 6, fontSize: 12,
            background: 'var(--surface2)', border: '1px solid var(--border)',
            color: 'var(--muted)', cursor: 'pointer',
          }}
        >
          Change account…
        </button>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          <input
            autoFocus
            value={newNum}
            onChange={e => { setNewNum(e.target.value.replace(/\D/g, '').slice(0, 16)); setError(null) }}
            placeholder="16-digit account number"
            style={{
              width: '100%', padding: '8px 10px', borderRadius: 6, fontSize: 12,
              fontFamily: 'var(--mono)', letterSpacing: '0.5px',
              background: 'var(--surface2)', border: `1px solid ${error ? 'var(--disconn)' : 'var(--border2)'}`,
              color: 'var(--text)', outline: 'none',
            }}
            onFocus={e => e.target.style.borderColor = error ? 'var(--disconn)' : 'var(--accent)'}
            onBlur={e  => e.target.style.borderColor = error ? 'var(--disconn)' : 'var(--border2)'}
            onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') { setChanging(false); setNewNum(''); setError(null) } }}
          />
          {error && <span style={{ fontSize: 11, color: 'var(--disconn)' }}>{error}</span>}
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              onClick={save}
              disabled={saving}
              style={{
                flex: 1, padding: '7px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                background: 'rgba(68,173,194,.12)', border: '1px solid rgba(68,173,194,.3)',
                color: 'var(--accent-text)', cursor: saving ? 'wait' : 'pointer',
                opacity: saving ? 0.6 : 1,
              }}
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button
              onClick={() => { setChanging(false); setNewNum(''); setError(null) }}
              style={{
                padding: '7px 14px', borderRadius: 6, fontSize: 12,
                background: 'var(--surface2)', border: '1px solid var(--border)',
                color: 'var(--muted)', cursor: 'pointer',
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
