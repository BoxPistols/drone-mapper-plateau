import { useDroneStore } from '../../store/droneStore'
import type { ZoneType } from '../../types'

const ZONE_TYPE_LABELS: Record<ZoneType, string> = {
  planned:    '計画エリア',
  restricted: '飛行禁止',
  caution:    '注意エリア',
  completed:  '完了済み',
}

const PIN_COLORS = ['#58a6ff', '#f78166', '#7ee787', '#ffa657', '#d2a8ff', '#ff7b72', '#79c0ff', '#ffffff']

export function MapEntityPopup() {
  const {
    mapPopup, setMapPopup,
    pins, updatePin, deletePin,
    zones, updateZone, deleteZone,
  } = useDroneStore()

  if (!mapPopup) return null

  const { type, id, x, y } = mapPopup

  // ポップアップがマップの右端・下端に近い場合は左上方向にずらす
  const left = x + 240 > window.innerWidth  ? x - 240 : x + 12
  const top  = y + 200 > window.innerHeight ? y - 200 : y + 12

  if (type === 'pin') {
    const pin = pins.find((p) => p.id === id)
    if (!pin) return null

    return (
      <div
        className="map-popup"
        style={{ left, top }}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <div className="map-popup-header">
          <span className="pin-dot" style={{ background: pin.color }} />
          <span className="map-popup-title">ピン</span>
          <button className="map-popup-close" onClick={() => setMapPopup(null)}>×</button>
        </div>

        <div className="map-popup-body">
          <label className="map-popup-label">
            名前
            <input
              className="map-popup-input"
              value={pin.name}
              onChange={(e) => updatePin(id, { name: e.target.value })}
            />
          </label>
          <label className="map-popup-label">
            メモ
            <input
              className="map-popup-input"
              value={pin.note ?? ''}
              placeholder="任意"
              onChange={(e) => updatePin(id, { note: e.target.value })}
            />
          </label>
          <div className="map-popup-colors">
            {PIN_COLORS.map((c) => (
              <button
                key={c}
                className={`pin-swatch ${pin.color === c ? 'active' : ''}`}
                style={{ background: c }}
                onClick={() => updatePin(id, { color: c })}
              />
            ))}
            <input
              type="color"
              className="pin-color-custom"
              value={pin.color}
              onChange={(e) => updatePin(id, { color: e.target.value })}
              title="カスタムカラー"
            />
          </div>
          <div className="map-popup-coords">
            {pin.lat.toFixed(5)}, {pin.lon.toFixed(5)} | 海抜 {pin.alt.toFixed(1)}m
          </div>
        </div>

        <div className="map-popup-footer">
          <button
            className="map-popup-delete"
            onClick={() => {
              if (confirm(`「${pin.name}」を削除しますか？`)) {
                deletePin(id)
                setMapPopup(null)
              }
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
            </svg>
            削除
          </button>
        </div>
      </div>
    )
  }

  if (type === 'zone') {
    const zone = zones.find((z) => z.id === id)
    if (!zone) return null

    return (
      <div
        className="map-popup"
        style={{ left, top }}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <div className="map-popup-header">
          <span className={`zone-type-badge zone-${zone.type}`}>{ZONE_TYPE_LABELS[zone.type]}</span>
          <button className="map-popup-close" onClick={() => setMapPopup(null)}>×</button>
        </div>

        <div className="map-popup-body">
          <label className="map-popup-label">
            名前
            <input
              className="map-popup-input"
              value={zone.name}
              onChange={(e) => updateZone(id, { name: e.target.value })}
            />
          </label>
          <label className="map-popup-label">
            種別
            <select
              className="map-popup-select"
              value={zone.type}
              onChange={(e) => updateZone(id, { type: e.target.value as ZoneType })}
            >
              {Object.entries(ZONE_TYPE_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </label>
          <label className="map-popup-label">
            最大高度
            <div className="input-unit" style={{ marginTop: 4 }}>
              <input
                type="number" min={0} max={300}
                className="map-popup-input"
                value={zone.maxAlt ?? ''}
                placeholder="制限なし"
                onChange={(e) => updateZone(id, { maxAlt: e.target.value ? Number(e.target.value) : undefined })}
              />
              <span>m AGL</span>
            </div>
          </label>
          {zone.note !== undefined && (
            <label className="map-popup-label">
              メモ
              <input
                className="map-popup-input"
                value={zone.note}
                placeholder="任意"
                onChange={(e) => updateZone(id, { note: e.target.value })}
              />
            </label>
          )}
          {!zone.note && (
            <button
              className="map-popup-add-note"
              onClick={() => updateZone(id, { note: '' })}
            >
              + メモを追加
            </button>
          )}
          <div className="map-popup-coords">{zone.coordinates.length}頂点</div>
        </div>

        <div className="map-popup-footer">
          <button
            className="map-popup-delete"
            onClick={() => {
              if (confirm(`「${zone.name}」を削除しますか？`)) {
                deleteZone(id)
                setMapPopup(null)
              }
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
            </svg>
            削除
          </button>
        </div>
      </div>
    )
  }

  return null
}
