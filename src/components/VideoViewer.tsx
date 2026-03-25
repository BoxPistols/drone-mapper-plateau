import { useRef, useEffect, useState } from 'react'
import type { MediaItem } from '../types'

function formatDuration(sec?: number): string {
  if (!sec) return '—'
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function VideoViewer({ item }: { item: MediaItem }) {
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
