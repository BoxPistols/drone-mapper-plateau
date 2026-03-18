import { useState } from 'react'
import { useDroneStore } from '../../store/droneStore'
import type { FlightPlan, Waypoint, WaypointAction, PlanStatus } from '../../types'

const STATUS_LABELS: Record<PlanStatus, string> = {
  draft:     '草稿',
  approved:  '承認済',
  completed: '完了',
}

const ACTION_LABELS: Record<WaypointAction, string> = {
  none:        '無し',
  photo:       '撮影',
  video_start: '録画開始',
  video_stop:  '録画停止',
  hover:       'ホバリング',
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
        <button className="back-btn" onClick={onBack}>← 一覧</button>
        <span className={`status-badge status-${plan.status}`}>{STATUS_LABELS[plan.status]}</span>
      </div>

      {/* 基本情報 */}
      <section className="panel-section">
        <input
          className="plan-name-input"
          value={plan.name}
          onChange={(e) => updatePlan(plan.id, { name: e.target.value })}
          placeholder="計画名"
        />
        <div className="plan-meta-grid">
          <label>パイロット
            <input value={plan.pilotName ?? ''} placeholder="氏名"
              onChange={(e) => updatePlan(plan.id, { pilotName: e.target.value })} />
          </label>
          <label>機体
            <input value={plan.droneModel ?? ''} placeholder="DJI Mini 4 Pro等"
              onChange={(e) => updatePlan(plan.id, { droneModel: e.target.value })} />
          </label>
          <label>計画日
            <input type="date" value={plan.plannedDate ?? ''}
              onChange={(e) => updatePlan(plan.id, { plannedDate: e.target.value })} />
          </label>
          <label>最大高度
            <div className="input-unit">
              <input type="number" value={plan.maxAltAGL} min={0} max={150}
                onChange={(e) => updatePlan(plan.id, { maxAltAGL: Number(e.target.value) })} />
              <span>m AGL</span>
            </div>
          </label>
          <label>ステータス
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
          placeholder="備考・目的"
          rows={2}
          onChange={(e) => updatePlan(plan.id, { description: e.target.value })}
        />
      </section>

      {/* ウェイポイント */}
      <section className="panel-section">
        <div className="panel-section-header">
          <h3 className="panel-section-title">ウェイポイント ({plan.waypoints.length})</h3>
          <button
            className={`panel-tool-btn ${isActive && mapMode === 'waypoint' ? 'active' : ''}`}
            onClick={() => {
              setActivePlanId(plan.id)
              setMapMode(mapMode === 'waypoint' && isActive ? 'select' : 'waypoint')
            }}
          >
            + 追加
          </button>
        </div>
        {plan.waypoints.length === 0 ? (
          <p className="panel-empty">「+追加」でマップをクリックしてWPを配置</p>
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
          className={`action-btn primary ${isActive ? 'active' : ''}`}
          onClick={() => {
            setActivePlanId(isActive ? null : plan.id)
            if (!isActive) setMapMode('waypoint')
          }}
        >
          {isActive ? '編集終了' : 'マップ編集'}
        </button>
        <button
          className={`action-btn sim-btn ${isSimulating ? 'active' : ''}`}
          disabled={plan.waypoints.length < 2}
          onClick={() => {
            if (isSimulating) return
            startSimulation(plan.id)
          }}
        >
          ▶ シミュレート
        </button>
        <button
          className="action-btn record-btn"
          onClick={() => {
            addRecord(plan.id)
            setSidebarTab('records')
          }}
        >
          + 飛行記録作成
        </button>
        <button
          className="action-btn danger"
          onClick={() => { if (confirm('この計画を削除しますか？')) { deletePlan(plan.id); onBack() } }}
        >
          削除
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
  return (
    <li className="item-row wp-row">
      <button className="item-expand" onClick={() => setOpen(!open)}>
        <span className="wp-num">{idx + 1}</span>
        <span className="item-name">WP{idx + 1}</span>
        <span className="wp-alt">{wp.altAGL}m</span>
        <span className="wp-speed">{wp.speedMS}m/s</span>
      </button>
      <button className="item-delete" onClick={onDelete}>×</button>
      {open && (
        <div className="item-detail wp-detail">
          <div className="wp-detail-grid">
            <label>高度(AGL)
              <div className="input-unit">
                <input type="number" min={10} max={150} value={wp.altAGL}
                  onChange={(e) => onUpdate({ altAGL: Number(e.target.value) })} />
                <span>m</span>
              </div>
            </label>
            <label>速度
              <div className="input-unit">
                <input type="number" min={1} max={20} value={wp.speedMS}
                  onChange={(e) => onUpdate({ speedMS: Number(e.target.value) })} />
                <span>m/s</span>
              </div>
            </label>
            <label>アクション
              <select value={wp.action} onChange={(e) => onUpdate({ action: e.target.value as WaypointAction })}>
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
          + 新規作成
        </button>
      </div>
      {plans.length === 0 ? (
        <div className="panel-empty-state">
          <p>飛行計画がありません</p>
          <p className="panel-empty-hint">「新規作成」でウェイポイントを設定し<br />3Dシミュレーションを実行できます</p>
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
                {plan.pilotName && <span>{plan.pilotName}</span>}
                {plan.plannedDate && <span>{plan.plannedDate}</span>}
                <span>{plan.waypoints.length} WP</span>
                <span>最大 {plan.maxAltAGL}m</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
