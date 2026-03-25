import { useRef, useEffect } from 'react'
import { useDroneStore } from '../../store/droneStore'
import type { MediaItem } from '../../types'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

// ── Three.js ミニビューワー ─────────────────────
function ModelViewer({ item }: { item: MediaItem }) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const width = el.clientWidth || 300
    const height = 200

    // レンダラー
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    el.appendChild(renderer.domElement)

    // シーン
    const scene = new THREE.Scene()

    // カメラ
    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 100)
    camera.position.set(6, 5, 8)

    // OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.08
    controls.autoRotate = true
    controls.autoRotateSpeed = 1.2
    controls.target.set(0, 1.5, 0)
    controls.update()

    // グリッド
    const grid = new THREE.GridHelper(12, 12, 0x58a6ff, 0x30363d)
    scene.add(grid)

    // ワイヤーフレーム建物群
    const colors = [0x58a6ff, 0x56d364, 0xf0883e, 0xbc8cff, 0xff7b72]
    const buildings = [
      { w: 1.2, h: 3.5, d: 1.2, x: 0, z: 0 },
      { w: 1.0, h: 2.2, d: 1.0, x: 2.2, z: 0.5 },
      { w: 1.5, h: 4.0, d: 1.0, x: -2.0, z: 1.0 },
      { w: 0.8, h: 1.8, d: 0.8, x: 1.0, z: -2.0 },
      { w: 1.3, h: 2.8, d: 1.3, x: -1.0, z: -1.8 },
      { w: 0.9, h: 3.2, d: 0.9, x: 3.0, z: -1.5 },
      { w: 1.1, h: 1.5, d: 1.4, x: -3.0, z: -0.5 },
    ]
    buildings.forEach((b, i) => {
      const geo = new THREE.BoxGeometry(b.w, b.h, b.d)
      const edges = new THREE.EdgesGeometry(geo)
      const mat = new THREE.LineBasicMaterial({ color: colors[i % colors.length] })
      const line = new THREE.LineSegments(edges, mat)
      line.position.set(b.x, b.h / 2, b.z)
      scene.add(line)
    })

    // アンビエントライト
    scene.add(new THREE.AmbientLight(0xffffff, 0.5))

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
      const w = el.clientWidth || 300
      camera.aspect = w / height
      camera.updateProjectionMatrix()
      renderer.setSize(w, height)
    }
    window.addEventListener('resize', onResize)

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', onResize)
      controls.dispose()
      renderer.dispose()
      if (el.contains(renderer.domElement)) {
        el.removeChild(renderer.domElement)
      }
    }
  }, [item.id])

  return <div ref={containerRef} className="model-viewer-container" />
}

// ── duration を mm:ss に変換 ────────────────────
function formatDuration(sec: number | undefined): string {
  if (sec == null || sec <= 0) return '0:00'
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

// ── サイズ表示 ──────────────────────────────────
function formatSize(kb: number | undefined): string {
  if (!kb) return ''
  return kb < 1024 ? `${kb}KB` : `${(kb / 1024).toFixed(1)}MB`
}

// ── メインパネル ────────────────────────────────
export function MediaPanel() {
  const { media, addMedia, deleteMedia, setSelectedMediaId } = useDroneStore()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFiles = (files: FileList | null) => {
    if (!files) return
    Array.from(files).forEach((file) => {
      const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
      let type: MediaItem['type'] = 'photo'
      if (file.type.startsWith('video')) type = 'video'
      else if (ext === 'glb' || ext === 'gltf') type = 'model3d'

      const reader = new FileReader()
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string | undefined
        addMedia({
          name: file.name,
          type,
          timestamp: new Date().toISOString(),
          sizeKB: Math.round(file.size / 1024),
          dataUrl: type === 'photo' || type === 'panorama' ? dataUrl : undefined,
          modelUrl: type === 'model3d' ? dataUrl : undefined,
        })
      }
      reader.readAsDataURL(file)
    })
  }

  // type別グループ分け
  const photos = media.filter((m) => m.type === 'photo')
  const panoramas = media.filter((m) => m.type === 'panorama')
  const videos = media.filter((m) => m.type === 'video')
  const models = media.filter((m) => m.type === 'model3d')

  return (
    <div className="panel">
      <div className="panel-header-row">
        <h2 className="panel-title">撮影データ ({media.length})</h2>
        <button className="panel-add-btn" onClick={() => fileInputRef.current?.click()}>
          + 追加
        </button>
        <input
          ref={fileInputRef}
          type="file"
          hidden
          multiple
          accept="image/*,video/*,.glb,.gltf"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {/* ドロップエリア */}
      <div
        className="media-dropzone"
        onDragOver={(e) => {
          e.preventDefault()
          e.currentTarget.classList.add('drag-over')
        }}
        onDragLeave={(e) => e.currentTarget.classList.remove('drag-over')}
        onDrop={(e) => {
          e.preventDefault()
          e.currentTarget.classList.remove('drag-over')
          handleFiles(e.dataTransfer.files)
        }}
        onClick={() => fileInputRef.current?.click()}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
        <span>クリックまたはドロップで追加</span>
        <span className="dropzone-hint">写真・動画・3Dモデル対応</span>
      </div>

      {media.length === 0 ? (
        <div className="panel-empty-state">
          <p className="panel-empty-hint">
            撮影した写真・動画をアップロードして
            <br />
            飛行記録と紐づけて管理できます
          </p>
        </div>
      ) : (
        <>
          {/* ── 撮影写真 ── */}
          {photos.length > 0 && (
            <section className="panel-section">
              <div className="media-section-header">
                <svg className="media-section-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <path d="m21 15-5-5L5 21" />
                </svg>
                <span className="media-section-title">撮影写真</span>
                <span className="media-section-count">{photos.length}</span>
              </div>
              <div className="media-grid">
                {photos.map((item) => (
                  <div
                    key={item.id}
                    className="media-card"
                    onClick={() => setSelectedMediaId(item.id)}
                  >
                    {item.dataUrl ? (
                      <img src={item.dataUrl} alt={item.name} className="media-thumb" />
                    ) : (
                      <div className="media-thumb media-thumb-video">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                          <rect x="3" y="3" width="18" height="18" rx="2" />
                          <circle cx="8.5" cy="8.5" r="1.5" />
                          <path d="m21 15-5-5L5 21" />
                        </svg>
                      </div>
                    )}
                    <div className="media-card-info">
                      <span className="media-card-name" title={item.name}>
                        {item.name}
                      </span>
                      <div className="media-card-meta">
                        <span className="media-type-badge photo">📷</span>
                        {item.sizeKB && <span>{formatSize(item.sizeKB)}</span>}
                      </div>
                    </div>
                    <button
                      className="media-delete"
                      onClick={(e) => {
                        e.stopPropagation()
                        deleteMedia(item.id)
                      }}
                      title="削除"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ── パノラマ ── */}
          {panoramas.length > 0 && (
            <section className="panel-section">
              <div className="media-section-header">
                <svg className="media-section-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" />
                  <path d="M2 12h20" />
                  <path d="M12 2c2.5 3 4 6.5 4 10s-1.5 7-4 10c-2.5-3-4-6.5-4-10s1.5-7 4-10z" />
                </svg>
                <span className="media-section-title">パノラマ</span>
                <span className="media-section-count">{panoramas.length}</span>
              </div>
              <div className="panorama-list">
                {panoramas.map((item) => (
                  <div key={item.id} className="panorama-card" onClick={() => setSelectedMediaId(item.id)}>
                    <div className="panorama-scroll">
                      {item.dataUrl ? (
                        <img src={item.dataUrl} alt={item.name} draggable={false} />
                      ) : (
                        <div style={{
                          height: 100, minWidth: '200%',
                          background: 'var(--bg-surface)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 24, color: 'var(--text-muted)',
                        }}>
                          🌐
                        </div>
                      )}
                    </div>
                    <span className="panorama-badge">360°</span>
                    <div className="media-card-info">
                      <span className="media-card-name" title={item.name}>
                        {item.name}
                      </span>
                      <div className="media-card-meta">
                        {item.sizeKB && <span>{formatSize(item.sizeKB)}</span>}
                      </div>
                    </div>
                    <button
                      className="media-delete"
                      onClick={() => deleteMedia(item.id)}
                      title="削除"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ── 映像 ── */}
          {videos.length > 0 && (
            <section className="panel-section">
              <div className="media-section-header">
                <svg className="media-section-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                  <path d="M15 10l4.553-2.069A1 1 0 0 1 21 8.876v6.248a1 1 0 0 1-1.447.895L15 14M3 8a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8z" />
                </svg>
                <span className="media-section-title">映像</span>
                <span className="media-section-count">{videos.length}</span>
              </div>
              <div className="video-list">
                {videos.map((item) => (
                  <div key={item.id} className="video-card" onClick={() => setSelectedMediaId(item.id)}>
                    <div className="video-preview">
                      {item.dataUrl && (
                        <img src={item.dataUrl} alt={item.name} className="video-thumb-img" />
                      )}
                      <div className="video-play-btn">
                        <svg viewBox="0 0 24 24" fill="currentColor">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      </div>
                      <span className="video-duration">{formatDuration(item.duration)}</span>
                    </div>
                    <div className="media-card-info">
                      <span className="media-card-name" title={item.name}>
                        {item.name}
                      </span>
                      <div className="media-card-meta">
                        <span className="media-type-badge video">🎥</span>
                        {item.sizeKB && <span>{formatSize(item.sizeKB)}</span>}
                      </div>
                    </div>
                    <button
                      className="media-delete"
                      onClick={() => deleteMedia(item.id)}
                      title="削除"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ── 3Dモデル ── */}
          {models.length > 0 && (
            <section className="panel-section">
              <div className="media-section-header">
                <svg className="media-section-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                  <path d="M12 2L2 7l10 5 10-5-10-5z" />
                  <path d="M2 17l10 5 10-5" />
                  <path d="M2 12l10 5 10-5" />
                </svg>
                <span className="media-section-title">3Dモデル</span>
                <span className="media-section-count">{models.length}</span>
              </div>
              <div className="model-list">
                {models.map((item) => (
                  <div key={item.id} className="model-card" onClick={() => setSelectedMediaId(item.id)}>
                    <ModelViewer item={item} />
                    <span className="model-badge">3D</span>
                    <span className="model-hint">ドラッグで回転</span>
                    <div className="media-card-info">
                      <span className="media-card-name" title={item.name}>
                        {item.name}
                      </span>
                      <div className="media-card-meta">
                        <span className="media-type-badge model3d">🧊</span>
                        {item.sizeKB && <span>{formatSize(item.sizeKB)}</span>}
                      </div>
                    </div>
                    <button
                      className="media-delete"
                      onClick={() => deleteMedia(item.id)}
                      title="削除"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}

    </div>
  )
}
