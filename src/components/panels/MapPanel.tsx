import { useState } from 'react'
import { useDroneStore, PLATEAU_CITIES } from '../../store/droneStore'
import type { ZoneType } from '../../types'

const ZONE_TYPE_LABELS: Record<ZoneType, string> = {
  planned:    '計画エリア',
  restricted: '飛行禁止',
  caution:    '注意エリア',
  completed:  '完了済み',
}

export function MapPanel() {
  const {
    selectedCity, setSelectedCity,
    pins, updatePin, deletePin,
    zones, updateZone, deleteZone,
    mapMode, setMapMode,
  } = useDroneStore()

  const [expandedPin, setExpandedPin] = useState<string | null>(null)

  const prefs = Array.from(new Set(PLATEAU_CITIES.map((c) => c.prefecture)))

  return (
    <div className="panel">
      {/* 都市選択 */}
      <section className="panel-section">
        <h3 className="panel-section-title">3D都市モデル</h3>
        {prefs.map((pref) => (
          <div key={pref} className="city-pref-group">
            <span className="city-pref-label">{pref}</span>
            <div className="city-pref-buttons">
              {PLATEAU_CITIES.filter((c) => c.prefecture === pref).map((city) => (
                <button
                  key={city.id}
                  className={`city-list-btn ${selectedCity.id === city.id ? 'active' : ''}`}
                  onClick={() => setSelectedCity(city)}
                >
                  <span>{city.name}</span>
                  {city.lod && <span className={`lod-badge lod-${city.lod}`}>LOD{city.lod}</span>}
                </button>
              ))}
            </div>
          </div>
        ))}
      </section>

      {/* ピン一覧 */}
      <section className="panel-section">
        <div className="panel-section-header">
          <h3 className="panel-section-title">ピン ({pins.length})</h3>
          <button
            className={`panel-tool-btn ${mapMode === 'pin' ? 'active' : ''}`}
            onClick={() => setMapMode(mapMode === 'pin' ? 'select' : 'pin')}
          >
            + 追加
          </button>
        </div>
        {pins.length === 0 ? (
          <p className="panel-empty">マップをクリックしてピンを追加</p>
        ) : (
          <ul className="item-list">
            {pins.map((pin) => (
              <li key={pin.id} className="item-row">
                <button
                  className="item-expand"
                  onClick={() => setExpandedPin(expandedPin === pin.id ? null : pin.id)}
                >
                  <span className="pin-dot" style={{ background: pin.color }} />
                  <span className="item-name">{pin.name}</span>
                </button>
                <button className="item-delete" onClick={() => deletePin(pin.id)} title="削除">×</button>

                {expandedPin === pin.id && (
                  <div className="item-detail">
                    <label>名前
                      <input
                        value={pin.name}
                        onChange={(e) => updatePin(pin.id, { name: e.target.value })}
                      />
                    </label>
                    <label>メモ
                      <input
                        value={pin.note ?? ''}
                        placeholder="任意"
                        onChange={(e) => updatePin(pin.id, { note: e.target.value })}
                      />
                    </label>
                    <div className="item-coords">
                      {pin.lat.toFixed(5)}, {pin.lon.toFixed(5)}
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ゾーン一覧 */}
      <section className="panel-section">
        <div className="panel-section-header">
          <h3 className="panel-section-title">ゾーン ({zones.length})</h3>
          <button
            className={`panel-tool-btn ${mapMode === 'zone' ? 'active' : ''}`}
            onClick={() => setMapMode(mapMode === 'zone' ? 'select' : 'zone')}
          >
            + 描画
          </button>
        </div>
        {zones.length === 0 ? (
          <p className="panel-empty">マップ上でゾーンを描画</p>
        ) : (
          <ul className="item-list">
            {zones.map((zone) => (
              <li key={zone.id} className="item-row">
                <span className={`zone-type-badge zone-${zone.type}`}>
                  {ZONE_TYPE_LABELS[zone.type]}
                </span>
                <span className="item-name" style={{ flex: 1 }}>{zone.name}</span>
                <select
                  className="zone-type-select"
                  value={zone.type}
                  onChange={(e) => updateZone(zone.id, { type: e.target.value as ZoneType })}
                >
                  {Object.entries(ZONE_TYPE_LABELS).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
                <button className="item-delete" onClick={() => deleteZone(zone.id)}>×</button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
