import { useState, useRef } from 'react'

interface GeoResult {
  display_name: string
  lat: string
  lon: string
}

interface Props {
  onSelect: (lat: number, lon: number, name: string) => void
}

export function LocationSearch({ onSelect }: Props) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<GeoResult[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const search = async (q: string) => {
    if (!q.trim()) { setResults([]); return }
    setLoading(true)
    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&countrycodes=jp&limit=6&accept-language=ja`
      const res = await fetch(url, { headers: { 'Accept-Language': 'ja' } })
      const data: GeoResult[] = await res.json()
      setResults(data)
      setOpen(true)
    } catch {
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (v: string) => {
    setQuery(v)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => search(v), 400)
  }

  const handleSelect = (r: GeoResult) => {
    onSelect(parseFloat(r.lat), parseFloat(r.lon), r.display_name)
    setQuery(r.display_name.split(',')[0])
    setOpen(false)
    setResults([])
  }

  return (
    <div className="location-search">
      <div className="search-input-wrap">
        <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input
          className="search-input"
          type="text"
          placeholder="場所を検索..."
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
        />
        {loading && <div className="search-spinner" />}
        {query && !loading && (
          <button className="search-clear" onClick={() => { setQuery(''); setResults([]); setOpen(false) }}>×</button>
        )}
      </div>
      {open && results.length > 0 && (
        <ul className="search-results">
          {results.map((r, i) => (
            <li key={i} className="search-result-item" onMouseDown={() => handleSelect(r)}>
              <svg className="result-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
                <circle cx="12" cy="9" r="2.5"/>
              </svg>
              <span className="result-name">{r.display_name}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
