import { useEffect, useMemo, useRef, useState } from 'react'
import { useDroneStore } from '../../store/droneStore'
import { droneSimBridge } from '../../sim/droneSimBridge'
import { buildFlightPhases, totalFlightMs, sampleAtElapsed, computeFlightStats, type FlightSample } from '../../sim/flightPath'
import { MissionComplete } from '../MissionComplete'
import { CAMERA_LABELS, CAMERA_DESCRIPTIONS } from '../../constants/labels'
import { isEditableTarget } from '../../utils/domUtils'
import type { CameraMode } from '../../types'

// サンプル値を droneSimBridge に書き込む（SimEngine → Camera3D への唯一の経路）
function writeBridge(s: FlightSample) {
  droneSimBridge.lon = s.lon
  droneSimBridge.lat = s.lat
  droneSimBridge.altAGL = s.altAGL
  droneSimBridge.heading = s.heading
  droneSimBridge.pitch = s.pitchDeg
}

export function SimPlayer() {
  const { simulation, setSimulation, stopSimulation, plans } = useDroneStore()
  const rafRef = useRef<number | null>(null)
  const [missionDone, setMissionDone] = useState(false)

  // ── Space キー: 再生 / 一時停止 ──
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // 入力欄でのスペースは奪わない。ボタンにフォーカスがあっても再生/一時停止は効かせる
      if (e.code !== 'Space' || isEditableTarget(e.target)) return
      e.preventDefault()
      const sim = useDroneStore.getState().simulation
      if (!sim) return
      if (sim.playing) {
        useDroneStore.getState().setSimulation({ playing: false })
      } else {
        if (sim.progress >= 1.0) {
          const plan = useDroneStore.getState().plans.find((p) => p.id === sim.planId)
          const wps = plan?.waypoints
          if (wps && wps.length >= 2) {
            writeBridge(sampleAtElapsed(wps, buildFlightPhases(wps), 0))
            droneSimBridge.active = true
          }
          setMissionDone(false) // 完了画面が出たままリプレイされるのを防ぐ
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
    if (!plan || plan.waypoints.length < 2) {
      // 再生中にWP削除で2点未満になった場合、「飛行中」のまま固まらないよう停止する
      droneSimBridge.active = false
      useDroneStore.getState().setSimulation({ playing: false })
      return
    }

    // フェーズ列（飛行 + ホバー）は flightPath に一本化。弧長ベースで等速飛行
    const phases = buildFlightPhases(plan.waypoints)

    const tick = () => {
      const sim = useDroneStore.getState().simulation
      if (!sim || !sim.playing || sim.startedAt == null) return

      const elapsed = (Date.now() - sim.startedAt) * sim.speed
      const progress = Math.min(elapsed / sim.totalMs, 1.0)

      writeBridge(sampleAtElapsed(plan.waypoints, phases, elapsed))
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
  }, [simulation?.playing, simulation?.planId, simulation?.speed, plans])

  const plan = plans.find((p) => p.id === simulation?.planId)
  // WP編集で参照が変わった時だけ弧長テーブルを再構築
  const hudPhases = useMemo(
    () => (plan && plan.waypoints.length >= 2 ? buildFlightPhases(plan.waypoints) : null),
    [plan]
  )

  // シミュ中にWPの速度・高度・位置が編集されると総所要時間が変わる。
  // tick の進捗計算・シークバー・時間表示はすべて store の totalMs を参照するため、
  // ここで進捗率を保ったまま一元的に同期する（表示だけ動的計算すると実挙動とズレる）
  useEffect(() => {
    if (!simulation || !hudPhases) return
    const newTotal = totalFlightMs(hudPhases)
    if (Math.abs(newTotal - simulation.totalMs) < 1) return
    setSimulation({
      totalMs: newTotal,
      ...(simulation.playing && simulation.startedAt != null
        ? { startedAt: Date.now() - (simulation.progress * newTotal) / simulation.speed }
        : {}),
    })
  }, [hudPhases, simulation, setSimulation])

  if (!simulation) return null

  const pct = Math.round(simulation.progress * 100)
  const totalSec = simulation.totalMs / simulation.speed / 1000
  const elapsedSec = totalSec * simulation.progress
  const fmt = (s: number) => `${Math.floor(s / 60)}分${String(Math.floor(s % 60)).padStart(2, '0')}秒`

  // HUD 数値: tick と同じフェーズ定義からサンプリング（セグメント等分割は禁止）
  const wps = plan?.waypoints ?? []
  const hudSample = hudPhases
    ? sampleAtElapsed(wps, hudPhases, simulation.progress * simulation.totalMs)
    : null
  const currentAlt = hudSample?.altAGL ?? 0
  const currentSpd = hudSample?.speedMS ?? 0
  const currentWp  = hudSample?.wpNumber ?? 1

  const handlePlayPause = () => {
    if (simulation.playing) {
      setSimulation({ playing: false })
    } else {
      // 完了済みの場合は先頭からリプレイ
      if (simulation.progress >= 1.0) {
        if (hudPhases) {
          writeBridge(sampleAtElapsed(wps, hudPhases, 0))
          droneSimBridge.active = true
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
    if (!plan || !hudPhases) return
    // tick と同一のフェーズ定義でシーク位置を確定
    writeBridge(sampleAtElapsed(plan.waypoints, hudPhases, simulation.totalMs * progress))
    droneSimBridge.active = true
    setSimulation({ progress, playing: false, startedAt: Date.now() - (simulation.totalMs * progress) / simulation.speed })
  }

  const handleReset = () => {
    if (hudPhases) {
      writeBridge(sampleAtElapsed(wps, hudPhases, 0))
      droneSimBridge.active = true
    }
    setMissionDone(false)
    setSimulation({ progress: 0, playing: false, startedAt: Date.now() })
  }

  // ── ミッション完了演出 ──────────────────────────
  const missionStats = missionDone && plan ? computeFlightStats(wps) : null
  if (missionDone && plan && hudPhases && missionStats) {
    const { distM, maxAlt: statMaxAlt, photoCount } = missionStats
    return (
      <MissionComplete
        plan={plan}
        distM={distM}
        totalSec={simulation.totalMs / simulation.speed / 1000}
        maxAlt={statMaxAlt}
        photoCount={photoCount}
        onReplay={() => {
          writeBridge(sampleAtElapsed(wps, hudPhases, 0))
          droneSimBridge.active = true
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
        <div className="hud-cam-group" role="group" aria-label="カメラ視点">
          {(['free', 'follow', 'pov'] as CameraMode[]).map((mode) => (
            <button
              key={mode}
              className={`hud-cam-btn ${simulation.cameraMode === mode ? 'active' : ''}`}
              onClick={() => setSimulation({ cameraMode: mode })}
              aria-pressed={simulation.cameraMode === mode}
              title={CAMERA_DESCRIPTIONS[mode]}
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
          <input
            type="range" min="0" max="100" value={pct} className="sim-seek" onChange={handleSeek}
            aria-label="再生位置"
            aria-valuetext={`${fmt(elapsedSec)} / ${fmt(totalSec)}`}
          />
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
                aria-pressed={simulation.speed === s}
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
