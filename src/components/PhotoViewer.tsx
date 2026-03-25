import { useRef, useEffect, useState } from 'react'
import type { MediaItem } from '../types'

// ── 写真Diff比較ビューワー ──
function PhotoDiffViewer({ left, right, onClose }: {
  left: MediaItem
  right: MediaItem
  onClose: () => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [splitPos, setSplitPos] = useState(50)
  const dragging = useRef(false)

  const handleMove = (clientX: number) => {
    if (!dragging.current || !containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const x = ((clientX - rect.left) / rect.width) * 100
    setSplitPos(Math.max(5, Math.min(95, x)))
  }

  return (
    <div className="photo-diff-overlay">
      <div className="photo-diff-header">
        <button className="media-viewer-back" onClick={onClose}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width={16} height={16}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          戻る
        </button>
        <span style={{ color: '#f1f5f9', fontSize: 14, fontWeight: 500 }}>写真比較</span>
      </div>
      <div
        ref={containerRef}
        className="photo-diff-container"
        onMouseMove={(e) => handleMove(e.clientX)}
        onMouseUp={() => { dragging.current = false }}
        onMouseLeave={() => { dragging.current = false }}
        onTouchMove={(e) => handleMove(e.touches[0].clientX)}
        onTouchEnd={() => { dragging.current = false }}
      >
        {right.dataUrl && <img src={right.dataUrl} className="photo-diff-img photo-diff-right" alt={right.name} draggable={false} />}
        {left.dataUrl && (
          <img
            src={left.dataUrl}
            className="photo-diff-img photo-diff-left"
            alt={left.name}
            draggable={false}
            style={{ clipPath: `inset(0 ${100 - splitPos}% 0 0)` }}
          />
        )}
        <div
          className="photo-diff-divider"
          style={{ left: `${splitPos}%` }}
          onMouseDown={() => { dragging.current = true }}
          onTouchStart={() => { dragging.current = true }}
        >
          <div className="photo-diff-handle">
            <svg viewBox="0 0 24 24" fill="none" stroke="#334155" strokeWidth={2} width={16} height={16}>
              <path strokeLinecap="round" d="M9 18l-6-6 6-6M15 6l6 6-6 6" />
            </svg>
          </div>
        </div>
        <span className="photo-diff-label photo-diff-label-left">{left.name}</span>
        <span className="photo-diff-label photo-diff-label-right">{right.name}</span>
      </div>
    </div>
  )
}

// ── Diff対象選択 ──
function DiffTargetSelector({ current, photos, onSelect, onCancel }: {
  current: MediaItem
  photos: MediaItem[]
  onSelect: (item: MediaItem) => void
  onCancel: () => void
}) {
  const others = photos.filter((p) => p.id !== current.id)
  return (
    <div className="diff-target-selector">
      <div className="diff-target-header">
        <button className="media-viewer-back" onClick={onCancel}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width={16} height={16}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          キャンセル
        </button>
        <span style={{ color: '#f1f5f9', fontSize: 14, fontWeight: 500 }}>比較する写真を選択</span>
      </div>
      <div className="diff-target-grid">
        {others.map((p) => (
          <div key={p.id} className="diff-target-card" onClick={() => onSelect(p)}>
            {p.dataUrl && <img src={p.dataUrl} alt={p.name} draggable={false} />}
            <span>{p.name}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── PhotoViewer（スライドショー対応） ──
export function PhotoViewer({ item, photos, onNavigate }: {
  item: MediaItem
  photos: MediaItem[]
  onNavigate: (id: string) => void
}) {
  const [autoplay, setAutoplay] = useState(false)
  const [diffMode, setDiffMode] = useState(false)
  const [diffTarget, setDiffTarget] = useState<MediaItem | null>(null)
  const [selectingDiffTarget, setSelectingDiffTarget] = useState(false)
  const idx = photos.findIndex((p) => p.id === item.id)
  const hasPrev = idx > 0
  const hasNext = idx < photos.length - 1

  const idxRef = useRef(idx)
  const photosRef = useRef(photos)
  idxRef.current = idx
  photosRef.current = photos

  const goPrev = () => {
    const i = idxRef.current
    if (i > 0) onNavigate(photosRef.current[i - 1].id)
  }
  const goNext = () => {
    const i = idxRef.current
    const p = photosRef.current
    if (i < p.length - 1) onNavigate(p[i + 1].id)
  }

  // キーボードナビ
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') goPrev()
      else if (e.key === 'ArrowRight') goNext()
      else if (e.key === ' ') { e.preventDefault(); setAutoplay((v) => !v) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // 自動再生
  useEffect(() => {
    if (!autoplay) return
    const timer = setInterval(() => {
      const i = idxRef.current
      const p = photosRef.current
      if (i < p.length - 1) goNext()
      else setAutoplay(false)
    }, 3000)
    return () => clearInterval(timer)
  }, [autoplay]) // eslint-disable-line react-hooks/exhaustive-deps

  if (diffMode && diffTarget) {
    return <PhotoDiffViewer left={item} right={diffTarget} onClose={() => { setDiffMode(false); setDiffTarget(null) }} />
  }
  if (selectingDiffTarget) {
    return <DiffTargetSelector current={item} photos={photos} onSelect={(t) => { setDiffTarget(t); setSelectingDiffTarget(false); setDiffMode(true) }} onCancel={() => setSelectingDiffTarget(false)} />
  }

  return (
    <div className="media-viewer-photo">
      {photos.length > 1 && (
        <button className="slide-nav slide-nav-prev" onClick={goPrev} disabled={!hasPrev}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width={28} height={28}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      )}

      {item.dataUrl ? (
        <img src={item.dataUrl} alt={item.name} draggable={false} />
      ) : (
        <div className="media-viewer-placeholder">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} width={64} height={64}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
          </svg>
          <p>{item.name}</p>
        </div>
      )}

      {photos.length > 1 && (
        <button className="slide-nav slide-nav-next" onClick={goNext} disabled={!hasNext}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width={28} height={28}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      )}

      {photos.length > 1 && (
        <div className="slide-bar">
          <span className="slide-counter">{idx + 1} / {photos.length}</span>
          <button
            className={`slide-autoplay ${autoplay ? 'active' : ''}`}
            onClick={() => setAutoplay((v) => !v)}
            title="スライドショー (Space)"
          >
            {autoplay ? (
              <svg viewBox="0 0 24 24" fill="currentColor" width={16} height={16}>
                <rect x="6" y="4" width="4" height="16" rx="1" />
                <rect x="14" y="4" width="4" height="16" rx="1" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="currentColor" width={16} height={16}>
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>
          {photos.length >= 2 && (
            <button className="slide-compare-btn" onClick={() => setSelectingDiffTarget(true)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width={14} height={14}>
                <path strokeLinecap="round" d="M9 18l-6-6 6-6M15 6l6 6-6 6" />
              </svg>
              比較
            </button>
          )}
        </div>
      )}
    </div>
  )
}
