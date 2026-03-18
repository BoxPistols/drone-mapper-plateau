import { useDroneStore } from '../../store/droneStore'
import type { MapMode } from '../../types'

const TOOLS: { mode: MapMode; label: string; icon: string; desc: string }[] = [
  { mode: 'select',   label: '選択',    icon: 'M4 4l16 7-8 2-2 8-6-17z', desc: '建物・オブジェクトを選択' },
  { mode: 'pin',      label: 'ピン',    icon: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z', desc: 'マップにピンを設置' },
  { mode: 'zone',     label: 'ゾーン', icon: 'M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z', desc: 'クリックでゾーン描画、Wクリックで確定' },
  { mode: 'waypoint', label: 'WP追加', icon: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z', desc: '飛行計画にウェイポイント追加' },
]

export function MapToolbar() {
  const { mapMode, setMapMode, drawingZonePoints, commitZone, resetDrawingPoints, activePlanId, plans } =
    useDroneStore()

  const activePlan = plans.find((p) => p.id === activePlanId)

  return (
    <div className="map-toolbar">
      {TOOLS.map((t) => (
        <button
          key={t.mode}
          className={`toolbar-btn ${mapMode === t.mode ? 'active' : ''} ${t.mode === 'waypoint' && !activePlanId ? 'disabled' : ''}`}
          onClick={() => {
            if (t.mode === 'waypoint' && !activePlanId) return
            setMapMode(mapMode === t.mode ? 'select' : t.mode)
          }}
          title={t.desc}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
            <path d={t.icon} />
          </svg>
          <span>{t.label}</span>
        </button>
      ))}

      {/* ゾーン描画中のコントロール */}
      {mapMode === 'zone' && drawingZonePoints.length > 0 && (
        <div className="zone-drawing-controls">
          <span className="zone-point-count">{drawingZonePoints.length}点</span>
          {drawingZonePoints.length >= 3 && (
            <button
              className="zone-commit-btn"
              onClick={() => {
                const name = prompt('ゾーン名を入力してください', 'フライトゾーン')
                if (name) commitZone(name, 'planned')
              }}
            >
              確定
            </button>
          )}
          <button className="zone-cancel-btn" onClick={() => { resetDrawingPoints(); setMapMode('select') }}>
            キャンセル
          </button>
        </div>
      )}

      {/* ウェイポイントモード: アクティブ計画名 */}
      {mapMode === 'waypoint' && activePlan && (
        <div className="waypoint-hint">
          <span>{activePlan.name}</span>にWP追加中
          <button onClick={() => setMapMode('select')}>完了</button>
        </div>
      )}
    </div>
  )
}
