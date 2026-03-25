import { useRef, useEffect, useState } from 'react'
import { useDroneStore } from '../store/droneStore'
import type { MediaItem, MediaType } from '../types'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

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
function PhotoViewer({ item, photos, onNavigate }: {
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

  // ref で最新値を保持（useEffect のクロージャ問題を回避）
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
      {/* 前へ */}
      {photos.length > 1 && (
        <button className="slide-nav slide-nav-prev" onClick={goPrev} disabled={!hasPrev}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width={28} height={28}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      )}

      {/* 画像 */}
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

      {/* 次へ */}
      {photos.length > 1 && (
        <button className="slide-nav slide-nav-next" onClick={goNext} disabled={!hasNext}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width={28} height={28}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      )}

      {/* 下部バー: カウンター + 自動再生 */}
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

// ── VideoViewer ──
function VideoViewer({ item }: { item: MediaItem }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [videoDuration, setVideoDuration] = useState(item.duration ?? 0)
  const [videoSrc, setVideoSrc] = useState<string | null>(null)
  const blobUrlRef = useRef<string | null>(null)

  // プロシージャル動画生成
  useEffect(() => {
    if (item.videoUrl !== 'procedural') {
      if (item.videoUrl) setVideoSrc(item.videoUrl)
      return
    }
    // Canvas APIで5秒のドローンHUD風動画を生成
    const canvas = document.createElement('canvas')
    canvas.width = 640
    canvas.height = 360
    const ctx = canvas.getContext('2d')!
    const stream = canvas.captureStream(24)
    const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' })
    const chunks: Blob[] = []
    recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data) }
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/webm' })
      const url = URL.createObjectURL(blob)
      blobUrlRef.current = url
      setVideoSrc(url)
    }
    recorder.start()
    let frame = 0
    const totalFrames = 5 * 24 // 5秒 x 24fps
    const draw = () => {
      const t = frame / totalFrames
      // 空のグラデーション背景
      const grad = ctx.createLinearGradient(0, 0, 0, 360)
      grad.addColorStop(0, `hsl(${200 + t * 20}, 60%, ${25 + t * 10}%)`)
      grad.addColorStop(1, `hsl(${140 + t * 30}, 40%, ${20 + t * 5}%)`)
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, 640, 360)

      // パースペクティブグリッド（地面）
      ctx.strokeStyle = `rgba(100, 200, 255, ${0.15 + t * 0.1})`
      ctx.lineWidth = 0.5
      for (let i = 0; i < 20; i++) {
        const y = 180 + i * 12
        const spread = (i / 20) * 320
        ctx.beginPath()
        ctx.moveTo(320 - spread, y)
        ctx.lineTo(320 + spread, y)
        ctx.stroke()
      }
      for (let i = -10; i <= 10; i++) {
        const x = 320 + i * 30
        ctx.beginPath()
        ctx.moveTo(320, 180)
        ctx.lineTo(x, 360)
        ctx.stroke()
      }

      // HUDオーバーレイ
      ctx.fillStyle = 'rgba(0,0,0,0.4)'
      ctx.fillRect(10, 10, 180, 80)
      ctx.fillRect(450, 10, 180, 80)
      ctx.fillStyle = '#60a5fa'
      ctx.font = '11px monospace'
      ctx.fillText('ALT', 20, 30)
      ctx.fillText('SPD', 20, 50)
      ctx.fillText('HDG', 20, 70)
      ctx.fillStyle = '#e2e8f0'
      ctx.font = '13px monospace'
      ctx.fillText(`${(50 + t * 50).toFixed(0)} m`, 60, 30)
      ctx.fillText(`${(5 + t * 3).toFixed(1)} m/s`, 60, 50)
      ctx.fillText(`${(45 + t * 90).toFixed(0)}°`, 60, 70)
      // 右側
      ctx.fillStyle = '#60a5fa'
      ctx.font = '11px monospace'
      ctx.fillText('LAT', 460, 30)
      ctx.fillText('LON', 460, 50)
      ctx.fillText('BAT', 460, 70)
      ctx.fillStyle = '#e2e8f0'
      ctx.font = '13px monospace'
      ctx.fillText('35.7130°N', 500, 30)
      ctx.fillText('139.7980°E', 500, 50)
      ctx.fillStyle = t < 0.7 ? '#22c55e' : '#f59e0b'
      ctx.fillText(`${(98 - t * 15).toFixed(0)}%`, 500, 70)

      // 十字カーソル
      ctx.strokeStyle = 'rgba(255,255,255,0.5)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(310, 180); ctx.lineTo(330, 180)
      ctx.moveTo(320, 170); ctx.lineTo(320, 190)
      ctx.stroke()

      // REC表示
      ctx.fillStyle = '#ef4444'
      ctx.beginPath()
      ctx.arc(580, 340, 5, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#e2e8f0'
      ctx.font = '12px monospace'
      ctx.fillText('REC', 592, 344)

      // タイムコード
      const sec = Math.floor(frame / 24)
      const fr = frame % 24
      ctx.fillText(`00:${String(sec).padStart(2, '0')}:${String(fr).padStart(2, '0')}`, 20, 344)

      frame++
      if (frame < totalFrames) requestAnimationFrame(draw)
      else recorder.stop()
    }
    draw()
    return () => {
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current)
    }
  }, [item.videoUrl])

  const togglePlay = () => {
    if (!videoRef.current) return
    if (playing) videoRef.current.pause()
    else videoRef.current.play()
    setPlaying(!playing)
  }

  // videoSrc がある場合はHTML5プレイヤー
  if (videoSrc) {
    return (
      <div className="media-viewer-video">
        <div className="media-viewer-video-player">
          <video
            ref={videoRef}
            src={videoSrc}
            poster={item.dataUrl}
            onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
            onLoadedMetadata={(e) => setVideoDuration(e.currentTarget.duration)}
            onEnded={() => setPlaying(false)}
            onClick={togglePlay}
          />
          {!playing && (
            <button className="video-play-overlay" onClick={togglePlay}>
              <svg viewBox="0 0 80 80" width={80} height={80}>
                <circle cx={40} cy={40} r={38} fill="rgba(0,0,0,.4)" stroke="rgba(255,255,255,.4)" strokeWidth={2} />
                <polygon points="32,22 62,40 32,58" fill="rgba(255,255,255,.9)" />
              </svg>
            </button>
          )}
        </div>
        <div className="video-controls">
          <button className="video-ctrl-btn" onClick={togglePlay}>
            {playing ? (
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
          <input
            type="range"
            className="video-seekbar"
            min={0} max={videoDuration || 1} step={0.1}
            value={currentTime}
            onChange={(e) => {
              const t = parseFloat(e.target.value)
              if (videoRef.current) videoRef.current.currentTime = t
              setCurrentTime(t)
            }}
          />
          <span className="video-time">
            {formatDuration(Math.floor(currentTime))} / {formatDuration(Math.floor(videoDuration))}
          </span>
        </div>
      </div>
    )
  }

  // フォールバック: 従来のプレースホルダー
  return (
    <div className="media-viewer-video">
      <div className="media-viewer-video-screen">
        <svg className="media-viewer-video-play" viewBox="0 0 80 80" width={80} height={80}>
          <circle cx={40} cy={40} r={38} fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.4)" strokeWidth={2} />
          <polygon points="32,22 62,40 32,58" fill="rgba(255,255,255,0.8)" />
        </svg>
        <p className="media-viewer-video-name">{item.name}</p>
        <p className="media-viewer-video-duration">{formatDuration(item.duration)}</p>
      </div>
      <div className="media-viewer-video-progress">
        <div className="media-viewer-video-progress-bar" style={{ width: '0%' }} />
      </div>
    </div>
  )
}

// ── ModelViewer3D ──
function ModelViewer3D({ item: _item }: { item: MediaItem }) {
  const mountRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = mountRef.current
    if (!container) return

    // シーン
    const scene = new THREE.Scene()
    scene.background = new THREE.Color('#0f172a')
    scene.fog = new THREE.Fog('#0f172a', 30, 80)

    // カメラ
    const camera = new THREE.PerspectiveCamera(
      50,
      container.clientWidth / container.clientHeight,
      0.1,
      200
    )
    camera.position.set(15, 12, 15)

    // レンダラー
    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(container.clientWidth, container.clientHeight)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    container.appendChild(renderer.domElement)

    // コントロール
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.autoRotate = true
    controls.autoRotateSpeed = 1.5
    controls.enableDamping = true
    controls.dampingFactor = 0.05
    controls.target.set(0, 3, 0)

    // グリッド
    const grid = new THREE.GridHelper(40, 40, '#334155', '#1e293b')
    scene.add(grid)

    // ライト
    const ambient = new THREE.AmbientLight('#94a3b8', 0.6)
    scene.add(ambient)
    const directional = new THREE.DirectionalLight('#e2e8f0', 0.8)
    directional.position.set(10, 15, 5)
    scene.add(directional)

    // ワイヤーフレーム建物群（7棟）
    const buildings = [
      { w: 3, h: 8, d: 3, x: 0, z: 0 },
      { w: 2, h: 5, d: 4, x: 5, z: -2 },
      { w: 4, h: 12, d: 3, x: -5, z: 3 },
      { w: 2.5, h: 6, d: 2.5, x: 3, z: 5 },
      { w: 3, h: 10, d: 2, x: -3, z: -5 },
      { w: 2, h: 4, d: 3, x: 7, z: 4 },
      { w: 3.5, h: 7, d: 3.5, x: -7, z: -3 },
    ]

    const wireframeMat = new THREE.MeshBasicMaterial({
      color: '#60a5fa',
      wireframe: true,
      transparent: true,
      opacity: 0.6,
    })

    buildings.forEach(({ w, h, d, x, z }) => {
      const geo = new THREE.BoxGeometry(w, h, d)
      const mesh = new THREE.Mesh(geo, wireframeMat)
      mesh.position.set(x, h / 2, z)
      scene.add(mesh)
    })

    // アニメーションループ
    let animId: number
    const animate = () => {
      animId = requestAnimationFrame(animate)
      controls.update()
      renderer.render(scene, camera)
    }
    animate()

    // リサイズ対応
    const onResize = () => {
      if (!container) return
      const w = container.clientWidth
      const h = container.clientHeight
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
    }
    window.addEventListener('resize', onResize)

    // クリーンアップ
    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', onResize)
      controls.dispose()
      renderer.dispose()
      wireframeMat.dispose()
      buildings.forEach(() => {
        // geometry は各メッシュに固有なので scene から辿って dispose
      })
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose()
        }
      })
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement)
      }
    }
  }, [])

  return (
    <div className="media-viewer-model3d" ref={mountRef}>
      <span className="media-viewer-model3d-hint">ドラッグで回転</span>
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
