import { NavLink } from 'react-router-dom'

const s = {
  sidebar: {
    width: 220, minWidth: 220,
    background: 'var(--sidebar)',
    borderRight: '1px solid var(--border)',
    display: 'flex', flexDirection: 'column',
    position: 'sticky', top: 0, height: '100vh', overflow: 'hidden',
  },
  logoWrap: {
    padding: '24px 20px 18px',
    borderBottom: '1px solid var(--border)',
    textAlign: 'center',
  },
  logo: { width: 150, filter: 'brightness(0) invert(1) opacity(.85)' },
  meta: { padding: '12px 20px 6px' },
  metaTitle: { color: 'var(--text)', fontSize: 13, fontWeight: 600, marginBottom: 2 },
  metaBy: { color: 'var(--muted)', fontSize: 11 },
  metaLink: { color: 'var(--accent)', fontSize: 11 },
  nav: { padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: 4 },
  link: {
    display: 'block', padding: '9px 14px', borderRadius: 7,
    color: 'var(--muted)', fontSize: 13, fontWeight: 500,
    transition: 'background .15s, color .15s', textDecoration: 'none',
  },
  activeLink: {
    display: 'block', padding: '9px 14px', borderRadius: 7,
    background: 'var(--accent-glow)', color: 'var(--accent)', fontSize: 13, fontWeight: 600,
    textDecoration: 'none',
    borderLeft: '2px solid var(--accent)',
    paddingLeft: 12,
  },
  footer: {
    marginTop: 'auto', padding: '16px 20px',
    borderTop: '1px solid var(--border)',
    color: 'var(--muted)', fontSize: 11,
  },
}

export default function Sidebar() {
  return (
    <aside style={s.sidebar}>
      <div style={s.logoWrap}>
        <img
          src="https://mullvad.net/_app/immutable/assets/logo.Ba5MUFAA.svg"
          alt="Mullvad"
          style={s.logo}
        />
      </div>
      <div style={s.meta}>
        <div style={s.metaTitle}>Mullvad Gateway</div>
        <div style={s.metaBy}>
          by{' '}
          <a href="https://github.com/i-am-unbekannt" style={s.metaLink}>
            i_am_unbekannt
          </a>
        </div>
      </div>
      <nav style={s.nav}>
        <NavLink
          to="/"
          end
          style={({ isActive }) => (isActive ? s.activeLink : s.link)}
        >
          ◉ Status
        </NavLink>
        <NavLink
          to="/download"
          style={({ isActive }) => (isActive ? s.activeLink : s.link)}
        >
          ↓ Download
        </NavLink>
      </nav>
      <div style={s.footer}>Mullvad VPN Gateway</div>
    </aside>
  )
}
