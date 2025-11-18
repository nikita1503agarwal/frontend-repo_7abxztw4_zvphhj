import { useEffect, useMemo, useRef, useState } from 'react'
import Spline from '@splinetool/react-spline'
import { MapPin, Navigation, Search, LogIn, Map } from 'lucide-react'
import axios from 'axios'

const API_BASE = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000'

function Hero() {
  return (
    <div className="relative overflow-hidden">
      <div className="h-[56vh] sm:h-[64vh] md:h-[72vh] lg:h-[80vh] w-full">
        <Spline scene="https://prod.spline.design/4Tf9WOIaWs6LOezG/scene.splinecode" style={{ width: '100%', height: '100%' }} />
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent pointer-events-none" />
      <div className="absolute inset-0 flex items-end sm:items-center justify-center px-6 py-8 sm:py-16">
        <div className="max-w-4xl text-center">
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-white">
            Simplifying India’s EV Charging Experience
          </h1>
          <p className="mt-4 sm:mt-6 text-base sm:text-lg md:text-xl text-white/80">
            Find nearby chargers, check real-time availability, and book a slot — all in one place.
          </p>
        </div>
      </div>
    </div>
  )
}

function LocationSearch({ onSearch }) {
  const [query, setQuery] = useState('')
  const [detecting, setDetecting] = useState(false)

  const detectLocation = () => {
    if (!navigator.geolocation) return
    setDetecting(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setDetecting(false)
        onSearch({ lat: pos.coords.latitude, lon: pos.coords.longitude })
      },
      () => setDetecting(false),
      { enableHighAccuracy: true }
    )
  }

  const submitManual = (e) => {
    e.preventDefault()
    const parts = query.split(',').map((p) => p.trim())
    if (parts.length === 2) {
      const lat = parseFloat(parts[0])
      const lon = parseFloat(parts[1])
      if (!Number.isNaN(lat) && !Number.isNaN(lon)) {
        onSearch({ lat, lon })
      }
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-xl -mt-8 mx-4 sm:mx-auto sm:max-w-3xl p-4 sm:p-6">
      <form onSubmit={submitManual} className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 flex items-center gap-2 border rounded-xl px-3 py-2">
          <Search className="w-5 h-5 text-slate-500" />
          <input
            className="w-full outline-none text-slate-800 placeholder:text-slate-400"
            placeholder="Enter lat,lon (e.g., 17.43, 78.45)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <button
          type="submit"
          className="px-4 py-2 rounded-xl bg-[#3CB043] text-white font-semibold hover:brightness-110 transition"
        >
          Find Nearby EV Stations
        </button>
        <button
          type="button"
          onClick={detectLocation}
          className="px-4 py-2 rounded-xl bg-slate-900 text-white font-semibold hover:brightness-110 transition flex items-center gap-2"
        >
          <Navigation className={`w-5 h-5 ${detecting ? 'animate-pulse' : ''}`} /> Use my location
        </button>
      </form>
      <p className="text-xs mt-2 text-slate-500">Tip: Allow location access for best results.</p>
    </div>
  )
}

function StationCard({ s, onBook }) {
  const total = s.connectors?.reduce((acc, c) => acc + (c.total ?? 0), 0) || 0
  const available = s.connectors?.reduce((acc, c) => acc + (c.available ?? 0), 0) || 0
  return (
    <div className="p-4 border rounded-xl hover:shadow-md transition bg-white">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-semibold text-slate-900">{s.name || s.poi?.name}</h3>
          <p className="text-sm text-slate-600">{s.operator || s.brand || '—'}</p>
          <div className="mt-2 flex flex-wrap gap-2 text-xs">
            {(s.connectorTypes || s.connectors?.map(c => c.type) || []).slice(0,6).map((c,i) => (
              <span key={i} className="px-2 py-1 rounded bg-slate-100 text-slate-700">{c}</span>
            ))}
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm">Power</p>
          <p className="font-bold">{s.powerKW || s.maxPowerKW || '—'} kW</p>
          <p className="text-xs text-slate-500">{available}/{total} free</p>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between">
        <p className="text-xs text-slate-600">{s.distance ? `${(s.distance/1000).toFixed(1)} km away` : ''}</p>
        <button onClick={() => onBook(s)} className="px-3 py-1.5 rounded-lg bg-[#3CB043] text-white text-sm font-semibold">Book Slot</button>
      </div>
    </div>
  )
}

function MapSection({ center, markers }) {
  // Lightweight embed using TomTom raster tiles via an iframe-like approach would require SDK
  // For now, show a placeholder panel until full SDK map page is added.
  return (
    <div className="h-[420px] w-full bg-[url('https://api.mapbox.com/styles/v1/mapbox/light-v10/static/78.45,17.43,9,0/800x600?access_token=pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ._-h2h2xZzLrY5bG4K-5Z0w')] bg-cover rounded-2xl flex items-center justify-center text-slate-600">
      <div className="text-center">
        <Map className="mx-auto mb-3" />
        <p className="font-medium">Interactive TomTom map will render here</p>
        <p className="text-sm">We proxy TomTom APIs from the backend to keep the API key secure.</p>
      </div>
    </div>
  )
}

function Home() {
  const [center, setCenter] = useState(null)
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)

  const searchNearby = async ({ lat, lon }) => {
    setCenter({ lat, lon })
    setLoading(true)
    try {
      const { data } = await axios.get(`${API_BASE}/api/nearby`, { params: { lat, lon, radius: 5000 } })
      const items = (data.results || []).map((r) => ({
        id: r.id || r.poi?.id,
        name: r.poi?.name,
        operator: r.brand,
        location: { lat: r.position?.lat, lon: r.position?.lon },
        connectors: r.connectors || [],
        maxPowerKW: r?.connectors?.reduce((m,c)=>Math.max(m, c.powerKW||0), 0),
        distance: r.dist || 0,
        tomtomStationId: r.id
      }))

      // fetch availability for each station in serial (simple demo)
      const withAvail = []
      for (const s of items.slice(0, 10)) {
        try {
          const { data: av } = await axios.get(`${API_BASE}/api/tt/availability/${s.tomtomStationId}`)
          const plugs = av?.connectors || av?.data || []
          const normalized = plugs.map((p) => ({ type: p.type || p.connectorType, total: p.total || p.totalCount, available: p.available || p.availableCount }))
          withAvail.push({ ...s, connectors: normalized })
        } catch (e) {
          withAvail.push(s)
        }
      }

      setResults(withAvail)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const handleBook = (station) => {
    alert(`Booking flow will start for: ${station.name || 'Station'}`)
  }

  return (
    <div>
      <Hero />
      <div className="px-4 sm:px-8 max-w-6xl mx-auto">
        <LocationSearch onSearch={searchNearby} />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
          <div className="lg:col-span-2">
            <MapSection center={center} markers={results} />
          </div>
          <div className="space-y-3">
            {loading && <p className="text-slate-600">Loading nearby stations…</p>}
            {!loading && results.length === 0 && (
              <div className="p-6 border border-dashed rounded-xl text-slate-600">
                Use your location or enter coordinates to find nearby stations.
              </div>
            )}
            {results.map((s) => (
              <StationCard key={s.id} s={s} onBook={handleBook} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function App() {
  return <Home />
}
