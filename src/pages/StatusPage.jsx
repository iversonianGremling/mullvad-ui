import { useEffect, useState } from 'react'
import { useIsMobile } from '../hooks.js'
import StatusHero from '../components/StatusHero.jsx'
import MapCard from '../components/MapCard.jsx'
import SettingsCard from '../components/SettingsCard.jsx'
import BlockedLog from '../components/BlockedLog.jsx'
import AccountCard from '../components/AccountCard.jsx'

export default function StatusPage({ status, onRefresh, onStatusUpdate }) {
  const isMobile = useIsMobile()
  const [relays, setRelays] = useState({})
  const [daita,  setDaita]  = useState(false)

  useEffect(() => {
    fetch('/api/relays').then(r => r.json()).then(setRelays).catch(() => {})
  }, [])

  useEffect(() => {
    if (status?.settings?.daita !== undefined) setDaita(status.settings.daita)
  }, [status?.settings?.daita])

  const toggleDaita = () => setDaita(d => !d)
  const pad = isMobile ? 10 : 16

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: isMobile ? '1fr' : '1fr 340px',
      gap: isMobile ? 10 : 14,
      padding: pad,
      width: '100%',
      alignItems: 'start',
    }}>
      <MapCard
        relays={relays}
        status={status}
        daitaFilter={daita}
        onDaitaToggle={toggleDaita}
        onRefresh={onRefresh}
        onStatusUpdate={onStatusUpdate}
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 10 : 14, ...(isMobile ? {} : { maxHeight: `calc(100vh - 48px - ${pad * 2}px)`, overflowY: 'auto' }) }}>
        <StatusHero
          status={status}
          onRefresh={onRefresh}
          onStatusUpdate={onStatusUpdate}
        />
        <AccountCard />
        <SettingsCard settings={status?.settings} relays={relays} onRefresh={onRefresh} />
        <BlockedLog />
      </div>
    </div>
  )
}
