import type { CityConfig } from '../types'

interface Props {
  cities: CityConfig[]
  selected: CityConfig
  onSelect: (city: CityConfig) => void
}

export function CitySelector({ cities, selected, onSelect }: Props) {
  // 都道府県でグループ化
  const prefectures = Array.from(new Set(cities.map((c) => c.prefecture)))

  return (
    <nav className="city-selector">
      {prefectures.map((pref) => (
        <div key={pref} className="city-group">
          <span className="city-group-label">{pref}</span>
          <div className="city-group-buttons">
            {cities
              .filter((c) => c.prefecture === pref)
              .map((city) => (
                <button
                  key={city.id}
                  className={`city-btn ${selected.id === city.id ? 'active' : ''}`}
                  onClick={() => onSelect(city)}
                >
                  <span className="city-name">{city.name}</span>
                  {city.lod && (
                    <span className={`city-lod lod-${city.lod}`}>LOD{city.lod}</span>
                  )}
                </button>
              ))}
          </div>
        </div>
      ))}
    </nav>
  )
}
