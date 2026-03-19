import { useEffect, useRef } from 'react'
import { useDroneStore } from '../../store/droneStore'
import { droneSimBridge } from '../../sim/droneSimBridge'
import type { CameraMode } from '../../types'

export function SimPlayer() {
  const { simulation, setSimulation, stopSimulation, plans } = useDroneStore()
  const rafRef = useRef<number | null>(null)

  // ── RAF アニメーションループ ──
  useEffect(() => {
    if (!simulation?.playing) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      return
    }
    const plan = plans.find((p) => p.id === simulation.planId)
    if (!plan || plan.waypoints.length < 2) return

    const tick = () => {
      const sim = useDroneStore.getState().simulation
      if (!sim || !sim.playing || sim.startedAt == null) return

      const elapsed = (Date.now() - sim.startedAt) * sim.speed
      const progress = Math.min(elapsed / sim.totalMs, 1.0)
      const wps = plan.waypoints
      const totalSegs = wps.length - 1
      const segProgress = progress * totalSegs
      const segIdx = Math.min(Math.floor(segProgress), totalSegs - 1)
      const frac = segProgress - segIdx
      const a = wps[segIdx]
      const b = wps[Math.min(segIdx + 1, wps.length - 1)]

      droneSimBridge.lon = a.lon + (b.lon - a.lon) * frac
      droneSimBridge.lat = a.lat + (b.lat - a.lat) * frac
      droneSimBridge.altAGL = a.altAGL + (b.altAGL - a.altAGL) * frac
      droneSimBridge.heading = Math.atan2(b.lon - a.lon, b.lat - a.lat) * (180 / Math.PI)

      useDroneStore.getState().setSimulation({ progress })

      if (progress >= 1.0) {
        droneSimBridge.active = false
        useDroneStore.getState().setSimulation({ playing: false, progress: 1.0 })
        return
      }
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [simulation?.playing, simulation?.planId, simulation?.speed, plans]) // eslint-disable-line

  if (!simulation) return null

  const plan = plans.find((p) => p.id === simulation.planId)
  const pct = Math.round(simulation.progress * 100)
  const totalSec = simulation.totalMs / simulation.speed / 1000
  const elapsedSec = totalSec * simulation.progress
  const fmt = (s: number) => `${Math.floor(s / 60)}分${String(Math.floor(s % 60)).padStart(2, '0')}秒`

  // 現在セグメントから数値を取得
  const wps = plan?.waypoints ?? []
  const segProgress = simulation.progress * Math.max(wps.length - 1, 1)
  const segIdx = Math.min(Math.floor(segProgress), wps.length - 2)
  const frac = segProgress - segIdx
  const wpA = wps[segIdx], wpB = wps[segIdx + 1] ?? wps[segIdx]
  const currentAlt = wpA ? wpA.altAGL + ((wpB?.altAGL ?? wpA.altAGL) - wpA.altAGL) * frac : 0
  const currentSpd = wpA?.speedMS ?? 0
  const currentWp  = Math.min(segIdx + 2, wps.length)

  const CAMERA_LABELS: Record<CameraMode, string> = {
    free:   '自由',
    follow: '追いかける',
    pov:    'ドローン視点',
  }

  const handlePlayPause = () => {
    if (simulation.playing) {
      setSimulation({ playing: false })
    } else {
      // 完了済みの場合は先頭からリプレイ
      if (simulation.progress >= 1.0) {
        if (wps[0]) {
          droneSimBridge.lon = wps[0].lon; droneSimBridge.lat = wps[0].lat
          droneSimBridge.altAGL = wps[0].altAGL; droneSimBridge.active = true
        }
        setSimulation({ playing: true, progress: 0, startedAt: Date.now() })
        return
      }
      const remaining = simulation.totalMs * (1 - simulation.progress)
      droneSimBridge.active = true
      setSimulation({ playing: true, startedAt: Date.now() - (simulation.totalMs - remaining) / simulation.speed })
    }
  }

  const handleSpeedChange = (speed: number) => {
    const el = (Date.now() - (simulation.startedAt ?? 0)) * simulation.speed
    setSimulation({ speed, ...(simulation.playing ? { startedAt: Date.now() - el / speed } : {}) })
  }

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const progress = parseFloat(e.target.value) / 100
    if (!plan) return
    const sp = progress * Math.max(wps.length - 1, 1)
    const si = Math.min(Math.floor(sp), wps.length - 2)
    const fr = sp - si
    const wa = wps[si], wb = wps[si + 1] ?? wps[si]
    if (wa) {
      droneSimBridge.lon = wa.lon + (wb.lon - wa.lon) * fr
      droneSimBridge.lat = wa.lat + (wb.lat - wa.lat) * fr
      droneSimBridge.altAGL = wa.altAGL + (wb.altAGL - wa.altAGL) * fr
      droneSimBridge.active = true
    }
    setSimulation({ progress, playing: false, startedAt: Date.now() - (simulation.totalMs * progress) / simulation.speed })
  }

  const handleReset = () => {
    if (wps[0]) {
      droneSimBridge.lon = wps[0].lon; droneSimBridge.lat = wps[0].lat
      droneSimBridge.altAGL = wps[0].altAGL; droneSimBridge.active = true
    }
    setSimulation({ progress: 0, playing: false, startedAt: Date.now() })
  }

  return (
    <>
      {/* ── HUD バー（マップ上部）── */}
      <div className="sim-hud">
        <div className="hud-title">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M12 2L8 6H3l2.5 7.5L3 18h5l4 4 4-4h5l-2.5-4.5L17 6h-5z"/>
            <circle cx="12" cy="12" r="2"/>
          </svg>
          <span>{plan?.name ?? 'フライトシミュレーション'}</span>
        </div>

        <div className="hud-divider" />

        <div className="hud-metric">
          <span className="hud-label">高さ</span>
          <span className="hud-value">{currentAlt.toFixed(0)}<em>m</em></span>
        </div>
        <div className="hud-metric">
          <span className="hud-label">速さ</span>
          <span className="hud-value">{currentSpd.toFixed(1)}<em>m/s</em></span>
        </div>
        <div className="hud-metric">
          <span className="hud-label">ポイント</span>
          <span className="hud-value">{currentWp}<em>/{wps.length}</em></span>
        </div>

        <div className="hud-divider" />

        {/* カメラモード */}
        <div className="hud-cam-group">
          {(['free', 'follow', 'pov'] as CameraMode[]).map((mode) => (
            <button
              key={mode}
              className={`hud-cam-btn ${simulation.cameraMode === mode ? 'active' : ''}`}
              onClick={() => setSimulation({ cameraMode: mode })}
              title={{
                free: 'カメラを自由に動かせます',
                follow: 'ドローンを追いかけながら見ます',
                pov: 'ドローンの視点で見ます',
              }[mode]}
            >
              {CAMERA_LABELS[mode]}
            </button>
          ))}
        </div>
      </div>

      {/* ── コントロールバー（マップ下部）── */}
      <div className="sim-player">
        {/* シーカー */}
        <div className="sim-seek-wrap">
          <span className="sim-time-label">{fmt(elapsedSec)}</span>
          <input type="range" min="0" max="100" value={pct} className="sim-seek" onChange={handleSeek} />
          <span className="sim-time-label sim-time-total">{fmt(totalSec)}</span>
        </div>

        {/* コントロール行 */}
        <div className="sim-controls">
          {/* 速度倍率 */}
          <div className="sim-speed-group">
            {[1, 2, 5, 10].map((s) => (
              <button
                key={s}
                className={`sim-speed-btn ${simulation.speed === s ? 'active' : ''}`}
                onClick={() => handleSpeedChange(s)}
                title={s === 1 ? '通常速度' : `${s}倍速`}
              >{s}×</button>
            ))}
          </div>

          {/* リセット */}
          <button className="sim-icon-btn" onClick={handleReset} title="最初に戻す">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
              <path strokeLinecap="round" d="M3 3v5h5"/>
            </svg>
          </button>

          {/* 再生/一時停止/リプレイ */}
          <button
            className="sim-play-btn"
            onClick={handlePlayPause}
            title={simulation.progress >= 1.0 ? 'もう一度見る' : simulation.playing ? '一時停止' : '再生'}
          >
            {simulation.playing ? (
              <svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
            ) : simulation.progress >= 1.0 ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}>
                <path strokeLinecap="round" d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
                <path strokeLinecap="round" d="M3 3v5h5"/>
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
            )}
          </button>

          {/* 閉じる */}
          <button className="sim-icon-btn sim-close-btn" onClick={stopSimulation} title="シミュレーションを終わる">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
      </div>
    </>
  )
}
