import express from 'express'
import { exec }  from 'child_process'
import { promisify } from 'util'
import { readFile, appendFile } from 'fs/promises'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const execAsync = promisify(exec)
const __dirname = dirname(fileURLToPath(import.meta.url))
const DIST      = join(__dirname, 'dist')
const LOG_FILE  = '/var/log/mullvad-blocked.log'
const PORT      = 80

const app = express()
app.use(express.json())

// Never cache index.html so the browser always gets the latest asset hashes
app.get('/', (req, res, next) => {
  res.set('Cache-Control', 'no-store')
  next()
})
app.use(express.static(DIST))

async function run(cmd) {
  try {
    const { stdout } = await execAsync(cmd)
    return stdout.trim()
  } catch (e) {
    return ((e.stdout || '') + (e.stderr || '')).trim()
  }
}

function parseStatus(out) {
  const loc = (out.match(/Visible location:\s+(.+)/i) || [])[1] || ''
  return {
    connected: /^Connected/im.test(out),
    relay:     ((out.match(/Relay:\s+(.+)/i)      || [])[1] || 'N/A').trim(),
    location:  loc.replace(/\.\s+IPv4:.*$/i, '').trim() || 'N/A',
    ip:        ((out.match(/IPv4:\s+([\d.]+)/i)   || [])[1] || 'N/A').trim(),
  }
}

// ── GET /api/status ───────────────────────────────────────────────────────────
app.get('/api/status', async (req, res) => {
  const [statusOut, tunnelOut, relayOut, acOut, lmOut, lanOut, resolv] = await Promise.all([
    run('/bin/mullvad status'),
    run('/bin/mullvad tunnel get'),
    run('/bin/mullvad relay get'),
    run('/bin/mullvad auto-connect get'),
    run('/bin/mullvad lockdown-mode get'),
    run('/bin/mullvad lan get'),
    readFile('/etc/resolv.conf', 'utf8').catch(() => ''),
  ])

  const s   = parseStatus(statusOut)
  const dns = resolv.split('\n')
    .filter(l => l.startsWith('nameserver'))
    .map(l => l.split(/\s+/)[1]).filter(Boolean)

  const mhM = relayOut.match(/Multihop entry:\s+country\s+([a-z]+)/i)

  res.json({
    ...s, dns,
    settings: {
      autoconnect:    /:\s*on\b/i.test(acOut),
      lockdown:       /:\s*on\b/i.test(lmOut),
      lan_allow:      /:\s*allow\b/i.test(lanOut),
      daita:          /DAITA:\s+true/i.test(tunnelOut),
      qr:             /Quantum resistance:\s+on/i.test(tunnelOut),
      multihop:       /Multihop state:\s+enabled/i.test(relayOut),
      multihop_entry: mhM?.[1] || 'se',
    },
  })
})

// ── GET /api/relays ───────────────────────────────────────────────────────────
let relayCache = null, relayCacheAt = 0

async function fetchRelays() {
  if (relayCache && Date.now() - relayCacheAt < 60_000) return relayCache
  const raw = await run('/bin/mullvad relay list')
  const result = {}
  let cc = '', city = '', lat = 0, lon = 0
  for (const line of raw.split('\n')) {
    let m
    if ((m = line.match(/^([A-Za-z][A-Za-z\s,]+) \(([a-z]{2})\)$/))) {
      cc = m[2]; result[cc] = { name: m[1].trim(), relays: [] }
    } else if ((m = line.match(/^\t([^\t(]+?) \([a-z]{2,4}\) @ ([-\d.]+)°[A-Z],\s*([-\d.]+)°/))) {
      city = m[1].trim(); lat = +m[2]; lon = +m[3]
    } else if ((m = line.match(/^\t\t([a-z]{2}-[a-z]{3}-(?:wg|ovpn)-\d+).*\((rented|Mullvad-owned)\)/)) && cc) {
      const isWg = m[1].includes('-wg-'), isOwned = m[2] === 'Mullvad-owned'
      result[cc].relays.push({ name: m[1], type: isWg ? 'wg' : 'ovpn', city, coords: [lon, lat], daita: isWg && isOwned })
    }
  }
  relayCache = result; relayCacheAt = Date.now()
  return result
}

app.get('/api/relays', async (req, res) => { res.json(await fetchRelays()) })

// ── POST /api/action ──────────────────────────────────────────────────────────
const safeRelay   = r => /^[a-z]{2}-[a-z]{3}-(?:wg|ovpn)-\d+$/.test(r) ? r : null
const safeCountry = c => /^[a-z]{2}$/.test(c) ? c : null
const delay       = ms => new Promise(r => setTimeout(r, ms))

// Poll mullvad status until Connected, max 10 s
async function waitConnected() {
  for (let i = 0; i < 10; i++) {
    await delay(1000)
    const out = await run('/bin/mullvad status')
    if (/^Connected/im.test(out)) return
  }
}

app.post('/api/action', async (req, res) => {
  const { action, relay, entry_country } = req.body || {}

  const toggleMap = {
    toggle_autoconnect: {
      get: () => run('/bin/mullvad auto-connect get').then(o => /:\s*on\b/i.test(o)),
      set: on => run(`/bin/mullvad auto-connect set ${on ? 'off' : 'on'}`),
    },
    toggle_lockdown: {
      get: () => run('/bin/mullvad lockdown-mode get').then(o => /:\s*on\b/i.test(o)),
      set: on => run(`/bin/mullvad lockdown-mode set ${on ? 'off' : 'on'}`),
    },
    toggle_lan: {
      get: () => run('/bin/mullvad lan get').then(o => /:\s*allow\b/i.test(o)),
      set: on => run(`/bin/mullvad lan set ${on ? 'block' : 'allow'}`),
    },
    toggle_daita: {
      get: () => run('/bin/mullvad tunnel get').then(o => /DAITA:\s+true/i.test(o)),
      set: on => run(`/bin/mullvad tunnel set daita ${on ? 'off' : 'on'}`),
    },
    toggle_qr: {
      get: () => run('/bin/mullvad tunnel get').then(o => /Quantum resistance:\s+on/i.test(o)),
      set: on => run(`/bin/mullvad tunnel set quantum-resistant ${on ? 'off' : 'on'}`),
    },
    toggle_multihop: {
      get: () => run('/bin/mullvad relay get').then(o => /Multihop state:\s+enabled/i.test(o)),
      set: on => run(`/bin/mullvad relay set multihop ${on ? 'off' : 'on'}`),
    },
  }

  if (action === 'connect') {
    await run('/bin/mullvad connect')
    await waitConnected()
  }
  else if (action === 'disconnect') { await run('/bin/mullvad disconnect'); await delay(2000) }
  else if (action === 'reconnect') {
    const [statusOut, tunnelOut] = await Promise.all([
      run('/bin/mullvad status'),
      run('/bin/mullvad tunnel get'),
    ])
    const relayMatch   = statusOut.match(/Relay:\s+([a-z]{2}-[a-z]{3}-wg-\d+)/i)
    const currentRelay = relayMatch?.[1]?.toLowerCase()
    const daitaOn      = /DAITA:\s+true/i.test(tunnelOut)

    // Pick any random WG relay globally — different datacenter/IP range entirely.
    // If DAITA is on, restrict to Mullvad-owned relays (daita-capable).
    const allRelays = await fetchRelays()
    const candidates = Object.values(allRelays)
      .flatMap(c => c.relays)
      .filter(r => r.type === 'wg' && r.name !== currentRelay && (!daitaOn || r.daita))
      .map(r => r.name)

    if (candidates.length > 0) {
      const pick = candidates[Math.floor(Math.random() * candidates.length)]
      await run(`/bin/mullvad relay set location ${pick}`)
    }

    await run('/bin/mullvad connect')
    await waitConnected()
  }
  else if (toggleMap[action]) {
    const { get, set } = toggleMap[action]
    await set(await get())
    await delay(1000)
    relayCache = null  // invalidate relay cache after tunnel change
  }
  else if (action === 'set_entry') {
    const cc = safeCountry((entry_country || '').toLowerCase())
    if (cc) { await run(`/bin/mullvad relay set entry location ${cc}`); await delay(1000) }
  }
  else if (action === 'change_relay') {
    const r = safeRelay((relay || '').toLowerCase())
    if (r) { await run(`/bin/mullvad relay set location ${r}`); await delay(1000) }
  }
  else if (action === 'connect_country') {
    const cc = safeCountry(((req.body.country || relay) || '').toLowerCase())
    if (cc) {
      await run(`/bin/mullvad relay set location ${cc}`)
      await run('/bin/mullvad connect')
      await delay(3000)
    }
  }
  else if (action === 'map_relay') {
    const r = safeRelay((relay || '').toLowerCase())
    if (r) {
      await run(`/bin/mullvad relay set location ${r}`)
      await run('/bin/mullvad connect')
      await waitConnected()
    }
  }
  else if (action === 'set_account') {
    const num = (req.body.number || '').replace(/\D/g, '')
    if (!/^\d{16}$/.test(num)) return res.status(400).json({ error: 'Account number must be exactly 16 digits' })
    const out = await run(`/bin/mullvad account login ${num}`)
    if (/error|invalid|failed/i.test(out)) return res.status(400).json({ error: out || 'Login failed' })
    return res.json({ ok: true })
  }
  else return res.status(400).json({ error: 'unknown action' })

  // Always return the current status so the client can update immediately
  // without waiting for a separate /api/status poll.
  const freshStatusOut = await run('/bin/mullvad status')
  res.json({ ok: true, status: parseStatus(freshStatusOut) })
})

// ── GET /api/account ─────────────────────────────────────────────────────────
app.get('/api/account', async (req, res) => {
  const out = await run('/bin/mullvad account get')
  const numM = out.match(/Mullvad account:\s+(\d+)/i)
  const expM = out.match(/Expires at:\s+(.+)/i)
  const number = numM?.[1] || null
  let expiresAt = null, daysLeft = null
  if (expM) {
    const d = new Date(expM[1].trim())
    if (!isNaN(d)) {
      expiresAt = d.toISOString()
      daysLeft  = Math.max(0, Math.floor((d - Date.now()) / 86_400_000))
    }
  }
  res.json({ number, expiresAt, daysLeft })
})

// ── GET /api/log ──────────────────────────────────────────────────────────────
app.get('/api/log', async (req, res) => {
  const n = Math.min(parseInt(req.query.n || '10'), 50)
  try {
    const content = await readFile(LOG_FILE, 'utf8')
    const entries = content.trim().split('\n').filter(Boolean)
      .slice(-n)
      .map(l => { try { return JSON.parse(l) } catch { return null } })
      .filter(Boolean)
    res.json(entries.reverse())
  } catch {
    res.json([])
  }
})

// ── ALL /api/blocked ──────────────────────────────────────────────────────────
app.all('/api/blocked', async (req, res) => {
  const qp = req.method === 'GET' ? req.query : (req.body || {})
  const domain   = (qp.domain   || '').replace(/[^a-zA-Z0-9._-]/g, '')
  const reporter = (qp.reporter || req.ip || 'unknown').replace(/[^a-zA-Z0-9._:@-]/g, '')

  const [statusOut, tunnelOut] = await Promise.all([
    run('/bin/mullvad status'),
    run('/bin/mullvad tunnel get'),
  ])
  const before    = parseStatus(statusOut)
  const daitaOn   = /DAITA:\s+true/i.test(tunnelOut)
  const curRelay  = (statusOut.match(/Relay:\s+([a-z]{2}-[a-z]{3}-wg-\d+)/i) || [])[1]?.toLowerCase()

  // Same logic as the reconnect button: pick a random relay globally,
  // different datacenter, respecting DAITA setting.
  const allRelays = await fetchRelays()
  const candidates = Object.values(allRelays)
    .flatMap(c => c.relays)
    .filter(r => r.type === 'wg' && r.name !== curRelay && (!daitaOn || r.daita))
    .map(r => r.name)

  if (candidates.length > 0) {
    const pick = candidates[Math.floor(Math.random() * candidates.length)]
    await run(`/bin/mullvad relay set location ${pick}`)
  }

  await run('/bin/mullvad connect')
  await waitConnected()
  const after = parseStatus(await run('/bin/mullvad status'))

  const ts      = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z')
  const changed = before.relay !== after.relay || before.ip !== after.ip

  const entry = JSON.stringify({ ts, domain, reporter, old_relay: before.relay, old_ip: before.ip, new_relay: after.relay, new_ip: after.ip, changed })
  await appendFile(LOG_FILE, entry + '\n').catch(() => {})

  res.status(changed ? 200 : 503).json({
    status: changed ? 'reconnected' : 'unchanged',
    old_relay: before.relay, old_ip: before.ip,
    new_relay: after.relay,  new_ip: after.ip,
    domain, reporter, ts,
  })
})

// ── SPA fallback ──────────────────────────────────────────────────────────────
app.get('*', (req, res) => res.sendFile(join(DIST, 'index.html')))

app.listen(PORT, '0.0.0.0', () =>
  console.log(`Mullvad Gateway listening on :${PORT}`)
)
