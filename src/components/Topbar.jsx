import { useIsMobile } from '../hooks.js'

export default function Topbar({ status }) {
  const isMobile  = useIsMobile()
  const connected = status?.connected
  const relay     = status?.relay

  return (
    <header style={{
      background: 'var(--topbar)',
      borderBottom: '1px solid var(--border)',
      display: 'flex',
      alignItems: 'center',
      padding: isMobile ? '0 12px' : '0 20px',
      height: 48,
      flexShrink: 0,
      gap: isMobile ? 12 : 24,
      zIndex: 100,
    }}>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <img
          src="/mullvad-icon.svg"
          alt="Mullvad"
          style={{ height: 28, width: 28, flexShrink: 0 }}
        />
        {!isMobile && (
          <span style={{
            color: 'var(--text-strong)', fontSize: 13, fontWeight: 600,
            letterSpacing: '.2px', borderLeft: '1px solid var(--border2)', paddingLeft: 10,
          }}>
            Gateway
          </span>
        )}
      </div>

      {/* Mullvad link */}
      <a
        href="https://mullvad.net"
        target="_blank"
        rel="noreferrer"
        style={{
          padding: isMobile ? '4px 10px' : '5px 12px',
          borderRadius: 6,
          fontSize: isMobile ? 12 : 13,
          color: 'var(--muted)',
          textDecoration: 'none',
        }}
        onMouseEnter={e => e.currentTarget.style.color = 'var(--accent-text)'}
        onMouseLeave={e => e.currentTarget.style.color = 'var(--muted)'}
      >
        mullvad.net ↗
      </a>

      <div style={{ flex: 1 }} />

      {/* Status badge — dot only on mobile, full label on desktop */}
      {connected !== undefined && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 7,
          padding: isMobile ? '4px 8px' : '4px 12px',
          borderRadius: 6,
          background: connected ? 'var(--conn-bg)' : 'var(--disconn-bg)',
          border: `1px solid ${connected ? 'rgba(40,149,106,.2)' : 'rgba(181,53,53,.2)'}`,
          flexShrink: 0,
        }}>
          <span style={{
            width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
            background: connected ? 'var(--connected)' : 'var(--disconn)',
          }} />
          {!isMobile && (
            <span style={{
              fontSize: 12, fontWeight: 500,
              color: connected ? 'var(--connected)' : 'var(--disconn)',
              fontFamily: 'var(--mono)',
              maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {connected ? ((relay || '').split(' ')[0] || 'Connected') : 'Disconnected'}
            </span>
          )}
        </div>
      )}
    </header>
  )
}
