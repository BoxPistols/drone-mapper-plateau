import { useState } from 'react'
import { useDroneStore } from '../../store/droneStore'
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

interface PlanDetailProps {
  plan: FlightPlan
  onBack: () => void
}

function PlanDetail({ plan, onBack }: PlanDetailProps) {
  const {
    updatePlan, deletePlan, addRecord,
    mapMode, setMapMode, setActivePlanId, activePlanId,
    updateWaypoint, deleteWaypoint, startSimulation,
    setSidebarTab, simulation,
  } = useDroneStore()

  const isActive = activePlanId === plan.id
  const isSimulating = simulation?.planId === plan.id

  return (
    <div className="panel plan-detail">
      <div className="panel-back">
        <button className="back-btn" onClick={onBack}>← 一覧へ戻る</button>
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
          <label>最大飛行高さ
            <div className="input-unit">
              <input type="number" value={plan.maxAltAGL} min={0} max={150}
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
          placeholder="メモ・目的など"
          rows={2}
          onChange={(e) => updatePlan(plan.id, { description: e.target.value })}
        />
      </section>

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
            {isActive && mapMode === 'waypoint' ? '✓ 追加中' : '+ 地図で追加'}
          </button>
        </div>
        {plan.waypoints.length === 0 ? (
          <div className="panel-empty-guided">
            <div className="guided-step-icon">📍</div>
            <p>「地図で追加」ボタンを押してから<br />地図上をクリックすると<br />通過ポイントが追加されます</p>
          </div>
        ) : (
          <ul className="item-list wp-list">
            {plan.waypoints.map((wp, idx) => (
              <WaypointRow
                key={wp.id} wp={wp} idx={idx}
                planId={plan.id}
                onUpdate={(patch) => updateWaypoint(plan.id, wp.id, patch)}
                onDelete={() => deleteWaypoint(plan.id, wp.id)}
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
          onClick={() => {
            if (isSimulating) return
            startSimulation(plan.id)
          }}
          title={plan.waypoints.length < 2 ? '通過ポイントを2つ以上追加してください' : ''}
        >
          {plan.waypoints.length < 2
            ? '▶ まず通過ポイントを追加'
            : '▶ 試しに飛ばしてみる'}
        </button>
        <button
          className={`action-btn primary ${isActive ? 'active' : ''}`}
          onClick={() => {
            setActivePlanId(isActive ? null : plan.id)
            if (!isActive) setMapMode('waypoint')
          }}
        >
          {isActive ? '編集を終わる' : '通過ポイントを編集'}
        </button>
        <button
          className="action-btn record-btn"
          onClick={() => {
            addRecord(plan.id)
            setSidebarTab('records')
          }}
        >
          + 飛行記録をつける
        </button>
        <button
          className="action-btn danger"
          onClick={() => { if (confirm('この計画を削除してもよいですか？')) { deletePlan(plan.id); onBack() } }}
        >
          この計画を削除
        </button>
      </section>
    </div>
  )
}

function WaypointRow({
  wp, idx, onUpdate, onDelete,
}: {
  wp: Waypoint; idx: number; planId?: string
  onUpdate: (p: Partial<Waypoint>) => void
  onDelete: () => void
}) {
  const [open, setOpen] = useState(false)

  const flyToWp = () => {
    window.dispatchEvent(new CustomEvent('cesium:flyTo', { detail: { lat: wp.lat, lon: wp.lon } }))
  }

  return (
    <li className="item-row wp-row">
      <button className="item-expand" onClick={() => setOpen(!open)}>
        <span className="wp-num" onClick={(e) => { e.stopPropagation(); flyToWp() }} title="地図で見る">
          {idx + 1}
        </span>
        <span className="item-name">ポイント {idx + 1}</span>
        <span className="wp-alt">{wp.altAGL}m</span>
        <span className="wp-speed">{wp.speedMS}m/s</span>
      </button>
      <button className="item-delete" onClick={onDelete} title="このポイントを削除">×</button>
      {open && (
        <div className="item-detail wp-detail">
          <div className="wp-detail-grid">
            <label>地上からの高さ
              <div className="input-unit">
                <input type="number" min={10} max={150} value={wp.altAGL}
                  onChange={(e) => onUpdate({ altAGL: Number(e.target.value) })} />
                <span>m</span>
              </div>
            </label>
            <label>飛ぶ速さ
              <div className="input-unit">
                <input type="number" min={1} max={20} value={wp.speedMS}
                  onChange={(e) => onUpdate({ speedMS: Number(e.target.value) })} />
                <span>m/s</span>
              </div>
            </label>
            <label>このポイントでの動作
              <select value={wp.action} onChange={(e) => onUpdate({ action: e.target.value as WaypointAction })}>
                {Object.entries(ACTION_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </label>
            {wp.action === 'hover' && (
              <label>停止する時間
                <div className="input-unit">
                  <input type="number" min={1} value={wp.hoverSec ?? 5}
                    onChange={(e) => onUpdate({ hoverSec: Number(e.target.value) })} />
                  <span>秒</span>
                </div>
              </label>
            )}
          </div>
          <div className="item-coords">{wp.lat.toFixed(5)}, {wp.lon.toFixed(5)}</div>
        </div>
      )}
    </li>
  )
}

export function PlansPanel() {
  const { plans, addPlan, activePlanId, setActivePlanId } = useDroneStore()
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
        }}>
          + 新しく作る
        </button>
      </div>
      {plans.length === 0 ? (
        <div className="panel-empty-state">
          <div className="guided-step-icon">📋</div>
          <p>飛行計画がまだありません</p>
          <p className="panel-empty-hint">
            「新しく作る」ボタンを押して<br />
            ドローンの飛行ルートを設定しましょう
          </p>
        </div>
      ) : (
        <ul className="item-list plan-list">
          {plans.map((plan) => (
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
                {plan.pilotName && <span>👤 {plan.pilotName}</span>}
                {plan.plannedDate && <span>📅 {plan.plannedDate}</span>}
                <span>📍 {plan.waypoints.length}ポイント</span>
                <span>↕ 最大{plan.maxAltAGL}m</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
