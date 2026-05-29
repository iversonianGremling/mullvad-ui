import { useState, useEffect, useCallback } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Topbar from './components/Topbar.jsx'
import StatusPage from './pages/StatusPage.jsx'

export default function App() {
  const [status, setStatus] = useState(null)

  const fetchStatus = useCallback(async () => {
    try {
      const r = await fetch('/api/status')
      setStatus(await r.json())
    } catch {}
  }, [])

  useEffect(() => {
    fetchStatus()
    const id = setInterval(fetchStatus, 10_000)
    return () => clearInterval(id)
  }, [fetchStatus])

  return (
    <BrowserRouter>
      <Topbar status={status} />
      <main style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
        <Routes>
          <Route path="/" element={
            <StatusPage
              status={status}
              onRefresh={fetchStatus}
              onStatusUpdate={setStatus}
            />
          } />
        </Routes>
      </main>
    </BrowserRouter>
  )
}
