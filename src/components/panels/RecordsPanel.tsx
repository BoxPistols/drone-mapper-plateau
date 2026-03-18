import { useState } from 'react'
import { useDroneStore } from '../../store/droneStore'
import type { FlightRecord, RecordStatus } from '../../types'

const STATUS_LABELS: Record<RecordStatus, string> = {
  planned:     '予定',
  in_progress: '飛行中',
  completed:   '完了',
  cancelled:   'キャンセル',
}

const WEATHER_OPTIONS = ['晴れ', '曇り', '薄曇り', '小雨', '強風注意']

export function RecordsPanel() {
  const { records, plans, addRecord, updateRecord, deleteRecord } = useDroneStore()
  const [editing, setEditing] = useState<string | null>(null)

  const editingRecord = records.find((r) => r.id === editing)

  if (editing && editingRecord) {
    return (
      <RecordEditor
        record={editingRecord}
        plans={plans.map((p) => ({ id: p.id, name: p.name }))}
        onUpdate={(patch) => updateRecord(editing, patch)}
        onDelete={() => { deleteRecord(editing); setEditing(null) }}
        onBack={() => setEditing(null)}
      />
    )
  }

  return (
    <div className="panel">
      <div className="panel-header-row">
        <h2 className="panel-title">飛行記録</h2>
        <button className="panel-add-btn" onClick={() => {
          const r = addRecord()
          setEditing(r.id)
        }}>
          + 新規記録
        </button>
      </div>
      {records.length === 0 ? (
        <div className="panel-empty-state">
          <p>飛行記録がありません</p>
          <p className="panel-empty-hint">飛行後に日時・パイロット・状況を<br />記録として保存できます</p>
        </div>
      ) : (
        <ul className="item-list">
          {records.map((rec) => {
            const plan = rec.planId ? plans.find((p) => p.id === rec.planId) : null
            return (
              <li key={rec.id} className="record-card" onClick={() => setEditing(rec.id)}>
                <div className="record-card-header">
                  <span className="record-card-name">{rec.name}</span>
                  <span className={`status-badge status-${rec.status}`}>{STATUS_LABELS[rec.status]}</span>
                </div>
                <div className="record-card-meta">
                  <span>{rec.date}</span>
                  {rec.pilot && <span>{rec.pilot}</span>}
                  {rec.weather && <span>{rec.weather}</span>}
                  {plan && <span className="record-plan-ref">{plan.name}</span>}
                  {rec.startTime && rec.endTime && (
                    <span>{rec.startTime} — {rec.endTime}</span>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

function RecordEditor({
  record, plans, onUpdate, onDelete, onBack,
}: {
  record: FlightRecord
  plans: { id: string; name: string }[]
  onUpdate: (p: Partial<FlightRecord>) => void
  onDelete: () => void
  onBack: () => void
}) {
  return (
    <div className="panel">
      <div className="panel-back">
        <button className="back-btn" onClick={onBack}>← 一覧</button>
        <span className={`status-badge status-${record.status}`}>{STATUS_LABELS[record.status]}</span>
      </div>

      <section className="panel-section">
        <input
          className="plan-name-input"
          value={record.name}
          onChange={(e) => onUpdate({ name: e.target.value })}
          placeholder="記録名"
        />
        <div className="plan-meta-grid">
          <label>パイロット
            <input value={record.pilot} onChange={(e) => onUpdate({ pilot: e.target.value })} />
          </label>
          <label>飛行日
            <input type="date" value={record.date} onChange={(e) => onUpdate({ date: e.target.value })} />
          </label>
          <label>開始時刻
            <input type="time" value={record.startTime ?? ''} onChange={(e) => onUpdate({ startTime: e.target.value })} />
          </label>
          <label>終了時刻
            <input type="time" value={record.endTime ?? ''} onChange={(e) => onUpdate({ endTime: e.target.value })} />
          </label>
          <label>天候
            <select value={record.weather ?? ''} onChange={(e) => onUpdate({ weather: e.target.value })}>
              <option value="">—</option>
              {WEATHER_OPTIONS.map((w) => <option key={w} value={w}>{w}</option>)}
            </select>
          </label>
          <label>最大風速
            <div className="input-unit">
              <input type="number" min={0} value={record.windMS ?? ''}
                onChange={(e) => onUpdate({ windMS: e.target.value ? Number(e.target.value) : undefined })} />
              <span>m/s</span>
            </div>
          </label>
          <label>実測高度
            <div className="input-unit">
              <input type="number" min={0} value={record.maxAltActual ?? ''}
                onChange={(e) => onUpdate({ maxAltActual: e.target.value ? Number(e.target.value) : undefined })} />
              <span>m</span>
            </div>
          </label>
          <label>飛行距離
            <div className="input-unit">
              <input type="number" min={0} value={record.distanceM ?? ''}
                onChange={(e) => onUpdate({ distanceM: e.target.value ? Number(e.target.value) : undefined })} />
              <span>m</span>
            </div>
          </label>
          <label>関連計画
            <select value={record.planId ?? ''} onChange={(e) => onUpdate({ planId: e.target.value || undefined })}>
              <option value="">—</option>
              {plans.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </label>
          <label>ステータス
            <select value={record.status} onChange={(e) => onUpdate({ status: e.target.value as RecordStatus })}>
              {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </label>
        </div>
        <textarea
          className="plan-desc"
          value={record.notes ?? ''}
          placeholder="特記事項・備考"
          rows={3}
          onChange={(e) => onUpdate({ notes: e.target.value })}
        />
      </section>

      <section className="panel-section plan-actions">
        <button className="action-btn danger" onClick={() => { if (confirm('削除しますか？')) onDelete() }}>
          削除
        </button>
      </section>
    </div>
  )
}
