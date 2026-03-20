import { useState } from 'react'
import type { FlightPlan } from '../types'

interface Props {
  plan: FlightPlan
  onConfirm: () => void
  onCancel: () => void
}

const ITEMS = [
  { id: 'battery',  label: 'バッテリー残量を確認した（80%以上）' },
  { id: 'weather',  label: '気象条件を確認した（風速5m/s以下、視界良好）' },
  { id: 'notam',    label: 'NOTAM・飛行禁止情報を確認した' },
  { id: 'area',     label: '飛行エリアに人・障害物がないことを確認した' },
  { id: 'maintain', label: '機体の整備・点検を完了した' },
  { id: 'permit',   label: '必要な許可・申請が完了している（DID地区等）' },
]

export function PreflightChecklist({ plan, onConfirm, onCancel }: Props) {
  const [checked, setChecked] = useState<Record<string, boolean>>({})

  const allChecked = ITEMS.every((item) => checked[item.id])
  const maxAlt = Math.max(...plan.waypoints.map((w) => w.altAGL), 0)
  const overLimit = maxAlt > 150

  const toggle = (id: string) =>
    setChecked((prev) => ({ ...prev, [id]: !prev[id] }))

  return (
    <div className="checklist-overlay">
      <div className="checklist-modal">
        <div className="checklist-header">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          <div>
            <h2>飛行前チェックリスト</h2>
            <p className="checklist-plan-name">{plan.name}</p>
          </div>
        </div>

        {overLimit && (
          <div className="checklist-warning">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
            </svg>
            <span>最大高度 <strong>{maxAlt}m</strong> は航空法の150m制限を超えています。国土交通省の許可が必要です。</span>
          </div>
        )}

        <div className="checklist-plan-stats">
          <span>ポイント数: <b>{plan.waypoints.length}</b></span>
          <span>最大高度: <b className={overLimit ? 'text-warn' : ''}>{maxAlt}m</b></span>
          {plan.pilotName && <span>パイロット: <b>{plan.pilotName}</b></span>}
          {plan.droneModel && <span>機体: <b>{plan.droneModel}</b></span>}
        </div>

        <ul className="checklist-items">
          {ITEMS.map((item) => (
            <li key={item.id} className={`checklist-item ${checked[item.id] ? 'checked' : ''}`}>
              <label>
                <input
                  type="checkbox"
                  checked={!!checked[item.id]}
                  onChange={() => toggle(item.id)}
                />
                <span className="checklist-check-icon">
                  {checked[item.id]
                    ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" d="M5 13l4 4L19 7"/></svg>
                    : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><rect x="3" y="3" width="18" height="18" rx="3"/></svg>
                  }
                </span>
                <span>{item.label}</span>
              </label>
            </li>
          ))}
        </ul>

        <div className="checklist-progress">
          <div className="checklist-progress-bar">
            <div
              className="checklist-progress-fill"
              style={{ width: `${(Object.values(checked).filter(Boolean).length / ITEMS.length) * 100}%` }}
            />
          </div>
          <span>{Object.values(checked).filter(Boolean).length} / {ITEMS.length} 完了</span>
        </div>

        <div className="checklist-actions">
          <button className="checklist-cancel-btn" onClick={onCancel}>キャンセル</button>
          <button
            className="checklist-confirm-btn"
            disabled={!allChecked}
            onClick={onConfirm}
            title={!allChecked ? '全項目を確認してください' : ''}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"/>
              <path strokeLinecap="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            シミュレーション開始
          </button>
        </div>
      </div>
    </div>
  )
}
