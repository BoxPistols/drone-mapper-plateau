import { useRef } from 'react'
import { useDroneStore } from '../../store/droneStore'

export function MediaPanel() {
  const { media, records, plans, addMedia, deleteMedia } = useDroneStore()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFiles = (files: FileList | null) => {
    if (!files) return
    Array.from(files).forEach((file) => {
      const type = file.type.startsWith('video') ? 'video' : 'photo'
      const reader = new FileReader()
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string | undefined
        addMedia({
          name: file.name,
          type,
          timestamp: new Date().toISOString(),
          sizeKB: Math.round(file.size / 1024),
          dataUrl: type === 'photo' ? dataUrl : undefined,
        })
      }
      reader.readAsDataURL(file)
    })
  }

  const grouped = media.reduce<Record<string, typeof media>>((acc, m) => {
    const key = m.recordId ?? m.planId ?? '未分類'
    ;(acc[key] ??= []).push(m)
    return acc
  }, {})

  const getGroupName = (key: string) => {
    if (key === '未分類') return '未分類'
    const rec = records.find((r) => r.id === key)
    if (rec) return rec.name
    const plan = plans.find((p) => p.id === key)
    if (plan) return plan.name
    return key
  }

  return (
    <div className="panel">
      <div className="panel-header-row">
        <h2 className="panel-title">撮影データ ({media.length})</h2>
        <button className="panel-add-btn" onClick={() => fileInputRef.current?.click()}>
          + 追加
        </button>
        <input
          ref={fileInputRef} type="file" hidden multiple
          accept="image/*,video/*"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {/* ドロップエリア */}
      <div
        className="media-dropzone"
        onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('drag-over') }}
        onDragLeave={(e) => e.currentTarget.classList.remove('drag-over')}
        onDrop={(e) => {
          e.preventDefault()
          e.currentTarget.classList.remove('drag-over')
          handleFiles(e.dataTransfer.files)
        }}
        onClick={() => fileInputRef.current?.click()}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="17 8 12 3 7 8"/>
          <line x1="12" y1="3" x2="12" y2="15"/>
        </svg>
        <span>クリックまたはドロップで追加</span>
        <span className="dropzone-hint">写真・動画ファイル対応</span>
      </div>

      {media.length === 0 ? (
        <div className="panel-empty-state">
          <p className="panel-empty-hint">撮影した写真・動画をアップロードして<br />飛行記録と紐づけて管理できます</p>
        </div>
      ) : (
        Object.entries(grouped).map(([key, items]) => (
          <section key={key} className="panel-section">
            <h3 className="panel-section-title">{getGroupName(key)} ({items.length})</h3>
            <div className="media-grid">
              {items.map((item) => (
                <div key={item.id} className="media-card">
                  {item.dataUrl ? (
                    <img src={item.dataUrl} alt={item.name} className="media-thumb" />
                  ) : (
                    <div className="media-thumb media-thumb-video">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                        <path d="M15 10l4.553-2.069A1 1 0 0 1 21 8.876v6.248a1 1 0 0 1-1.447.895L15 14M3 8a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8z"/>
                      </svg>
                    </div>
                  )}
                  <div className="media-card-info">
                    <span className="media-card-name" title={item.name}>{item.name}</span>
                    <div className="media-card-meta">
                      <span className={`media-type-badge ${item.type}`}>
                        {item.type === 'photo' ? '📷' : '🎥'}
                      </span>
                      {item.sizeKB && <span>{item.sizeKB < 1024 ? `${item.sizeKB}KB` : `${(item.sizeKB / 1024).toFixed(1)}MB`}</span>}
                    </div>
                  </div>
                  <button className="media-delete" onClick={() => deleteMedia(item.id)} title="削除">×</button>
                </div>
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  )
}
