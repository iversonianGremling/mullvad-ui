const DOWNLOADS = [
  { label: 'Windows', href: 'https://mullvad.net/en/download/app/exe/latest', icon: '🪟' },
  { label: 'macOS',   href: 'https://mullvad.net/en/download/app/pkg/latest', icon: '🍎' },
  { label: 'Linux',   href: 'https://github.com/mullvad/mullvadvpn-app/releases/tag/2024.8', icon: '🐧' },
  { label: 'iOS',     href: 'https://apps.apple.com/app/mullvad-vpn/id1488466513', icon: '📱' },
  { label: 'Android', href: 'https://mullvad.net/en/download/app/apk/latest', icon: '🤖' },
]

const s = {
  page: { padding: 32 },
  heading: { fontSize: 22, fontWeight: 700, marginBottom: 8, color: 'var(--text)' },
  sub: { color: 'var(--muted)', marginBottom: 28, fontSize: 13 },
  grid: { display: 'flex', flexWrap: 'wrap', gap: 16 },
  card: {
    background: 'var(--surface)', border: '1px solid var(--border)',
    borderRadius: 12, padding: '24px 32px',
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
    textDecoration: 'none', transition: 'border-color .15s, background .15s',
    minWidth: 140,
  },
  icon: { fontSize: 32 },
  label: { color: 'var(--text)', fontWeight: 600, fontSize: 14 },
}

export default function DownloadPage() {
  return (
    <div style={s.page}>
      <h1 style={s.heading}>Download Mullvad VPN</h1>
      <p style={s.sub}>Get the official client for your platform.</p>
      <div style={s.grid}>
        {DOWNLOADS.map(d => (
          <a
            key={d.label}
            href={d.href}
            style={s.card}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = 'var(--accent)'
              e.currentTarget.style.background = 'var(--surface2)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = 'var(--border)'
              e.currentTarget.style.background = 'var(--surface)'
            }}
          >
            <span style={s.icon}>{d.icon}</span>
            <span style={s.label}>{d.label}</span>
          </a>
        ))}
      </div>
    </div>
  )
}
