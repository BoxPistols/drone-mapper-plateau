import { useState, useRef, useCallback } from 'react'

export interface NominatimResult {
  display_name: string
  lat: string
  lon: string
  type: string
}

export function useNominatimSearch() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<NominatimResult[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const search = useCallback(async (q: string) => {
    if (q.length < 2) { setResults([]); return }
    setLoading(true)
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&countrycodes=jp&limit=6`,
        { headers: { 'User-Agent': 'DroneMapper/1.0 (demo)' } }
      )
      const data: NominatimResult[] = await res.json()
      setResults(data)
      setOpen(data.length > 0)
    } catch {
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [])

  const handleChange = useCallback((value: string) => {
    setQuery(value)
    if (timerRef.current) clearTimeout(timerRef.current)
    if (value.length < 2) { setResults([]); setOpen(false); return }
    timerRef.current = setTimeout(() => search(value), 400)
  }, [search])

  const clear = useCallback(() => {
    setQuery('')
    setResults([])
    setOpen(false)
  }, [])

  return { query, results, loading, open, setOpen, handleChange, clear }
}
