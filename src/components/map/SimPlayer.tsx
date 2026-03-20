import { useEffect, useRef, useState } from 'react'
import { useDroneStore } from '../../store/droneStore'
import { droneSimBridge } from '../../sim/droneSimBridge'
import { MissionComplete } from '../MissionComplete'
import type { CameraMode } from '../../types'

// フライト統計を計算するユーティリティ
function calcFlightStats(wps: ReturnType<typeof useDroneStore.getState>['plans'][0]['waypoints']) {
  let distM = 0, maxAlt = 0, photoCount = 0
  for (let i = 0; i < wps.length; i++) {
    if (wps[i].altAGL > maxAlt) maxAlt = wps[i].altAGL
    if (wps[i].action === 'photo') photoCount++
    if (i > 0) {
      const a = wps[i - 1], b = wps[i]
      const dx = (b.lon - a.lon) * 111320 * Math.cos((a.lat * Math.PI) / 180)
      const dy = (b.lat - a.lat) * 110540
      const dz = b.altAGL - a.altAGL
      distM += Math.sqrt(dx * dx + dy * dy + dz * dz)
    }
  }
  return { distM, maxAlt, photoCount }
}

export function SimPlayer() {
  const { simulation, setSimulation, stopSimulation, plans } = useDroneStore()
  const rafRef = useRef<number | null>(null)
  const [missionDone, setMissionDone] = useState(false)

  // ── Space キー: 再生 / 一時停止 ──
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== 'Space' || e.target !== document.body) return
      e.preventDefault()
      const sim = useDroneStore.getState().simulation
      if (!sim) return
      if (sim.playing) {
        useDroneStore.getState().setSimulation({ playing: false })
      } else {
        if (sim.progress >= 1.0) {
          const plan = useDroneStore.getState().plans.find((p) => p.id === sim.planId)
          const w0 = plan?.waypoints[0]
          if (w0) {
            droneSimBridge.lon = w0.lon; droneSimBridge.lat = w0.lat
            droneSimBridge.altAGL = w0.altAGL; droneSimBridge.active = true
          }
          useDroneStore.getState().setSimulation({ playing: true, progress: 0, startedAt: Date.now() })
        } else {
          const remaining = sim.totalMs * (1 - sim.progress)
          droneSimBridge.active = true
          useDroneStore.getState().setSimulation({ playing: true, startedAt: Date.now() - (sim.totalMs - remaining) / sim.speed })
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // ── RAF アニメーションループ ──
  useEffect(() => {
    if (!simulation?.playing) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      return
    }
    const plan = plans.find((p) => p.id === simulation.planId)
    if (!plan || plan.waypoints.length < 2) return

    // ── フェーズ列: 飛行セグメント + ホバー停止 ──────────────
    // フェーズを経過時間ベースで管理することで速度差・ホバーを正確に再現する
    type Phase =
      | { type: 'fly';   segIdx: number; durationMs: number }
      | { type: 'hover'; wpIdx:  number; durationMs: number }

    const buildPhases = (): Phase[] => {
      const wps = plan.waypoints
      const result: Phase[] = []
      for (let i = 0; i < wps.length - 1; i++) {
        const a = wps[i], b = wps[i + 1]
        const dx = (b.lon - a.lon) * 111320 * Math.cos((a.lat * Math.PI) / 180)
        const dy = (b.lat - a.lat) * 110540
        const dz = b.altAGL - a.altAGL
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)
        result.push({ type: 'fly', segIdx: i, durationMs: Math.max((dist / a.speedMS) * 1000, 1) })
        // 最終WPのホバーは意味がないので除外
        if (b.action === 'hover' && b.hoverSec && i < wps.length - 2) {
          result.push({ type: 'hover', wpIdx: i + 1, durationMs: b.hoverSec * 1000 })
        }
      }
      return result
    }
    const phases = buildPhases()

    const tick = () => {
      const sim = useDroneStore.getState().simulation
      if (!sim || !sim.playing || sim.startedAt == null) return

      const elapsed = (Date.now() - sim.startedAt) * sim.speed
      const progress = Math.min(elapsed / sim.totalMs, 1.0)
      const wps = plan.waypoints

      // ── elapsed からフェーズを特定して位置を補間 ──────
      let cumMs = 0
      let positioned = false
      for (const phase of phases) {
        if (elapsed < cumMs + phase.durationMs) {
          const frac = Math.min((elapsed - cumMs) / phase.durationMs, 1)
          if (phase.type === 'fly') {
            const a = wps[phase.segIdx], b = wps[phase.segIdx + 1]
            droneSimBridge.lon     = a.lon    + (b.lon    - a.lon)    * frac
            droneSimBridge.lat     = a.lat    + (b.lat    - a.lat)    * frac
            droneSimBridge.altAGL  = a.altAGL + (b.altAGL - a.altAGL) * frac
            droneSimBridge.heading = Math.atan2(b.lon - a.lon, b.lat - a.lat) * (180 / Math.PI)
          } else {
            // ホバー: 対象WPで停止、heading は維持
            const wp = wps[phase.wpIdx]
            droneSimBridge.lon    = wp.lon
            droneSimBridge.lat    = wp.lat
            droneSimBridge.altAGL = wp.altAGL
          }
          positioned = true
          break
        }
        cumMs += phase.durationMs
      }
      if (!positioned) {
        // 終端: 最終WPに固定
        const last = wps[wps.length - 1]
        droneSimBridge.lon    = last.lon
        droneSimBridge.lat    = last.lat
        droneSimBridge.altAGL = last.altAGL
      }

      useDroneStore.getState().setSimulation({ progress })

      if (progress >= 1.0) {
        droneSimBridge.active = false
        useDroneStore.getState().setSimulation({ playing: false, progress: 1.0 })
        setMissionDone(true)  // ミッション完了演出を表示
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
        setMissionDone(false)
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
    const wps = plan.waypoints
    const targetElapsed = simulation.totalMs * progress

    // フェーズ列ベースでシーク位置を計算（tick と同じロジック）
    type SPhase =
      | { type: 'fly';   segIdx: number; durationMs: number }
      | { type: 'hover'; wpIdx:  number; durationMs: number }
    const phases2: SPhase[] = []
    for (let i = 0; i < wps.length - 1; i++) {
      const a = wps[i], b = wps[i + 1]
      const dx = (b.lon - a.lon) * 111320 * Math.cos((a.lat * Math.PI) / 180)
      const dy = (b.lat - a.lat) * 110540
      const dz = b.altAGL - a.altAGL
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)
      phases2.push({ type: 'fly', segIdx: i, durationMs: Math.max((dist / a.speedMS) * 1000, 1) })
      if (b.action === 'hover' && b.hoverSec && i < wps.length - 2) {
        phases2.push({ type: 'hover', wpIdx: i + 1, durationMs: b.hoverSec * 1000 })
      }
    }

    let cumMs = 0
    for (const phase of phases2) {
      if (targetElapsed < cumMs + phase.durationMs) {
        const frac = Math.min((targetElapsed - cumMs) / phase.durationMs, 1)
        if (phase.type === 'fly') {
          const a = wps[phase.segIdx], b = wps[phase.segIdx + 1]
          droneSimBridge.lon    = a.lon    + (b.lon    - a.lon)    * frac
          droneSimBridge.lat    = a.lat    + (b.lat    - a.lat)    * frac
          droneSimBridge.altAGL = a.altAGL + (b.altAGL - a.altAGL) * frac
        } else {
          const wp = wps[phase.wpIdx]
          droneSimBridge.lon    = wp.lon
          droneSimBridge.lat    = wp.lat
          droneSimBridge.altAGL = wp.altAGL
        }
        break
      }
      cumMs += phase.durationMs
    }
    droneSimBridge.active = true
    setSimulation({ progress, playing: false, startedAt: Date.now() - (simulation.totalMs * progress) / simulation.speed })
  }

  const handleReset = () => {
    if (wps[0]) {
      droneSimBridge.lon = wps[0].lon; droneSimBridge.lat = wps[0].lat
      droneSimBridge.altAGL = wps[0].altAGL; droneSimBridge.active = true
    }
    setMissionDone(false)
    setSimulation({ progress: 0, playing: false, startedAt: Date.now() })
  }

  // ── ミッション完了演出 ──────────────────────────
  if (missionDone && plan) {
    const { distM, maxAlt: statMaxAlt, photoCount } = calcFlightStats(wps)
    return (
      <MissionComplete
        plan={plan}
        distM={distM}
        totalSec={simulation.totalMs / simulation.speed / 1000}
        maxAlt={statMaxAlt}
        photoCount={photoCount}
        onReplay={() => {
          if (wps[0]) {
            droneSimBridge.lon = wps[0].lon; droneSimBridge.lat = wps[0].lat
            droneSimBridge.altAGL = wps[0].altAGL; droneSimBridge.active = true
          }
          setMissionDone(false)
          setSimulation({ playing: true, progress: 0, startedAt: Date.now() })
        }}
        onClose={stopSimulation}
      />
    )
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
