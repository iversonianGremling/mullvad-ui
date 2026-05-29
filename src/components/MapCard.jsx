import { useEffect, useRef, useState, useMemo, useCallback } from 'react'
import { createPortal } from 'react-dom'
import * as d3 from 'd3'
import * as topojson from 'topojson-client'
import { useIsMobile } from '../hooks.js'

const NUM_TO_ISO = {
  8:'al',32:'ar',40:'at',36:'au',56:'be',100:'bg',76:'br',124:'ca',756:'ch',
  152:'cl',170:'co',196:'cy',203:'cz',276:'de',208:'dk',233:'ee',724:'es',
  246:'fi',250:'fr',826:'gb',300:'gr',344:'hk',191:'hr',348:'hu',360:'id',
  372:'ie',376:'il',380:'it',392:'jp',410:'kr',442:'lu',428:'lv',484:'mx',
  458:'my',566:'ng',528:'nl',578:'no',554:'nz',604:'pe',608:'ph',616:'pl',
  620:'pt',642:'ro',688:'rs',752:'se',702:'sg',705:'si',703:'sk',764:'th',
  792:'tr',804:'ua',840:'us',710:'za',
}

const EUROPE_CENTER = [15, 50]
const PANEL_W       = 248

const MC = {
  mapBg:        '#0d1921',
  country:      '#14263a',
  countryRelay: '#1a3555',
  countryActive:'#1e4878',
  border:       '#162840',
  graticule:    '#111e2e',
  dot:          '#44adc2',
  dotActive:    '#7dd5e8',
  dotDaita:     '#44e57a',
  relayDot:     '#44e57a',
  relayRing:    '#44adc2',
  relayLabel:   '#d9e9f3',
  tip:          { bg:'rgba(13,25,33,.95)', border:'rgba(68,173,194,.25)', text:'#79d0e3' },
}

function useEscapeClose(onClose) {
  useEffect(() => {
    const h = e => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [onClose])
}

function useRect(el) {
  const [rect, setRect] = useState(null)
  useEffect(() => {
    if (!el) return
    const measure = () => setRect(el.getBoundingClientRect())
    measure()
    window.addEventListener('resize', measure)
    window.addEventListener('scroll', measure, true)
    return () => { window.removeEventListener('resize', measure); window.removeEventListener('scroll', measure, true) }
  }, [el])
  return rect
}

async function doAction(body, onStatusUpdate, onRefresh) {
  const r = await fetch('/api/action', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await r.json().catch(() => ({}))
  if (data.status) onStatusUpdate(data.status)
  onRefresh()
}

// ── City panel ────────────────────────────────────────────────────────────────
function CityPanel({ city, clickPos, mapEl, currentRelay, daitaFilter, onDaitaToggle, onClose, onRefresh, onStatusUpdate }) {
  const isMobile = useIsMobile()
  const [busy, setBusy] = useState(null)
  const panelRef = useRef(null)
  const mapRect  = useRect(mapEl)

  useEscapeClose(onClose)
  useEffect(() => {
    const h = e => { if (panelRef.current && !panelRef.current.contains(e.target)) onClose() }
    const id = setTimeout(() => document.addEventListener('mousedown', h), 50)
    return () => { clearTimeout(id); document.removeEventListener('mousedown', h) }
  }, [onClose])

  const relays = daitaFilter ? city.relays.filter(r => r.daita) : city.relays

  async function connect(name) {
    setBusy(name)
    try { await doAction({ action: 'map_relay', relay: name }, onStatusUpdate, onRefresh) } catch {}
    onClose(); setBusy(null)
  }

  const header = (
    <div style={{ padding:'10px 12px', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexShrink:0 }}>
      <div>
        <div style={{ fontWeight:600, fontSize:13, color:'var(--text-strong)', marginBottom:1 }}>{city.city}</div>
        <div style={{ fontSize:11, color:'var(--muted)' }}>{city.country}</div>
      </div>
      <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:1 }}>
        <button onClick={onDaitaToggle} style={{ padding:'3px 8px', fontSize:10, fontWeight:700, borderRadius:4, cursor:'pointer', background:daitaFilter?'rgba(68,173,194,.2)':'var(--surface2)', color:daitaFilter?'var(--accent-text)':'var(--muted)', border:`1px solid ${daitaFilter?'rgba(68,173,194,.4)':'var(--border)'}` }}>DAITA</button>
        <button onClick={onClose} style={{ background:'none', border:'1px solid var(--border)', color:'var(--muted)', cursor:'pointer', borderRadius:5, width:26, height:26, display:'flex', alignItems:'center', justifyContent:'center', fontSize:14 }}>✕</button>
      </div>
    </div>
  )

  const list = (
    <div style={{ overflowY:'auto', flex:1 }}>
      {relays.length === 0
        ? <div style={{ color:'var(--muted)', fontSize:12, padding:16, textAlign:'center' }}>No {daitaFilter?'DAITA ':''}relays here</div>
        : relays.map(r => {
            const isActive = (currentRelay||'').split(' ')[0] === r.name
            return (
              <div key={r.name} onClick={() => !busy && connect(r.name)}
                style={{ display:'flex', alignItems:'center', gap:8, padding:'0 12px', height:36, borderBottom:'1px solid var(--border)', borderLeft:`2px solid ${isActive?'var(--accent)':'transparent'}`, background:isActive?'rgba(68,173,194,.06)':'transparent', cursor:busy?'wait':'pointer' }}
                onMouseEnter={e => { if(!isActive) e.currentTarget.style.background='rgba(68,173,194,.04)' }}
                onMouseLeave={e => { if(!isActive) e.currentTarget.style.background='transparent' }}
              >
                <span style={{ flex:1, fontFamily:'var(--mono)', fontSize:11, color:isActive?'var(--accent-text)':'var(--text)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{busy===r.name?'…':r.name}</span>
                {r.daita && <span style={{ fontSize:9, fontWeight:700, padding:'1px 5px', borderRadius:3, flexShrink:0, background:'rgba(68,229,122,.12)', color:'#44e57a', letterSpacing:'.4px' }}>DAITA</span>}
                {r.type==='ovpn' && <span style={{ fontSize:9, padding:'1px 5px', borderRadius:3, flexShrink:0, background:'rgba(255,213,36,.07)', color:'#b8943a' }}>OVPN</span>}
              </div>
            )
          })
      }
    </div>
  )

  const panelStyle = { background:'var(--bg)', border:'1px solid var(--border2)', display:'flex', flexDirection:'column', overflow:'hidden', boxShadow:'0 12px 40px rgba(0,0,0,.6)' }

  if (isMobile) {
    return createPortal(<>
      <div onClick={onClose} style={{ position:'fixed', inset:0, zIndex:8400, background:'rgba(0,0,0,.55)' }} />
      <div ref={panelRef} style={{ ...panelStyle, position:'fixed', bottom:0, left:0, right:0, maxHeight:'65vh', zIndex:8500, borderRadius:'12px 12px 0 0' }}>
        <div style={{ display:'flex', justifyContent:'center', padding:'8px 0 2px', flexShrink:0 }}>
          <div style={{ width:36, height:3, borderRadius:2, background:'var(--border2)' }} />
        </div>
        {header}{list}
      </div>
    </>, document.body)
  }

  if (!mapRect) return null
  const pw=PANEL_W, maxH=Math.min(480, mapRect.height-20)
  const cx=clickPos?.x??(mapRect.right-pw-10), cy=clickPos?.y??(mapRect.top+40)
  let left=cx+16
  if (left+pw>mapRect.right-4) left=cx-pw-16
  left=Math.max(mapRect.left+4, Math.min(mapRect.right-pw-4, left))
  const top=Math.max(mapRect.top+8, Math.min(mapRect.bottom-maxH-8, cy-20))

  return createPortal(
    <div ref={panelRef} style={{ ...panelStyle, position:'fixed', top, left, width:pw, maxHeight:maxH, zIndex:8500, borderRadius:8 }}>{header}{list}</div>,
    document.body
  )
}

// ── Server search dropdown ────────────────────────────────────────────────────
function ServerDropdown({ anchorEl, mapEl, relays, currentRelay, daitaFilter, onDaitaToggle, onRefresh, onStatusUpdate, onClose }) {
  const isMobile   = useIsMobile()
  const [search,   setSearch]   = useState('')
  const [expanded, setExpanded] = useState({})
  const [busy,     setBusy]     = useState(null)
  const inputRef = useRef(null)
  const mapRect    = useRect(mapEl)
  const anchorRect = useRect(anchorEl)

  useEscapeClose(onClose)
  useEffect(() => { inputRef.current?.focus() }, [])

  const q = search.trim().toLowerCase()
  const currentCC = useMemo(() => { const c=(currentRelay||'').split(' ')[0]; return c?c.slice(0,2).toLowerCase():'' }, [currentRelay])

  const countries = useMemo(() => {
    return Object.entries(relays||{}).reduce((acc,[cc,data]) => {
      const daitaRelays=data.relays.filter(r=>r.daita)
      if (daitaFilter&&daitaRelays.length===0) return acc
      const visible=daitaFilter?daitaRelays:data.relays
      if (q) {
        const nameMatch=data.name.toLowerCase().includes(q)||cc.includes(q)
        const relayMatch=visible.filter(r=>r.name.includes(q))
        if (!nameMatch&&relayMatch.length===0) return acc
        acc.push({ cc, name:data.name, visible, shown:nameMatch?visible:relayMatch, daitaCount:daitaRelays.length, autoExpand:relayMatch.length>0&&!nameMatch })
      } else {
        acc.push({ cc, name:data.name, visible, shown:visible, daitaCount:daitaRelays.length, autoExpand:false })
      }
      return acc
    }, [])
  }, [relays, daitaFilter, q])

  useEffect(() => {
    if (!q) return
    const open={}; countries.forEach(c=>{ if(c.autoExpand) open[c.cc]=true })
    if (Object.keys(open).length) setExpanded(p=>({...p,...open}))
  }, [q, countries])

  async function connectCountry(cc) {
    setBusy(`cc:${cc}`)
    try { await doAction({ action:'connect_country', country:cc }, onStatusUpdate, onRefresh) } catch {}
    onClose(); setBusy(null)
  }
  async function connectRelay(name) {
    setBusy(`r:${name}`)
    try { await doAction({ action:'map_relay', relay:name }, onStatusUpdate, onRefresh) } catch {}
    onClose(); setBusy(null)
  }

  const isBusy=busy!==null
  const style=isMobile
    ?{ position:'fixed', top:anchorRect?anchorRect.bottom+6:60, left:10, right:10, maxHeight:'calc(100vh - 80px)' }
    :mapRect&&anchorRect
    ?{ position:'fixed', top:anchorRect.bottom+6, left:mapRect.left, width:mapRect.width, maxHeight:'55vh' }
    :null
  if (!style) return null

  const chevron=(open,onClick)=>(
    <button onClick={onClick} style={{ background:'none', border:'none', padding:'3px 2px', cursor:'pointer', display:'flex', alignItems:'center', flexShrink:0, color:open?'var(--accent-text)':'var(--muted2)', transform:open?'rotate(0deg)':'rotate(-90deg)' }}>
      <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 3.5l3 3 3-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
    </button>
  )

  return createPortal(<>
    <div onClick={onClose} style={{ position:'fixed', inset:0, zIndex:8998 }} />
    <div style={{ ...style, zIndex:8999, background:'var(--bg)', border:'1px solid var(--border2)', borderRadius:8, overflow:'hidden', boxShadow:'0 16px 48px rgba(0,0,0,.65)', display:'flex', flexDirection:'column' }}>
      <div style={{ padding:'10px 12px', borderBottom:'1px solid var(--border)', display:'flex', gap:8, alignItems:'center', flexShrink:0 }}>
        <div style={{ position:'relative', flex:1 }}>
          <svg style={{ position:'absolute',left:8,top:'50%',transform:'translateY(-50%)',pointerEvents:'none' }} width="12" height="12" viewBox="0 0 13 13" fill="none"><circle cx="5.5" cy="5.5" r="4" stroke="var(--muted)" strokeWidth="1.4"/><path d="M9 9l2.5 2.5" stroke="var(--muted)" strokeWidth="1.4" strokeLinecap="round"/></svg>
          <input ref={inputRef} type="text" placeholder="Search country or server…" value={search} onChange={e=>setSearch(e.target.value)} style={{ width:'100%', padding:'6px 28px 6px 26px', background:'var(--surface2)', border:'1px solid var(--border)', borderRadius:5, color:'var(--text)', fontSize:12, outline:'none' }} />
          {search&&<button onClick={()=>setSearch('')} style={{ position:'absolute',right:6,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',color:'var(--muted)',cursor:'pointer',fontSize:14,padding:'0 2px',lineHeight:1 }}>×</button>}
        </div>
        <button onClick={onDaitaToggle} style={{ padding:'6px 10px', fontSize:11, fontWeight:700, borderRadius:5, cursor:'pointer', letterSpacing:'.4px', flexShrink:0, background:daitaFilter?'rgba(68,173,194,.2)':'var(--surface2)', color:daitaFilter?'var(--accent-text)':'var(--muted)', border:`1px solid ${daitaFilter?'rgba(68,173,194,.4)':'var(--border)'}` }}>⬡ DAITA</button>
        <button onClick={onClose} style={{ background:'none', border:'1px solid var(--border)', color:'var(--muted)', cursor:'pointer', borderRadius:5, width:28, height:28, flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:14 }}>✕</button>
      </div>
      <div style={{ overflowY:'auto', flex:1 }}>
        {countries.length===0&&<div style={{ color:'var(--muted)', fontSize:12, padding:20, textAlign:'center' }}>No servers match{daitaFilter?' (DAITA filter active)':''}</div>}
        {countries.map(c=>{
          const isCurrent=c.cc===currentCC, open=expanded[c.cc]??false, busyCC=busy===`cc:${c.cc}`
          return (
            <div key={c.cc}>
              <div style={{ display:'flex', alignItems:'center', gap:8, padding:'0 12px', height:38, borderBottom:'1px solid var(--border)', background:isCurrent?'rgba(68,173,194,.05)':'transparent' }}>
                {chevron(open,()=>setExpanded(p=>({...p,[c.cc]:!p[c.cc]})))}
                <span style={{ fontSize:9, fontWeight:700, fontFamily:'var(--mono)', color:'var(--muted)', textTransform:'uppercase', background:'var(--surface2)', padding:'1px 5px', borderRadius:3, flexShrink:0 }}>{c.cc}</span>
                <span style={{ flex:1, fontSize:13, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', color:isCurrent?'var(--accent-text)':'var(--text-strong)', fontWeight:isCurrent?500:400 }}>{c.name}</span>
                <span style={{ fontSize:10, color:'var(--muted)', fontFamily:'var(--mono)', flexShrink:0 }}>{daitaFilter?<>{c.daitaCount} <span style={{ color:'var(--muted2)' }}>DAITA</span></>:<>{c.visible.length} <span style={{ color:'var(--muted2)' }}>relays</span></>}</span>
                <button onClick={()=>connectCountry(c.cc)} disabled={isBusy} style={{ padding:'3px 9px', fontSize:11, fontWeight:600, borderRadius:4, flexShrink:0, cursor:isBusy?'wait':'pointer', border:`1px solid ${isCurrent?'rgba(68,173,194,.35)':'var(--border2)'}`, background:isCurrent?'rgba(68,173,194,.12)':'var(--surface2)', color:isCurrent?'var(--accent-text)':'var(--muted)' }}>{busyCC?'…':isCurrent?'● Active':'Connect'}</button>
              </div>
              {open&&(
                <div style={{ background:'rgba(0,0,0,.25)' }}>
                  {c.shown.map(r=>{
                    const isActive=(currentRelay||'').split(' ')[0]===r.name, busyRelay=busy===`r:${r.name}`
                    return (
                      <div key={r.name} style={{ display:'flex', alignItems:'center', gap:8, padding:'0 12px 0 34px', height:32, borderBottom:'1px solid rgba(26,53,85,.4)', background:isActive?'rgba(68,173,194,.05)':'transparent' }}>
                        <span style={{ flex:1, fontFamily:'var(--mono)', fontSize:11, color:isActive?'var(--accent-text)':'var(--text)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{r.name}</span>
                        {r.daita&&<span style={{ fontSize:9, fontWeight:700, padding:'1px 5px', borderRadius:3, flexShrink:0, background:'rgba(68,229,122,.12)', color:'#44e57a', letterSpacing:'.4px' }}>DAITA</span>}
                        {r.type==='ovpn'&&<span style={{ fontSize:9, padding:'1px 5px', borderRadius:3, flexShrink:0, background:'rgba(255,213,36,.07)', color:'#b8943a' }}>OVPN</span>}
                        <button onClick={()=>connectRelay(r.name)} disabled={isBusy} style={{ padding:'2px 8px', fontSize:10, fontWeight:600, borderRadius:4, flexShrink:0, cursor:isBusy?'wait':'pointer', border:`1px solid ${isActive?'rgba(68,173,194,.35)':'var(--border)'}`, background:isActive?'rgba(68,173,194,.12)':'var(--surface2)', color:isActive?'var(--accent-text)':'var(--muted)' }}>{busyRelay?'…':isActive?'Active':'→'}</button>
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
  </>, document.body)
}

// ── MapCard ───────────────────────────────────────────────────────────────────
export default function MapCard({ relays, status, daitaFilter, onDaitaToggle, onRefresh, onStatusUpdate }) {
  const containerRef   = useRef(null)
  const mapWrapRef     = useRef(null)
  const searchInputRef = useRef(null)
  const svgRef         = useRef(null)
  const updateRelayRef = useRef(() => {})
  const setCityRef     = useRef(null)
  const prevRelayRef   = useRef(null)
  const rotationRef    = useRef([0, -30, 0])
  const projRef        = useRef(null)
  const baseScaleRef   = useRef(0)
  const scaleRef       = useRef(null)
  const renderRef      = useRef(() => {})

  const [searchOpen,   setSearchOpen]   = useState(false)
  const [selectedCity, setSelectedCity] = useState(null)

  setCityRef.current = setSelectedCity
  const closeSearch = useCallback(() => setSearchOpen(false), [])
  const closeCity   = useCallback(() => setSelectedCity(null), [])

  const currentRelay     = status?.relay || ''
  const currentRelayCode = currentRelay.split(' ')[0]
  const currentCC        = currentRelayCode ? currentRelayCode.slice(0, 2).toLowerCase() : ''
  const isConnected      = status?.connected ?? false

  const cityMap = new Map()
  for (const [cc, cdata] of Object.entries(relays || {})) {
    for (const relay of cdata.relays) {
      const key = `${cc}|${relay.city}`
      if (!cityMap.has(key)) cityMap.set(key, { cc, city: relay.city, country: cdata.name, coords: relay.coords, relays: [] })
      cityMap.get(key).relays.push(relay)
    }
  }
  const cities = [...cityMap.values()]

  let relayCoords = null
  if (currentRelayCode && relays?.[currentCC])
    for (const r of relays[currentCC].relays)
      if (r.name === currentRelayCode) { relayCoords = r.coords; break }

  function countryFill(iso) {
    const d = relays?.[iso]
    if (!d) return MC.country
    if (daitaFilter) return d.relays.some(r => r.daita) ? '#163040' : MC.country
    return iso === currentCC ? MC.countryActive : MC.countryRelay
  }

  function cityDotFill(city) {
    if (daitaFilter) return city.relays.some(r => r.daita) ? MC.dotDaita : MC.country
    return city.cc === currentCC ? MC.dotActive : MC.dot
  }

  const zoomIn = () => {
    const p = projRef.current, base = baseScaleRef.current
    if (!p || !base) return
    const from = p.scale(), to = Math.min(from * 1.5, base * 12)
    const interp = d3.interpolate(from, to)
    if (svgRef.current) d3.select(svgRef.current).transition('zoom').duration(220).ease(d3.easeCubicOut)
      .tween('z', () => t => { const s = interp(t); p.scale(s); scaleRef.current = s; renderRef.current() })
  }
  const zoomOut = () => {
    const p = projRef.current, base = baseScaleRef.current
    if (!p || !base) return
    const from = p.scale(), to = Math.max(from / 1.5, base * 0.5)
    const interp = d3.interpolate(from, to)
    if (svgRef.current) d3.select(svgRef.current).transition('zoom').duration(220).ease(d3.easeCubicOut)
      .tween('z', () => t => { const s = interp(t); p.scale(s); scaleRef.current = s; renderRef.current() })
  }

  useEffect(() => {
    if (!containerRef.current || Object.keys(relays || {}).length === 0) return
    const el = containerRef.current
    el.innerHTML = ''
    updateRelayRef.current = () => {}
    renderRef.current = () => {}

    const W = el.clientWidth || 700, H = Math.round(W * 0.54)
    const dpr = window.devicePixelRatio || 1

    d3.select(el).style('position', 'relative').style('height', H + 'px')

    // ── Canvas: entire globe rendered here, zero DOM overhead per frame ───
    const canvas = d3.select(el).append('canvas')
      .attr('width', W * dpr).attr('height', H * dpr)
      .style('width', '100%').style('height', H + 'px')
      .style('display', 'block').style('position', 'absolute').style('top', 0).style('left', 0)
    const ctx = canvas.node().getContext('2d')
    ctx.scale(dpr, dpr)

    // ── SVG: transparent event surface only, no visual elements ──────────
    const svg = d3.select(el).append('svg')
      .attr('viewBox', `0 0 ${W} ${H}`).attr('width', '100%').attr('height', H)
      .style('position', 'absolute').style('top', 0).style('left', 0)
      .style('cursor', 'grab')
    svgRef.current = svg.node()

    // ── Projection ────────────────────────────────────────────────────────
    const projection = d3.geoOrthographic()
      .fitSize([W, H], { type: 'Sphere' })
      .clipAngle(90)
      .precision(10)         // high value = minimal arc resampling = fast
      .translate([W / 2, H / 2])
    const baseScale = projection.scale()
    projRef.current = projection
    baseScaleRef.current = baseScale
    projection.scale(scaleRef.current ?? baseScale * 3.2)

    let rotation = [...rotationRef.current]
    projection.rotate(rotation)

    const cpath = d3.geoPath().projection(projection).context(ctx)
    const grat  = d3.geoGraticule()()

    // ── Tooltip ───────────────────────────────────────────────────────────
    const tip = document.createElement('div')
    Object.assign(tip.style, { position:'fixed', display:'none', pointerEvents:'none', zIndex:9999, background:MC.tip.bg, color:MC.tip.text, padding:'5px 10px', borderRadius:5, fontSize:11, border:`1px solid ${MC.tip.border}`, whiteSpace:'nowrap', boxShadow:'0 4px 16px rgba(0,0,0,.5)' })
    document.body.appendChild(tip)
    const showTip = (e, t) => { tip.textContent=t; tip.style.display='block'; tip.style.left=(e.clientX+12)+'px'; tip.style.top=(e.clientY-30)+'px' }
    const hideTip = () => { tip.style.display='none' }

    // ── Helpers ───────────────────────────────────────────────────────────
    function isOnFront(coords) {
      const lon=coords[0]*Math.PI/180, lat=coords[1]*Math.PI/180
      const r=projection.rotate(), lam=r[0]*Math.PI/180, phi=r[1]*Math.PI/180
      return Math.acos(Math.sin(lat)*Math.sin(-phi)+Math.cos(lat)*Math.cos(-phi)*Math.cos(lon+lam)) < Math.PI/2-0.05
    }

    // World data (populated after fetch)
    let geoFeatures = null, geoBorders = null
    // Pre-bucketed country features by fill color — computed once, reused every frame
    let colorBuckets = []
    let hoveredCity = null

    // ── Full canvas draw: globe + cities + relay — NO DOM writes ─────────
    function drawCanvas() {
      ctx.clearRect(0, 0, W, H)

      // Clip everything to the sphere
      ctx.save()
      ctx.beginPath(); cpath({ type: 'Sphere' }); ctx.clip()
      ctx.fillStyle = MC.mapBg; ctx.fill()

      // Graticule
      ctx.beginPath(); cpath(grat)
      ctx.strokeStyle = MC.graticule; ctx.lineWidth = 0.3; ctx.stroke()

      // Countries — one fill() per distinct color (pre-bucketed)
      for (const { fill, features } of colorBuckets) {
        ctx.beginPath()
        for (const f of features) cpath(f)
        ctx.fillStyle = fill; ctx.fill()
      }

      // Borders
      if (geoBorders) {
        ctx.beginPath(); cpath(geoBorders)
        ctx.strokeStyle = MC.border; ctx.lineWidth = 0.4; ctx.stroke()
      }

      ctx.restore()

      // Vignette + light on the sphere shape
      const sr = projection.scale()
      const vig = ctx.createRadialGradient(W/2, H/2, sr*0.7, W/2, H/2, sr)
      vig.addColorStop(0, 'rgba(0,0,0,0)'); vig.addColorStop(1, 'rgba(0,0,0,0.72)')
      ctx.beginPath(); cpath({ type: 'Sphere' }); ctx.fillStyle = vig; ctx.fill()

      const lx=W*0.28, ly=H*0.22
      const lgt = ctx.createRadialGradient(lx, ly, 0, lx, ly, sr*0.6)
      lgt.addColorStop(0, 'rgba(127,196,216,0.13)'); lgt.addColorStop(1, 'rgba(127,196,216,0)')
      ctx.beginPath(); cpath({ type: 'Sphere' }); ctx.fillStyle = lgt; ctx.fill()

      // Sphere rim
      ctx.beginPath(); cpath({ type: 'Sphere' })
      ctx.strokeStyle = 'rgba(68,173,194,0.22)'; ctx.lineWidth = 1.5; ctx.stroke()

      // City dots
      for (const city of cities) {
        if (!isOnFront(city.coords)) continue
        const p = projection(city.coords); if (!p) continue
        const isHovered = city === hoveredCity
        ctx.beginPath(); ctx.arc(p[0], p[1], isHovered ? 5 : 3, 0, Math.PI*2)
        ctx.fillStyle = isHovered ? '#fff' : cityDotFill(city)
        ctx.fill()
        ctx.strokeStyle = 'rgba(0,0,0,.4)'; ctx.lineWidth = 0.4; ctx.stroke()
      }

      // Relay marker
      if (relayCoords && isOnFront(relayCoords)) {
        const p = projection(relayCoords); if (p) {
          if (isConnected) {
            ctx.beginPath(); ctx.arc(p[0], p[1], 18, 0, Math.PI*2); ctx.strokeStyle='rgba(68,173,194,0.18)'; ctx.lineWidth=1; ctx.stroke()
            ctx.beginPath(); ctx.arc(p[0], p[1], 11, 0, Math.PI*2); ctx.strokeStyle='rgba(68,173,194,0.35)'; ctx.lineWidth=1; ctx.stroke()
          }
          ctx.beginPath(); ctx.arc(p[0], p[1], isConnected?9:7, 0, Math.PI*2)
          ctx.fillStyle=isConnected?'rgba(68,229,122,.12)':'rgba(68,173,194,.08)'; ctx.fill()
          ctx.beginPath(); ctx.arc(p[0], p[1], isConnected?5:4, 0, Math.PI*2)
          ctx.fillStyle=isConnected?MC.relayDot:'#1a3555'
          ctx.strokeStyle=MC.relayRing; ctx.lineWidth=2; ctx.fill(); ctx.stroke()
          ctx.font='600 10px monospace'; ctx.fillStyle=MC.relayLabel
          const tw=ctx.measureText(currentRelayCode).width
          ctx.fillText(currentRelayCode, p[0]+12+tw>W-8?p[0]-12-tw:p[0]+12, p[1]+4)
        }
      }
    }

    // render() = drawCanvas(), nothing else — zero DOM overhead
    renderRef.current = drawCanvas

    function animateRotateTo(targetLon, targetLat, duration) {
      const start=[...projection.rotate()]
      let dLon=targetLon-start[0]
      while (dLon>180) dLon-=360; while (dLon<-180) dLon+=360
      const end=[start[0]+dLon, targetLat, 0], interp=d3.interpolate(start, end)
      svg.transition('rotate').duration(duration).ease(d3.easeCubicOut)
        .tween('rotate', () => t => {
          const rv=interp(t); rotation=rv; rotationRef.current=[...rv]
          projection.rotate(rv); drawCanvas()
        })
    }

    // ── Drag ─────────────────────────────────────────────────────────────
    svg.call(d3.drag()
      .on('start', () => svg.style('cursor', 'grabbing'))
      .on('drag', event => {
        const sens=75/projection.scale()
        rotation=[rotation[0]+event.dx*sens, Math.max(-90, Math.min(90, rotation[1]-event.dy*sens)), 0]
        rotationRef.current=[...rotation]
        projection.rotate(rotation); drawCanvas()
      })
      .on('end', () => svg.style('cursor', 'grab'))
    )

    // ── Wheel zoom ────────────────────────────────────────────────────────
    svg.on('wheel.zoom', event => {
      event.preventDefault()
      const f=event.deltaY<0?1.12:1/1.12
      const s=Math.max(baseScale*0.5, Math.min(baseScale*12, projection.scale()*f))
      projection.scale(s); scaleRef.current=s; drawCanvas()
    })

    // ── Pointer events: tooltip + city click ──────────────────────────────
    function nearestCity(mx, my, threshSq=225) {  // 15px radius
      let best=null, bd=Infinity
      for (const city of cities) {
        if (!isOnFront(city.coords)) continue
        const p=projection(city.coords); if (!p) continue
        const d=(p[0]-mx)**2+(p[1]-my)**2
        if (d<bd&&d<threshSq) { bd=d; best=city }
      }
      return best
    }

    svg.on('mousemove.tip', event => {
      const [mx, my]=d3.pointer(event)
      const city=nearestCity(mx, my)
      if (city!==hoveredCity) { hoveredCity=city; drawCanvas() }
      if (city) {
        const n=city.relays.length, nd=city.relays.filter(r=>r.daita).length
        return showTip(event, `${city.city}, ${city.country} — ${n} relay${n!==1?'s':''}${nd?` · ${nd} DAITA`:''}`)
      }
      // Fall back to country tooltip
      if (!geoFeatures) return hideTip()
      const ll=projection.invert([mx, my]); if (!ll) return hideTip()
      const f=geoFeatures.features.find(ft=>d3.geoContains(ft,ll))
      if (f) { const iso=NUM_TO_ISO[parseInt(f.id)]; if(relays?.[iso]?.name) return showTip(event, relays[iso].name) }
      hideTip()
    })
    svg.on('mouseleave.tip', () => { if (hoveredCity) { hoveredCity=null; drawCanvas() }; hideTip() })

    svg.on('click', event => {
      const [mx, my]=d3.pointer(event)
      const city=nearestCity(mx, my, 400)  // 20px radius for click
      if (city) setCityRef.current({ city, pos:{ x:event.clientX, y:event.clientY } })
    })

    // ── Load world ────────────────────────────────────────────────────────
    fetch('/countries-110m.json')
      .then(r=>{ if(!r.ok) throw new Error(`${r.status}`); return r.json() })
      .then(world => {
        geoFeatures=topojson.feature(world, world.objects.countries)
        geoBorders =topojson.mesh(world, world.objects.countries, (a,b)=>a!==b)

        // Pre-bucket features by fill color — computed once per effect run
        const bucketMap=new Map()
        for (const f of geoFeatures.features) {
          const fill=countryFill(NUM_TO_ISO[parseInt(f.id)])
          if (!bucketMap.has(fill)) bucketMap.set(fill,[])
          bucketMap.get(fill).push(f)
        }
        colorBuckets=[...bucketMap.entries()].map(([fill,features])=>({fill,features}))

        // Initial centering
        const prevRelay=prevRelayRef.current
        const relayChanged=prevRelay!==null&&prevRelay!==currentRelayCode
        prevRelayRef.current=currentRelayCode||null

        const [tLon, tLat]=relayCoords
          ?[-relayCoords[0],-relayCoords[1]]
          :[-EUROPE_CENTER[0],-EUROPE_CENTER[1]]

        if (relayChanged) {
          drawCanvas()
          animateRotateTo(tLon, tLat, 700)
        } else {
          rotation=[tLon,tLat,0]; rotationRef.current=[...rotation]
          projection.rotate(rotation); drawCanvas()
        }
      })
      .catch(err => {
        ctx.fillStyle='#2a4f6b'; ctx.font='13px sans-serif'; ctx.textAlign='center'
        ctx.fillText(`Map unavailable (${err.message})`, W/2, H/2)
      })

    return () => {
      if (svgRef.current) d3.select(svgRef.current).interrupt()
      tip.remove(); el.innerHTML=''
      updateRelayRef.current=()=>{}; renderRef.current=()=>{}
    }
  }, [relays, status?.relay, status?.connected, daitaFilter])

  const overlayBtn = (active, content, onClick, extra={}) => ({
    padding:'5px 10px', fontSize:11, fontWeight:700, borderRadius:5, cursor:'pointer', letterSpacing:'.4px',
    background:active?'rgba(68,173,194,.3)':'rgba(13,25,33,.82)',
    color:active?'#79d0e3':'rgba(180,210,230,.6)',
    border:`1px solid ${active?'rgba(68,173,194,.5)':'rgba(68,173,194,.15)'}`,
    backdropFilter:'blur(8px)', flexShrink:0, ...extra,
  })

  return (
    <div ref={mapWrapRef} style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:10, overflow:'hidden', position:'relative' }}>
      <div style={{ position:'absolute', top:10, left:10, right:50, zIndex:20, display:'flex', gap:6 }}>
        <div style={{ position:'relative', flex:1 }}>
          <svg style={{ position:'absolute',left:9,top:'50%',transform:'translateY(-50%)',pointerEvents:'none' }} width="12" height="12" viewBox="0 0 13 13" fill="none">
            <circle cx="5.5" cy="5.5" r="4" stroke="rgba(127,163,191,.55)" strokeWidth="1.4"/>
            <path d="M9 9l2.5 2.5" stroke="rgba(127,163,191,.55)" strokeWidth="1.4" strokeLinecap="round"/>
          </svg>
          <input ref={searchInputRef} type="text" placeholder="Search country or server…" readOnly onClick={() => setSearchOpen(true)} style={{ width:'100%', padding:'6px 10px 6px 27px', background:'rgba(13,25,33,.82)', backdropFilter:'blur(8px)', border:`1px solid ${searchOpen?'rgba(68,173,194,.5)':'rgba(68,173,194,.18)'}`, borderRadius:6, color:'var(--text)', fontSize:12, cursor:'pointer', outline:'none' }} />
        </div>
        <button onClick={onDaitaToggle} style={overlayBtn(daitaFilter, null, null)}>⬡ DAITA</button>
      </div>

      <div style={{ position:'absolute', top:10, right:10, zIndex:20, display:'flex', flexDirection:'column', gap:3 }}>
        {[['+', zoomIn], ['−', zoomOut]].map(([lbl, fn]) => (
          <button key={lbl} onClick={fn} style={{ width:28, height:28, display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, lineHeight:1, background:'rgba(13,25,33,.82)', color:'rgba(127,163,191,.6)', border:'1px solid rgba(68,173,194,.18)', borderRadius:5, cursor:'pointer', backdropFilter:'blur(8px)' }}>{lbl}</button>
        ))}
      </div>

      <div ref={containerRef} />

      {searchOpen && <ServerDropdown anchorEl={searchInputRef.current} mapEl={mapWrapRef.current} relays={relays} currentRelay={currentRelay} daitaFilter={daitaFilter} onDaitaToggle={onDaitaToggle} onRefresh={onRefresh} onStatusUpdate={onStatusUpdate} onClose={closeSearch} />}
      {selectedCity && <CityPanel city={selectedCity.city} clickPos={selectedCity.pos} mapEl={mapWrapRef.current} currentRelay={currentRelay} daitaFilter={daitaFilter} onDaitaToggle={onDaitaToggle} onClose={closeCity} onRefresh={onRefresh} onStatusUpdate={onStatusUpdate} />}
    </div>
  )
}
