import { useRef } from 'react'
import { useDroneStore } from '../store/droneStore'
import type { MediaItem, MediaType } from '../types'
import { PhotoViewer } from './PhotoViewer'
import { VideoViewer } from './VideoViewer'
import { ModelViewer3D } from './ModelViewer3D'

// ── タイプバッジ色 ──
const BADGE_COLORS: Record<MediaType, string> = {
  photo: '#3b82f6',
  panorama: '#f59e0b',
  video: '#ef4444',
  model3d: '#8b5cf6',
}
const BADGE_LABELS: Record<MediaType, string> = {
  photo: '写真',
  panorama: 'パノラマ',
  video: '動画',
  model3d: '3Dモデル',
}

function TypeBadge({ type }: { type: MediaType }) {
  return (
    <span
      className="media-viewer-badge"
      style={{ background: BADGE_COLORS[type] }}
    >
      {BADGE_LABELS[type]}
    </span>
  )
}

// ── フォーマットユーティリティ ──
function formatSize(kb?: number): string {
  if (!kb) return '—'
  if (kb >= 1000) return `${(kb / 1000).toFixed(1)} MB`
  return `${kb} KB`
}

function formatDuration(sec?: number): string {
  if (!sec) return '—'
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

// ── PanoramaViewer ──
function PanoramaViewer({ item }: { item: MediaItem }) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)
  const startX = useRef(0)
  const scrollLeftVal = useRef(0)

  const onMouseDown = (e: React.MouseEvent) => {
    dragging.current = true
    startX.current = e.pageX
    scrollLeftVal.current = scrollRef.current?.scrollLeft ?? 0
  }
  const onMouseMove = (e: React.MouseEvent) => {
    if (!dragging.current || !scrollRef.current) return
    scrollRef.current.scrollLeft = scrollLeftVal.current - (e.pageX - startX.current)
  }
  const onMouseUp = () => { dragging.current = false }

  return (
    <div
      ref={scrollRef}
      className="media-viewer-panorama-scroll"
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
    >
      {item.dataUrl && (
        <img src={item.dataUrl} alt={item.name} draggable={false} />
      )}
      <span className="media-viewer-panorama-badge">360°</span>
    </div>
  )
}

// ── InfoPanel ──
function InfoPanel({ item }: { item: MediaItem }) {
  return (
    <div className="media-viewer-info">
      <h3 className="media-viewer-info-title">ファイル情報</h3>

      <div className="media-viewer-info-row">
        <span className="media-viewer-info-label">ファイル名</span>
        <span className="media-viewer-info-value">{item.name}</span>
      </div>

      <div className="media-viewer-info-row">
        <span className="media-viewer-info-label">タイプ</span>
        <span className="media-viewer-info-value">
          <TypeBadge type={item.type} />
        </span>
      </div>

      {(item.lon != null && item.lat != null) && (
        <div className="media-viewer-info-row">
          <span className="media-viewer-info-label">撮影位置</span>
          <span className="media-viewer-info-value media-viewer-info-coords">
            <span>経度: {item.lon.toFixed(4)}</span>
            <span>緯度: {item.lat.toFixed(4)}</span>
            {item.altM != null && <span>高度: {item.altM.toFixed(0)} m</span>}
          </span>
        </div>
      )}

      <div className="media-viewer-info-row">
        <span className="media-viewer-info-label">サイズ</span>
        <span className="media-viewer-info-value">{formatSize(item.sizeKB)}</span>
      </div>

      {item.duration != null && (
        <div className="media-viewer-info-row">
          <span className="media-viewer-info-label">再生時間</span>
          <span className="media-viewer-info-value">{formatDuration(item.duration)}</span>
        </div>
      )}

      {item.notes && (
        <div className="media-viewer-info-row">
          <span className="media-viewer-info-label">メモ</span>
          <span className="media-viewer-info-value">{item.notes}</span>
        </div>
      )}
    </div>
  )
}

// ── MediaViewer（メインエクスポート） ──
export function MediaViewer() {
  const { media, selectedMediaId, setSelectedMediaId } = useDroneStore()
  const item = media.find((m) => m.id === selectedMediaId)
  if (!item) return null

  const photos = media.filter((m) => m.type === 'photo')

  return (
    <div className="media-viewer-overlay">
      {/* ヘッダー */}
      <header className="media-viewer-header">
        <button
          className="media-viewer-back"
          onClick={() => setSelectedMediaId(null)}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width={20} height={20}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          戻る
        </button>
        <span className="media-viewer-header-name">{item.name}</span>
        <TypeBadge type={item.type} />
      </header>

      {/* ボディ */}
      <div className="media-viewer-body">
        <div className="media-viewer-main">
          {item.type === 'photo' && (
            <PhotoViewer item={item} photos={photos} onNavigate={setSelectedMediaId} />
          )}
          {item.type === 'panorama' && <PanoramaViewer item={item} />}
          {item.type === 'video' && <VideoViewer item={item} />}
          {item.type === 'model3d' && <ModelViewer3D item={item} />}
        </div>
        <InfoPanel item={item} />
      </div>
    </div>
  )
}
