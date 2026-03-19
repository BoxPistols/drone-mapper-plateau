import { useDroneStore } from '../../store/droneStore'
import type { MapMode } from '../../types'

const TOOLS: { mode: MapMode; label: string; sub: string; icon: string }[] = [
  {
    mode: 'select',
    label: '通常',
    sub: '地図を動かす',
    icon: 'M15 15l6 6m-11-4a7 7 0 110-14 7 7 0 010 14z',
  },
  {
    mode: 'zone',
    label: '飛行エリア',
    sub: 'クリックで囲む',
    icon: 'M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z',
  },
  {
    mode: 'waypoint',
    label: '通過ポイント',
    sub: '飛ぶ経路を追加',
    icon: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z',
  },
  {
    mode: 'pin',
    label: '目印',
    sub: '場所にマークをつける',
    icon: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z',
  },
]

export function MapToolbar() {
  const { mapMode, setMapMode, drawingZonePoints, commitZone, resetDrawingPoints, activePlanId, plans } =
    useDroneStore()

  const activePlan = plans.find((p) => p.id === activePlanId)

  return (
    <div className="map-toolbar">
      {TOOLS.map((t) => {
        const disabled = t.mode === 'waypoint' && !activePlanId
        return (
          <button
            key={t.mode}
            className={`toolbar-btn ${mapMode === t.mode ? 'active' : ''} ${disabled ? 'disabled' : ''}`}
            onClick={() => {
              if (disabled) return
              setMapMode(mapMode === t.mode ? 'select' : t.mode)
            }}
            title={disabled ? '飛行計画を先に選んでください' : t.sub}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}>
              <path d={t.icon} />
            </svg>
            <span className="toolbar-label">{t.label}</span>
            <span className="toolbar-sub">{disabled ? '計画を選択' : t.sub}</span>
          </button>
        )
      })}

      {/* ゾーン描画中のガイド */}
      {mapMode === 'zone' && (
        <div className="zone-drawing-guide">
          {drawingZonePoints.length === 0 && (
            <span className="zone-guide-text">地図をクリックして囲み始めましょう</span>
          )}
          {drawingZonePoints.length > 0 && drawingZonePoints.length < 3 && (
            <span className="zone-guide-text">あと{3 - drawingZonePoints.length}点以上クリックしてください</span>
          )}
          {drawingZonePoints.length >= 3 && (
            <>
              <span className="zone-guide-text">{drawingZonePoints.length}点 — ダブルクリックで確定</span>
              <button
                className="zone-commit-btn"
                onClick={() => {
                  const name = prompt('このエリアの名前を入力してください', '飛行エリア') ?? '飛行エリア'
                  commitZone(name, 'planned')
                }}
              >
                ✓ 確定する
              </button>
            </>
          )}
          {drawingZonePoints.length > 0 && (
            <button className="zone-cancel-btn" onClick={() => { resetDrawingPoints(); setMapMode('select') }}>
              やり直す
            </button>
          )}
        </div>
      )}

      {/* 通過ポイント追加中のガイド */}
      {mapMode === 'waypoint' && activePlan && (
        <div className="zone-drawing-guide">
          <span className="zone-guide-text">
            「{activePlan.name}」に経路を追加中 — 地図をクリック
          </span>
          <button className="zone-commit-btn" onClick={() => setMapMode('select')}>
            ✓ 完了
          </button>
        </div>
      )}
    </div>
  )
}
