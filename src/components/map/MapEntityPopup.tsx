import { useRef, useLayoutEffect, useState } from 'react'
import { useDroneStore } from '../../store/droneStore'
import type { ZoneType, WaypointAction } from '../../types'

const ZONE_TYPE_LABELS: Record<ZoneType, string> = {
  planned:    '飛行予定エリア',
  restricted: '飛行禁止区域',
  caution:    '注意エリア',
  completed:  '完了済み',
}

const ACTION_LABELS: Record<WaypointAction, string> = {
  none:        'なし',
  photo:       '写真を撮る',
  video_start: '動画撮影を開始',
  video_stop:  '動画撮影を停止',
  hover:       'その場で停止',
}

const PIN_COLORS = ['#58a6ff', '#f78166', '#7ee787', '#ffa657', '#d2a8ff', '#ff7b72', '#79c0ff', '#ffffff']

/** ポップアップ本体: 子コンポーネントでrefを受け取り位置補正 */
function PopupShell({
  anchorX, anchorY, children,
}: {
  anchorX: number; anchorY: number; children: React.ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [style, setStyle] = useState<React.CSSProperties>({
    left: -9999, top: -9999, visibility: 'hidden',
  })

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const mapArea = document.querySelector('.map-area')
    const mapW = mapArea?.clientWidth  ?? window.innerWidth
    const mapH = mapArea?.clientHeight ?? window.innerHeight
    const popW = el.offsetWidth
    const popH = el.offsetHeight

    // 基本位置: クリック点の右下14px
    let left = anchorX + 14
    let top  = anchorY + 14

    // 右端チェック
    if (left + popW > mapW - 8) left = anchorX - popW - 8
    // 左端チェック（0未満にならない）
    if (left < 8) left = 8

    // 下端チェック
    if (top + popH > mapH - 8) top = anchorY - popH - 8
    // 上端チェック
    if (top < 8) top = 8

    setStyle({ left, top, visibility: 'visible' })
  }, [anchorX, anchorY])

  return (
    <div
      ref={ref}
      className="map-popup"
      style={style}
      onPointerDown={(e) => e.stopPropagation()}
    >
      {children}
    </div>
  )
}

export function MapEntityPopup() {
  const {
    mapPopup, setMapPopup,
    pins, updatePin, deletePin,
    zones, updateZone, deleteZone,
    plans, updateWaypoint, deleteWaypoint,
  } = useDroneStore()

  if (!mapPopup) return null
  const { type, id, planId, x, y } = mapPopup

  // ── ピン ──
  if (type === 'pin') {
    const pin = pins.find((p) => p.id === id)
    if (!pin) return null
    return (
      <PopupShell anchorX={x} anchorY={y}>
        <div className="map-popup-header">
          <span className="pin-dot" style={{ background: pin.color }} />
          <span className="map-popup-title">目印（ピン）</span>
          <button className="map-popup-close" onClick={() => setMapPopup(null)}>×</button>
        </div>
        <div className="map-popup-body">
          <label className="map-popup-label">
            名前
            <input className="map-popup-input" value={pin.name}
              onChange={(e) => updatePin(id, { name: e.target.value })} />
          </label>
          <label className="map-popup-label">
            メモ
            <input className="map-popup-input" value={pin.note ?? ''} placeholder="任意"
              onChange={(e) => updatePin(id, { note: e.target.value })} />
          </label>
          <div className="map-popup-colors">
            {PIN_COLORS.map((c) => (
              <button key={c} className={`pin-swatch ${pin.color === c ? 'active' : ''}`}
                style={{ background: c }} onClick={() => updatePin(id, { color: c })} />
            ))}
            <input type="color" className="pin-color-custom" value={pin.color}
              onChange={(e) => updatePin(id, { color: e.target.value })} title="カスタムカラー" />
          </div>
          <div className="map-popup-coords">
            {pin.lat.toFixed(5)}, {pin.lon.toFixed(5)} | 海抜 {pin.alt.toFixed(1)}m
          </div>
        </div>
        <div className="map-popup-footer">
          <button className="map-popup-delete" onClick={() => {
            if (confirm(`「${pin.name}」を削除しますか？`)) { deletePin(id); setMapPopup(null) }
          }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
            </svg>
            削除する
          </button>
        </div>
      </PopupShell>
    )
  }

  // ── ゾーン ──
  if (type === 'zone') {
    const zone = zones.find((z) => z.id === id)
    if (!zone) return null
    return (
      <PopupShell anchorX={x} anchorY={y}>
        <div className="map-popup-header">
          <span className={`zone-type-badge zone-${zone.type}`}>{ZONE_TYPE_LABELS[zone.type]}</span>
          <button className="map-popup-close" onClick={() => setMapPopup(null)}>×</button>
        </div>
        <div className="map-popup-body">
          <label className="map-popup-label">
            エリア名
            <input className="map-popup-input" value={zone.name}
              onChange={(e) => updateZone(id, { name: e.target.value })} />
          </label>
          <label className="map-popup-label">
            種別
            <select className="map-popup-select" value={zone.type}
              onChange={(e) => updateZone(id, { type: e.target.value as ZoneType })}>
              {Object.entries(ZONE_TYPE_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </label>
          <label className="map-popup-label">
            最大飛行高度
            <div className="input-unit" style={{ marginTop: 4 }}>
              <input type="number" min={0} max={300} className="map-popup-input"
                value={zone.maxAlt ?? ''} placeholder="制限なし"
                onChange={(e) => updateZone(id, { maxAlt: e.target.value ? Number(e.target.value) : undefined })} />
              <span>m</span>
            </div>
          </label>
          {zone.note !== undefined && (
            <label className="map-popup-label">
              メモ
              <input className="map-popup-input" value={zone.note} placeholder="任意"
                onChange={(e) => updateZone(id, { note: e.target.value })} />
            </label>
          )}
          {zone.note === undefined && (
            <button className="map-popup-add-note" onClick={() => updateZone(id, { note: '' })}>
              + メモを追加
            </button>
          )}
          <div className="map-popup-coords">{zone.coordinates.length}頂点</div>
        </div>
        <div className="map-popup-footer">
          <button className="map-popup-delete" onClick={() => {
            if (confirm(`「${zone.name}」を削除しますか？`)) { deleteZone(id); setMapPopup(null) }
          }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
            </svg>
            削除する
          </button>
        </div>
      </PopupShell>
    )
  }

  // ── ウェイポイント ──
  if (type === 'waypoint' && planId) {
    const plan = plans.find((p) => p.id === planId)
    const wp = plan?.waypoints.find((w) => w.id === id)
    const wpIdx = plan?.waypoints.findIndex((w) => w.id === id) ?? -1
    if (!plan || !wp) return null

    return (
      <PopupShell anchorX={x} anchorY={y}>
        <div className="map-popup-header">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
            style={{ width: 14, height: 14, flexShrink: 0, color: '#0369a1' }}>
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
          </svg>
          <span className="map-popup-title">通過ポイント {wpIdx + 1}</span>
          <button className="map-popup-close" onClick={() => setMapPopup(null)}>×</button>
        </div>
        <div className="map-popup-body">
          <div style={{ fontSize: 12, color: 'var(--text-faint)', marginBottom: 2 }}>
            {plan.name}
          </div>
          <label className="map-popup-label">
            地上からの高さ
            <div className="input-unit">
              <input type="number" min={10} max={150} className="map-popup-input"
                value={wp.altAGL}
                onChange={(e) => updateWaypoint(planId, id, { altAGL: Number(e.target.value) })} />
              <span>m</span>
            </div>
          </label>
          <label className="map-popup-label">
            飛ぶ速さ
            <div className="input-unit">
              <input type="number" min={1} max={20} className="map-popup-input"
                value={wp.speedMS}
                onChange={(e) => updateWaypoint(planId, id, { speedMS: Number(e.target.value) })} />
              <span>m/s</span>
            </div>
          </label>
          <label className="map-popup-label">
            このポイントでの動作
            <select className="map-popup-select" value={wp.action}
              onChange={(e) => updateWaypoint(planId, id, { action: e.target.value as WaypointAction })}>
              {Object.entries(ACTION_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </label>
          {wp.action === 'hover' && (
            <label className="map-popup-label">
              停止する時間
              <div className="input-unit">
                <input type="number" min={1} className="map-popup-input"
                  value={wp.hoverSec ?? 5}
                  onChange={(e) => updateWaypoint(planId, id, { hoverSec: Number(e.target.value) })} />
                <span>秒</span>
              </div>
            </label>
          )}
          <div className="map-popup-coords">
            {wp.lat.toFixed(5)}, {wp.lon.toFixed(5)}
          </div>
        </div>
        <div className="map-popup-footer">
          <button className="map-popup-delete" onClick={() => {
            if (confirm(`ポイント${wpIdx + 1}を削除しますか？`)) {
              deleteWaypoint(planId, id)
              setMapPopup(null)
            }
          }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
            </svg>
            このポイントを削除
          </button>
        </div>
      </PopupShell>
    )
  }

  return null
}
