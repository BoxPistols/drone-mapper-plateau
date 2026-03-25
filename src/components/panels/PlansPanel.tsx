import { useState } from 'react'
import { useDroneStore } from '../../store/droneStore'
import { PreflightChecklist } from '../PreflightChecklist'
import { useNominatimSearch } from '../../hooks/useNominatimSearch'
import type { FlightPlan, Waypoint, WaypointAction, PlanStatus } from '../../types'

const STATUS_LABELS: Record<PlanStatus, string> = {
  draft:     '作成中',
  approved:  '承認済み',
  completed: '完了',
}

const ACTION_LABELS: Record<WaypointAction, string> = {
  none:        'なし',
  photo:       '写真を撮る',
  video_start: '動画撮影を開始',
  video_stop:  '動画撮影を停止',
  hover:       'その場で停止',
}

const ACTION_BADGES: Record<WaypointAction, string> = {
  none:        '',
  photo:       '📷',
  video_start: '🎬',
  video_stop:  '⏹',
  hover:       '⏸',
}

// ── 飛行統計の計算 ────────────────────────────
function calcStats(wps: Waypoint[]) {
  if (wps.length < 2) return null
  let distM = 0, totalMs = 0
  let photoCount = 0
  const maxAlt = Math.max(...wps.map((w) => w.altAGL))
  for (let i = 0; i < wps.length - 1; i++) {
    const a = wps[i], b = wps[i + 1]
    const dx = (b.lon - a.lon) * 111320 * Math.cos((a.lat * Math.PI) / 180)
    const dy = (b.lat - a.lat) * 110540
    const dz = b.altAGL - a.altAGL
    const d = Math.sqrt(dx * dx + dy * dy + dz * dz)
    distM += d
    totalMs += Math.max((d / a.speedMS) * 1000, 1)
    if (b.action === 'hover' && b.hoverSec && i < wps.length - 2) totalMs += b.hoverSec * 1000
    if (b.action === 'photo' || b.action === 'video_start') photoCount++
  }
  return { distM, totalMs, maxAlt, photoCount }
}

function fmtTime(ms: number) {
  const s = Math.round(ms / 1000)
  if (s < 60) return `${s}秒`
  return `${Math.floor(s / 60)}分${String(s % 60).padStart(2, '0')}秒`
}

// ── エクスポート ──────────────────────────────
function exportAsJSON(plan: FlightPlan) {
  const blob = new Blob([JSON.stringify(plan, null, 2)], { type: 'application/json' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `${plan.name.replace(/[^a-zA-Z0-9\u3000-\u9fff]/g, '_')}.json`
  a.click()
  URL.revokeObjectURL(a.href)
}

function exportAsKML(plan: FlightPlan) {
  const wps = plan.waypoints
  const coords = wps.map((w) => `${w.lon},${w.lat},${(w.groundAlt + w.altAGL).toFixed(1)}`).join('\n          ')
  const placemarks = wps.map((w, i) => `
    <Placemark>
      <name>WP${i + 1}</name>
      <description>高度: ${w.altAGL}m AGL / 速度: ${w.speedMS}m/s / アクション: ${ACTION_LABELS[w.action]}</description>
      <Style><IconStyle><scale>0.8</scale></IconStyle></Style>
      <Point>
        <altitudeMode>absolute</altitudeMode>
        <coordinates>${w.lon},${w.lat},${(w.groundAlt + w.altAGL).toFixed(1)}</coordinates>
      </Point>
    </Placemark>`).join('')

  const kml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>${plan.name}</name>
    <description>パイロット: ${plan.pilotName ?? '-'} / 機体: ${plan.droneModel ?? '-'} / 最大高度: ${plan.maxAltAGL}m</description>
    <Placemark>
      <name>飛行ルート</name>
      <Style>
        <LineStyle><color>ff00ff88</color><width>3</width></LineStyle>
      </Style>
      <LineString>
        <altitudeMode>absolute</altitudeMode>
        <coordinates>
          ${coords}
        </coordinates>
      </LineString>
    </Placemark>${placemarks}
  </Document>
</kml>`
  const blob = new Blob([kml], { type: 'application/vnd.google-earth.kml+xml' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `${plan.name.replace(/[^a-zA-Z0-9\u3000-\u9fff]/g, '_')}.kml`
  a.click()
  URL.revokeObjectURL(a.href)
}

// ── ウェイポイント行 ──────────────────────────
function WaypointRow({
  wp, idx, total, planId, onUpdate, onDelete,
}: {
  wp: Waypoint; idx: number; total: number; planId: string
  onUpdate: (p: Partial<Waypoint>) => void
  onDelete: () => void
}) {
  const { moveWaypoint, addToast } = useDroneStore()
  const [open, setOpen] = useState(false)
  const [editField, setEditField] = useState<'lat' | 'lon' | null>(null)
  const [editValue, setEditValue] = useState('')
  const overLimit = wp.altAGL > 150

  const startEdit = (field: 'lat' | 'lon') => {
    setEditField(field)
    setEditValue(field === 'lat' ? wp.lat.toFixed(6) : wp.lon.toFixed(6))
  }
  const saveEdit = () => {
    if (!editField) return
    const v = parseFloat(editValue)
    if (!isNaN(v)) {
      if (editField === 'lat' && v >= -90 && v <= 90) onUpdate({ lat: v })
      else if (editField === 'lon' && v >= -180 && v <= 180) onUpdate({ lon: v })
    }
    setEditField(null)
  }
  const handleEditKey = (e: React.KeyboardEvent) => {
    if (e.nativeEvent.isComposing) return
    if (e.key === 'Enter') saveEdit()
    else if (e.key === 'Escape') setEditField(null)
  }

  const flyToWp = () =>
    window.dispatchEvent(new CustomEvent('cesium:flyTo', { detail: { lat: wp.lat, lon: wp.lon } }))

  const mslAlt = wp.groundAlt + wp.altAGL

  return (
    <li className={`wp-row ${open ? 'wp-row--open' : ''}`}>
      {/* 行1: 番号 + 飛行パラメータ + アクション */}
      <div className="wp-main">
        <span className="wp-num" onClick={flyToWp} title="クリックで地図移動">
          {idx + 1}
        </span>

        <div className="wp-info" onClick={() => setOpen(!open)}>
          {/* 上段: 飛行パラメータ */}
          <div className="wp-params">
            <span className={`wp-alt ${overLimit ? 'wp-alt--warn' : ''}`} title={`地上高 ${wp.altAGL}m / 海抜 ${mslAlt.toFixed(0)}m`}>
              {wp.altAGL}m
            </span>
            <span className="wp-sep">/</span>
            <span className="wp-speed">{wp.speedMS}m/s</span>
            {overLimit && <span className="wp-over-limit" title="150m制限超過">!</span>}
            {wp.action !== 'none' && (
              <span className="wp-action-badge" title={ACTION_LABELS[wp.action]}>{ACTION_BADGES[wp.action]}</span>
            )}
            {wp.groundAlt > 0 && (
              <span className="wp-ground-alt" title={`地盤高 ${wp.groundAlt.toFixed(1)}m MSL`}>
                GL{wp.groundAlt.toFixed(0)}m
              </span>
            )}
          </div>

          {/* 下段: 座標（ダブルクリックで編集） */}
          <div className="wp-coords">
            {editField === 'lat' ? (
              <input className="wp-coord-edit" value={editValue} onChange={(e) => setEditValue(e.target.value)}
                onKeyDown={handleEditKey} onBlur={saveEdit} autoFocus onClick={(e) => e.stopPropagation()} />
            ) : (
              <span className="wp-coord" onDoubleClick={(e) => { e.stopPropagation(); startEdit('lat') }} title="ダブルクリックで緯度を編集">
                {wp.lat.toFixed(6)}
              </span>
            )}
            <span className="wp-coord-sep">,</span>
            {editField === 'lon' ? (
              <input className="wp-coord-edit" value={editValue} onChange={(e) => setEditValue(e.target.value)}
                onKeyDown={handleEditKey} onBlur={saveEdit} autoFocus onClick={(e) => e.stopPropagation()} />
            ) : (
              <span className="wp-coord" onDoubleClick={(e) => { e.stopPropagation(); startEdit('lon') }} title="ダブルクリックで経度を編集">
                {wp.lon.toFixed(6)}
              </span>
            )}
            <button className="wp-copy-btn" onClick={(e) => {
              e.stopPropagation()
              navigator.clipboard.writeText(`${wp.lat.toFixed(6)}, ${wp.lon.toFixed(6)}`)
              addToast('座標をコピーしました', 'info')
            }} title="座標をコピー">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width={11} height={11}>
                <rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
              </svg>
            </button>
          </div>
        </div>

        {/* 展開シェブロン */}
        <svg className="wp-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} onClick={() => setOpen(!open)}>
          <path strokeLinecap="round" d="M19 9l-7 7-7-7"/>
        </svg>

        {/* 並べ替え + 削除 (ホバーで表示) */}
        <div className="wp-actions">
          <button className="wp-act-btn" disabled={idx === 0} onClick={() => moveWaypoint(planId, wp.id, 'up')} title="上に移動">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" d="M5 15l7-7 7 7"/></svg>
          </button>
          <button className="wp-act-btn" disabled={idx === total - 1} onClick={() => moveWaypoint(planId, wp.id, 'down')} title="下に移動">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" d="M19 9l-7 7-7-7"/></svg>
          </button>
          <button className="wp-act-btn wp-act-del" onClick={onDelete} title="削除">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
      </div>

      {/* 展開: 編集フォーム */}
      {open && (
        <div className="wp-detail">
          <div className="wp-detail-grid">
            <label>高度
              <div className="input-unit">
                <input type="number" min={10} max={300} value={wp.altAGL}
                  onChange={(e) => onUpdate({ altAGL: Number(e.target.value) })} />
                <span>m</span>
              </div>
              {wp.altAGL > 150 && (
                <span className="field-warning">150m制限超過</span>
              )}
            </label>
            <label>速度
              <div className="input-unit">
                <input type="number" min={1} max={20} value={wp.speedMS}
                  onChange={(e) => onUpdate({ speedMS: Number(e.target.value) })} />
                <span>m/s</span>
              </div>
            </label>
            <label>動作
              <select value={wp.action}
                onChange={(e) => onUpdate({ action: e.target.value as WaypointAction })}>
                {Object.entries(ACTION_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </label>
            {wp.action === 'hover' && (
              <label>停止時間
                <div className="input-unit">
                  <input type="number" min={1} value={wp.hoverSec ?? 5}
                    onChange={(e) => onUpdate({ hoverSec: Number(e.target.value) })} />
                  <span>秒</span>
                </div>
              </label>
            )}
          </div>
        </div>
      )}
    </li>
  )
}

// ── 計画詳細 ──────────────────────────────────
interface PlanDetailProps {
  plan: FlightPlan
  onBack: () => void
}

function PlanDetail({ plan, onBack }: PlanDetailProps) {
  const {
    updatePlan, deletePlan, addRecord,
    mapMode, setMapMode, setActivePlanId, activePlanId,
    addWaypoint, updateWaypoint, deleteWaypoint, startSimulation,
    setSidebarTab, simulation, addToast,
    zones, generateWaypointsFromZone,
  } = useDroneStore()

  const [showChecklist, setShowChecklist] = useState(false)
  const [showExportMenu, setShowExportMenu] = useState(false)
  const [showWpSearch, setShowWpSearch] = useState(false)
  const nominatim = useNominatimSearch()
  const [showZoneGen, setShowZoneGen] = useState(false)
  const [zoneGenOpts, setZoneGenOpts] = useState({
    zoneId: '',
    mode: 'perimeter' as 'perimeter' | 'grid',
    spacingM: 50,
    altAGL: 50,
    speedMS: 5,
  })
  const [fetchingElevation, setFetchingElevation] = useState(false)
  const [elevProgress, setElevProgress] = useState({ current: 0, total: 0 })

  const handleFetchElevations = async () => {
    const total = plan.waypoints.length
    setFetchingElevation(true)
    setElevProgress({ current: 0, total })
    let updated = 0
    for (let i = 0; i < total; i++) {
      const wp = plan.waypoints[i]
      setElevProgress({ current: i + 1, total })
      try {
        const res = await fetch(
          `https://cyberjapandata2.gsi.go.jp/general/dem/scripts/getelevation.php?lon=${wp.lon}&lat=${wp.lat}&outtype=JSON`
        )
        const data = await res.json()
        if (data.elevation !== '-----' && typeof data.elevation === 'number') {
          updateWaypoint(plan.id, wp.id, { groundAlt: data.elevation })
          updated++
        }
      } catch { /* skip */ }
      await new Promise((r) => setTimeout(r, 200))
    }
    setFetchingElevation(false)
    addToast(`${updated}/${total} ポイントの標高を取得しました`, 'success')
  }

  const isActive = activePlanId === plan.id
  const isSimulating = simulation?.planId === plan.id
  const stats = calcStats(plan.waypoints)
  const hasOverLimit = plan.waypoints.some((w) => w.altAGL > 150)

  const handleSimStart = () => {
    if (isSimulating) return
    setShowChecklist(true)
  }

  const handleChecklistConfirm = () => {
    setShowChecklist(false)
    startSimulation(plan.id)
    addToast('シミュレーションを開始します', 'success')
  }

  return (
    <>
      {showChecklist && (
        <PreflightChecklist
          plan={plan}
          onConfirm={handleChecklistConfirm}
          onCancel={() => setShowChecklist(false)}
        />
      )}

      <div className="panel plan-detail">
        <div className="panel-back">
          <button className="back-btn" onClick={onBack}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" d="M15 19l-7-7 7-7"/>
            </svg>
            一覧へ戻る
          </button>
          <span className={`status-badge status-${plan.status}`}>{STATUS_LABELS[plan.status]}</span>
        </div>

        {/* 基本情報 */}
        <section className="panel-section">
          <input
            className="plan-name-input"
            value={plan.name}
            onChange={(e) => updatePlan(plan.id, { name: e.target.value })}
            placeholder="計画の名前"
          />
          <div className="plan-meta-grid">
            <label>パイロット
              <input value={plan.pilotName ?? ''} placeholder="担当者名"
                onChange={(e) => updatePlan(plan.id, { pilotName: e.target.value })} />
            </label>
            <label>機体
              <input value={plan.droneModel ?? ''} placeholder="例: DJI Mini 4 Pro"
                onChange={(e) => updatePlan(plan.id, { droneModel: e.target.value })} />
            </label>
            <label>飛行予定日
              <input type="date" value={plan.plannedDate ?? ''}
                onChange={(e) => updatePlan(plan.id, { plannedDate: e.target.value })} />
            </label>
            <label>
              最大飛行高さ
              {plan.maxAltAGL > 150 && <span className="label-warn">※150m超</span>}
              <div className="input-unit">
                <input type="number" value={plan.maxAltAGL} min={0} max={999}
                  onChange={(e) => updatePlan(plan.id, { maxAltAGL: Number(e.target.value) })} />
                <span>m</span>
              </div>
            </label>
            <label>状態
              <select value={plan.status}
                onChange={(e) => updatePlan(plan.id, { status: e.target.value as PlanStatus })}>
                {Object.entries(STATUS_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </label>
          </div>
          <textarea
            className="plan-desc"
            value={plan.description ?? ''}
            placeholder="メモ・飛行目的など"
            rows={2}
            onChange={(e) => updatePlan(plan.id, { description: e.target.value })}
          />
        </section>

        {/* 飛行統計 */}
        {stats && (
          <section className="panel-section plan-stats-section">
            <h3 className="panel-section-title">飛行統計</h3>
            <div className="plan-stats-grid">
              <div className="plan-stat">
                <span className="stat-label">総距離</span>
                <span className="stat-value">
                  {stats.distM >= 1000
                    ? `${(stats.distM / 1000).toFixed(2)}km`
                    : `${Math.round(stats.distM)}m`}
                </span>
              </div>
              <div className="plan-stat">
                <span className="stat-label">飛行時間</span>
                <span className="stat-value">{fmtTime(stats.totalMs)}</span>
              </div>
              <div className="plan-stat">
                <span className="stat-label">最大高度</span>
                <span className={`stat-value ${stats.maxAlt > 150 ? 'stat-warn' : ''}`}>
                  {stats.maxAlt}m
                </span>
              </div>
              <div className="plan-stat">
                <span className="stat-label">撮影ポイント</span>
                <span className="stat-value">{stats.photoCount}箇所</span>
              </div>
            </div>
            {hasOverLimit && (
              <div className="plan-stats-alert">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                </svg>
                一部のポイントが150mを超えています。国土交通省への申請が必要です。
              </div>
            )}
          </section>
        )}

        {/* 通過ポイント */}
        <section className="panel-section">
          <div className="panel-section-header">
            <h3 className="panel-section-title">
              通過ポイント ({plan.waypoints.length})
            </h3>
            <button
              className={`panel-tool-btn ${isActive && mapMode === 'waypoint' ? 'active' : ''}`}
              onClick={() => {
                setActivePlanId(plan.id)
                setMapMode(mapMode === 'waypoint' && isActive ? 'select' : 'waypoint')
              }}
            >
              {isActive && mapMode === 'waypoint' ? '完了' : '+ 地図'}
            </button>
          </div>
          <div className="wp-toolbar">
            <button className={`wp-tool-btn ${showWpSearch ? 'active' : ''}`} onClick={() => { setShowWpSearch(!showWpSearch); setShowZoneGen(false) }} title="場所を検索してWP追加">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width={14} height={14}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
              検索
            </button>
            {zones.length > 0 && (
              <button className={`wp-tool-btn ${showZoneGen ? 'active' : ''}`} onClick={() => { setShowZoneGen(!showZoneGen); setShowWpSearch(false) }} title="ゾーンからWP自動生成">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width={14} height={14}><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 3v18"/></svg>
                ゾーン
              </button>
            )}
            <button
              className="wp-tool-btn"
              disabled={fetchingElevation || plan.waypoints.length === 0}
              onClick={handleFetchElevations}
              title="国土地理院APIで標高を一括取得"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width={14} height={14}><path d="M8 3v2m8-2v2M3 8h2m14 0h2M7 14l3-3 2 2 4-4"/></svg>
              {fetchingElevation ? `${elevProgress.current}/${elevProgress.total}` : '標高'}
            </button>
          </div>
          {/* 標高取得プログレスバー */}
          {fetchingElevation && (
            <div className="wp-elev-progress">
              <div className="wp-elev-progress-bar" style={{ width: `${(elevProgress.current / elevProgress.total) * 100}%` }} />
            </div>
          )}

          {/* Phase 2: 地名検索→WP追加 */}
          {showWpSearch && (
            <div className="wp-search-panel">
              <input
                className="wp-search-input"
                value={nominatim.query}
                onChange={(e) => nominatim.handleChange(e.target.value)}
                placeholder="地名・建物名で検索..."
                autoFocus
              />
              {nominatim.loading && <div className="wp-search-loading">検索中...</div>}
              {nominatim.results.length > 0 && (
                <ul className="wp-search-results">
                  {nominatim.results.map((r, i) => (
                    <li key={i}>
                      <span className="wp-search-name">{r.display_name.split(',')[0]}</span>
                      <span className="wp-search-detail">{r.display_name.split(',').slice(1, 3).join(',')}</span>
                      <button
                        className="wp-search-add-btn"
                        onClick={() => {
                          addWaypoint(plan.id, parseFloat(r.lon), parseFloat(r.lat))
                          addToast(`${r.display_name.split(',')[0]} をWPに追加`, 'success')
                          window.dispatchEvent(new CustomEvent('cesium:flyTo', {
                            detail: { lat: parseFloat(r.lat), lon: parseFloat(r.lon) }
                          }))
                          nominatim.clear()
                          setShowWpSearch(false)
                        }}
                      >
                        + WP追加
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Phase 3: ゾーンからWP生成 */}
          {showZoneGen && (
            <div className="zone-gen-panel">
              <label>ゾーン
                <select value={zoneGenOpts.zoneId} onChange={(e) => setZoneGenOpts({...zoneGenOpts, zoneId: e.target.value})}>
                  <option value="">選択...</option>
                  {zones.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}
                </select>
              </label>
              <label>モード
                <select value={zoneGenOpts.mode} onChange={(e) => setZoneGenOpts({...zoneGenOpts, mode: e.target.value as 'perimeter' | 'grid'})}>
                  <option value="perimeter">外周</option>
                  <option value="grid">グリッド</option>
                </select>
              </label>
              <label>間隔 (m)
                <input type="number" min={10} max={500} value={zoneGenOpts.spacingM} onChange={(e) => setZoneGenOpts({...zoneGenOpts, spacingM: Number(e.target.value)})} />
              </label>
              <label>高度 (m)
                <input type="number" min={1} max={150} value={zoneGenOpts.altAGL} onChange={(e) => setZoneGenOpts({...zoneGenOpts, altAGL: Number(e.target.value)})} />
              </label>
              <label>速度 (m/s)
                <input type="number" min={1} max={20} value={zoneGenOpts.speedMS} onChange={(e) => setZoneGenOpts({...zoneGenOpts, speedMS: Number(e.target.value)})} />
              </label>
              <button
                className="action-btn primary"
                disabled={!zoneGenOpts.zoneId}
                onClick={() => {
                  generateWaypointsFromZone(plan.id, zoneGenOpts.zoneId, zoneGenOpts)
                  setShowZoneGen(false)
                }}
              >
                WP生成
              </button>
            </div>
          )}

          {plan.waypoints.length === 0 ? (
            <div className="panel-empty-guided">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} style={{width:36,height:36,color:'var(--accent)'}}>
                <path strokeLinecap="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0zM15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
              </svg>
              {isActive && mapMode === 'waypoint' ? (
                <p>地図上をクリックして<br />通過ポイントを追加してください</p>
              ) : (
                <p>上の「+ 地図」ボタンを押してから<br />地図上をクリックすると<br />通過ポイントが追加されます</p>
              )}
            </div>
          ) : (
            <ul className="item-list wp-list">
              {plan.waypoints.map((wp, idx) => (
                <WaypointRow
                  key={wp.id}
                  wp={wp}
                  idx={idx}
                  total={plan.waypoints.length}
                  planId={plan.id}
                  onUpdate={(patch) => updateWaypoint(plan.id, wp.id, patch)}
                  onDelete={() => {
                    deleteWaypoint(plan.id, wp.id)
                    addToast(`ポイント${idx + 1}を削除しました`, 'info')
                  }}
                />
              ))}
            </ul>
          )}
        </section>

        {/* アクション */}
        <section className="panel-section plan-actions">
          <button
            className={`action-btn sim-btn ${isSimulating ? 'active' : ''}`}
            disabled={plan.waypoints.length < 2}
            onClick={handleSimStart}
            title={plan.waypoints.length < 2 ? '通過ポイントを2つ以上追加してください' : ''}
          >
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z"/>
            </svg>
            {plan.waypoints.length < 2 ? '2ポイント以上必要' : 'シミュレーション'}
          </button>

          <button
            className={`action-btn primary ${isActive ? 'active' : ''}`}
            onClick={() => {
              setActivePlanId(isActive ? null : plan.id)
              if (!isActive) setMapMode('waypoint')
            }}
          >
            {isActive ? '編集終了' : 'ポイント編集'}
          </button>

          <button
            className="action-btn record-btn"
            onClick={() => {
              addRecord(plan.id)
              setSidebarTab('records')
              addToast('飛行記録を作成しました', 'success')
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
            </svg>
            飛行記録
          </button>

          {/* エクスポートメニュー */}
          <div className="export-menu-wrap">
            <button
              className="action-btn export-btn"
              onClick={() => setShowExportMenu(!showExportMenu)}
              disabled={plan.waypoints.length === 0}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
              </svg>
              エクスポート
            </button>
            {showExportMenu && (
              <div className="export-menu">
                <button onClick={() => { exportAsJSON(plan); setShowExportMenu(false); addToast('JSONファイルをダウンロードしました', 'success') }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                  </svg>
                  JSON形式でダウンロード
                </button>
                <button onClick={() => { exportAsKML(plan); setShowExportMenu(false); addToast('KMLファイルをダウンロードしました', 'success') }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064"/>
                  </svg>
                  KML形式でダウンロード（Google Earth）
                </button>
              </div>
            )}
          </div>

          <button
            className="action-btn danger"
            onClick={() => {
              if (confirm('この計画を削除してもよいですか？')) {
                deletePlan(plan.id)
                addToast(`「${plan.name}」を削除しました`, 'info')
                onBack()
              }
            }}
          >
            この計画を削除
          </button>
        </section>
      </div>
    </>
  )
}

// ── 計画一覧 ──────────────────────────────────
export function PlansPanel() {
  const { plans, addPlan, activePlanId, setActivePlanId, addToast } = useDroneStore()
  const [editingId, setEditingId] = useState<string | null>(null)

  if (editingId) {
    const plan = plans.find((p) => p.id === editingId)
    if (plan) return <PlanDetail plan={plan} onBack={() => setEditingId(null)} />
  }

  return (
    <div className="panel">
      <div className="panel-header-row">
        <h2 className="panel-title">飛行計画</h2>
        <button className="panel-add-btn" onClick={() => {
          const plan = addPlan()
          setEditingId(plan.id)
          setActivePlanId(plan.id)
          addToast('新しい飛行計画を作成しました', 'success')
        }}>
          + 新しく作る
        </button>
      </div>
      {plans.length === 0 ? (
        <div className="panel-empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.2} style={{width:48,height:48,color:'var(--text-muted)',margin:'0 auto 12px'}}>
            <path strokeLinecap="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01m-.01 4h.01"/>
          </svg>
          <p>飛行計画がまだありません</p>
          <p className="panel-empty-hint">
            「新しく作る」ボタンを押して<br />
            ドローンの飛行ルートを設定しましょう
          </p>
        </div>
      ) : (
        <ul className="item-list plan-list">
          {plans.map((plan) => {
            const stats = calcStats(plan.waypoints)
            const overLimit = plan.waypoints.some((w) => w.altAGL > 150)
            return (
              <li
                key={plan.id}
                className={`plan-card ${activePlanId === plan.id ? 'active-plan' : ''}`}
                onClick={() => setEditingId(plan.id)}
              >
                <div className="plan-card-header">
                  <span className="plan-card-name">{plan.name}</span>
                  <span className={`status-badge status-${plan.status}`}>{STATUS_LABELS[plan.status]}</span>
                </div>
                <div className="plan-card-meta">
                  {plan.pilotName && <span>{plan.pilotName}</span>}
                  {plan.plannedDate && <span>{plan.plannedDate}</span>}
                  <span>{plan.waypoints.length}ポイント</span>
                  {stats && <span>{stats.distM >= 1000 ? `${(stats.distM/1000).toFixed(1)}km` : `${Math.round(stats.distM)}m`}</span>}
                  {stats && <span>約{fmtTime(stats.totalMs)}</span>}
                  {overLimit && <span className="plan-card-warn">150m超</span>}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
