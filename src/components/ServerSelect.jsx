import { useState, useMemo, useRef, useEffect } from 'react'

async function postAction(action, extra = {}) {
  await fetch('/api/action', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, ...extra }),
  })
}

function ChevronDown({ size = 12 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" fill="none">
      <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

export default function ServerSelect({ relays, currentRelay, daitaFilter, onDaitaToggle, onRefresh }) {
  const [search,   setSearch]   = useState('')
  const [expanded, setExpanded] = useState({})
  const [busy,     setBusy]     = useState(null)
  const searchRef = useRef(null)

  const currentCC = useMemo(() => {
    const code = (currentRelay || '').split(' ')[0]
    return code ? code.slice(0, 2).toLowerCase() : ''
  }, [currentRelay])

  // Build filtered + annotated country list
  const countries = useMemo(() => {
    const q = search.trim().toLowerCase()
    return Object.entries(relays || {}).map(([cc, data]) => {
      const allRelays    = data.relays
      const daitaRelays  = allRelays.filter(r => r.daita)
      const visibleRelays = daitaFilter ? daitaRelays : allRelays

      // Search match
      const nameMatch  = !q || data.name.toLowerCase().includes(q)
      const relayMatch = !q ? [] : visibleRelays.filter(r => r.name.includes(q))
      if (q && !nameMatch && relayMatch.length === 0) return null

      return {
        cc, name: data.name,
        allRelays, daitaRelays, visibleRelays,
        matchedRelays: q && !nameMatch ? relayMatch : visibleRelays,
        autoExpand: q && (relayMatch.length > 0 || nameMatch),
      }
    }).filter(Boolean)
  }, [relays, daitaFilter, search])

  // Auto-expand on search
  useEffect(() => {
    if (!search.trim()) return
    const toOpen = {}
    countries.forEach(c => { if (c.autoExpand) toOpen[c.cc] = true })
    setExpanded(prev => ({ ...prev, ...toOpen }))
  }, [search, countries])

  function toggle(cc) {
    setExpanded(prev => ({ ...prev, [cc]: !prev[cc] }))
  }

  async function connectCountry(cc) {
    setBusy(`cc:${cc}`)
    await postAction('connect_country', { country: cc })
    await onRefresh()
    setBusy(null)
  }

  async function connectRelay(name) {
    setBusy(`r:${name}`)
    await postAction('map_relay', { relay: name })
    await onRefresh()
    setBusy(null)
  }

  const isBusy = busy !== null

  const btn = (label, onClick, opts = {}) => (
    <button
      onClick={onClick}
      disabled={isBusy}
      style={{
        padding: '3px 9px', fontSize: 11, fontWeight: 600, borderRadius: 5,
        border: '1px solid var(--border2)',
        background: opts.primary ? 'var(--accent-dim)' : 'var(--surface2)',
        color: opts.primary ? '#d4ccf5' : 'var(--muted)',
        cursor: isBusy ? 'wait' : 'pointer',
        whiteSpace: 'nowrap', flexShrink: 0,
        ...(opts.style || {}),
      }}
    >{label}</button>
  )

  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 10, overflow: 'hidden',
    }}>

      {/* ── Header ─────────────────────────────────────────────── */}
      <div style={{
        padding: '12px 14px', borderBottom: '1px solid var(--border)',
        display: 'flex', gap: 8, alignItems: 'center',
      }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: 1 }}>
          <svg style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
            width="13" height="13" viewBox="0 0 13 13" fill="none">
            <circle cx="5.5" cy="5.5" r="4" stroke="var(--muted)" strokeWidth="1.3"/>
            <path d="M9 9l2.5 2.5" stroke="var(--muted)" strokeWidth="1.3" strokeLinecap="round"/>
          </svg>
          <input
            ref={searchRef}
            type="text"
            placeholder="Search country or server…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%', padding: '7px 10px 7px 28px',
              background: 'var(--surface2)', border: '1px solid var(--border)',
              borderRadius: 6, color: 'var(--text)', fontSize: 12,
              outline: 'none',
            }}
            onFocus={e => e.target.style.borderColor = 'var(--accent)'}
            onBlur={e  => e.target.style.borderColor = 'var(--border)'}
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              style={{
                position: 'absolute', right: 7, top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer',
                fontSize: 14, padding: '0 2px', lineHeight: 1,
              }}
            >×</button>
          )}
        </div>

        {/* DAITA toggle */}
        <button
          onClick={onDaitaToggle}
          style={{
            padding: '7px 11px', fontSize: 11, fontWeight: 700, borderRadius: 6,
            cursor: 'pointer', letterSpacing: '.4px', flexShrink: 0,
            background: daitaFilter ? 'rgba(109,79,212,.25)' : 'var(--surface2)',
            color: daitaFilter ? 'var(--accent-text)' : 'var(--muted)',
            border: `1px solid ${daitaFilter ? 'rgba(109,79,212,.4)' : 'var(--border)'}`,
          }}
        >
          ⬡ DAITA
        </button>
      </div>

      {/* ── Country list ───────────────────────────────────────── */}
      <div style={{ maxHeight: 420, overflowY: 'auto' }}>
        {countries.length === 0 && (
          <div style={{ color: 'var(--muted)', fontSize: 12, padding: '20px 16px', textAlign: 'center' }}>
            No servers match your search
          </div>
        )}

        {countries.map(c => {
          const isCurrentCC    = c.cc === currentCC
          const isExpandedNow  = expanded[c.cc] ?? false
          const busyCC         = busy === `cc:${c.cc}`
          const daitaCount     = c.daitaRelays.length
          const showCount      = daitaFilter ? daitaCount : c.allRelays.length
          const hasVisible     = c.visibleRelays.length > 0

          return (
            <div key={c.cc}>
              {/* Country row */}
              <div
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '0 14px', height: 40,
                  borderBottom: `1px solid var(--border)`,
                  background: isCurrentCC ? 'rgba(109,79,212,.06)' : 'transparent',
                  opacity: hasVisible ? 1 : 0.35,
                }}
              >
                {/* Chevron expand button */}
                <button
                  onClick={() => hasVisible && toggle(c.cc)}
                  disabled={!hasVisible}
                  style={{
                    background: 'none', border: 'none', padding: '4px 3px',
                    color: isExpandedNow ? 'var(--accent-text)' : 'var(--muted)',
                    cursor: hasVisible ? 'pointer' : 'default',
                    display: 'flex', alignItems: 'center',
                    transform: isExpandedNow ? 'rotate(0deg)' : 'rotate(-90deg)',
                  }}
                >
                  <ChevronDown size={11} />
                </button>

                {/* Country code badge */}
                <span style={{
                  fontSize: 10, fontWeight: 700, fontFamily: 'var(--mono)',
                  color: 'var(--muted)', minWidth: 22, textTransform: 'uppercase',
                }}>
                  {c.cc}
                </span>

                {/* Country name */}
                <span style={{
                  flex: 1, fontSize: 13, color: isCurrentCC ? 'var(--accent-text)' : 'var(--text)',
                  fontWeight: isCurrentCC ? 500 : 400,
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                  {c.name}
                </span>

                {/* Count badge */}
                <span style={{
                  fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--mono)',
                  flexShrink: 0,
                }}>
                  {daitaFilter
                    ? <>{daitaCount}<span style={{ color: 'var(--muted2)' }}>/{c.allRelays.length}</span></>
                    : showCount
                  }
                </span>

                {/* Connect country button */}
                <button
                  onClick={() => hasVisible && connectCountry(c.cc)}
                  disabled={isBusy || !hasVisible}
                  style={{
                    padding: '3px 9px', fontSize: 11, fontWeight: 600, borderRadius: 5,
                    border: `1px solid ${isCurrentCC ? 'rgba(109,79,212,.4)' : 'var(--border2)'}`,
                    background: isCurrentCC ? 'rgba(109,79,212,.18)' : 'var(--surface2)',
                    color: isCurrentCC ? 'var(--accent-text)' : 'var(--muted)',
                    cursor: (isBusy || !hasVisible) ? 'wait' : 'pointer',
                    whiteSpace: 'nowrap', flexShrink: 0,
                  }}
                >
                  {busyCC ? '…' : isCurrentCC ? '● Active' : 'Connect'}
                </button>
              </div>

              {/* Expanded relay list */}
              {isExpandedNow && hasVisible && (
                <div style={{ background: 'rgba(4,2,10,.4)' }}>
                  {c.matchedRelays.map(r => {
                    const isActive  = (currentRelay || '').split(' ')[0] === r.name
                    const busyRelay = busy === `r:${r.name}`
                    return (
                      <div
                        key={r.name}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 8,
                          padding: '0 14px 0 38px', height: 34,
                          borderBottom: '1px solid rgba(28,23,41,.6)',
                          background: isActive ? 'rgba(109,79,212,.08)' : 'transparent',
                        }}
                      >
                        {/* Relay name */}
                        <span style={{
                          flex: 1, fontFamily: 'var(--mono)', fontSize: 11,
                          color: isActive ? 'var(--accent-text)' : 'var(--text)',
                          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        }}>
                          {r.name}
                        </span>

                        {/* DAITA badge */}
                        {r.daita && (
                          <span style={{
                            fontSize: 9, fontWeight: 700, padding: '1px 5px',
                            borderRadius: 3, flexShrink: 0,
                            background: 'rgba(109,79,212,.18)',
                            color: 'var(--accent-text)', letterSpacing: '.4px',
                          }}>
                            DAITA
                          </span>
                        )}

                        {/* OVPN badge */}
                        {r.type === 'ovpn' && (
                          <span style={{
                            fontSize: 9, fontWeight: 600, padding: '1px 5px',
                            borderRadius: 3, flexShrink: 0,
                            background: 'rgba(251,191,36,.08)', color: '#a08040',
                          }}>
                            OVPN
                          </span>
                        )}

                        {/* Connect relay */}
                        <button
                          onClick={() => connectRelay(r.name)}
                          disabled={isBusy}
                          style={{
                            padding: '2px 8px', fontSize: 10, fontWeight: 600, borderRadius: 4,
                            border: `1px solid ${isActive ? 'rgba(109,79,212,.4)' : 'var(--border)'}`,
                            background: isActive ? 'rgba(109,79,212,.18)' : 'var(--surface2)',
                            color: isActive ? 'var(--accent-text)' : 'var(--muted)',
                            cursor: isBusy ? 'wait' : 'pointer',
                            flexShrink: 0, whiteSpace: 'nowrap',
                          }}
                        >
                          {busyRelay ? '…' : isActive ? 'Active' : '→'}
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
