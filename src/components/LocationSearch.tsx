import { useNominatimSearch } from '../hooks/useNominatimSearch'

interface Props {
  onSelect: (lat: number, lon: number, name: string) => void
}

export function LocationSearch({ onSelect }: Props) {
  const { query, results, loading, open, setOpen, handleChange, clear } = useNominatimSearch()

  const handleSelect = (r: { lat: string; lon: string; display_name: string }) => {
    onSelect(parseFloat(r.lat), parseFloat(r.lon), r.display_name)
    clear()
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
          <button className="search-clear" onClick={clear}>×</button>
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
