import { useEffect, useRef } from 'react'
import { useDroneStore } from '../../store/droneStore'

export function SimPlayer() {
  const { simulation, setSimulation, stopSimulation, plans } = useDroneStore()
  const rafRef = useRef<number | null>(null)

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

      // ウェイポイント間の補間
      const wps = plan.waypoints
      const totalSegs = wps.length - 1
      const segProgress = progress * totalSegs
      const segIdx = Math.min(Math.floor(segProgress), totalSegs - 1)
      const frac = segProgress - segIdx

      const a = wps[segIdx]
      const b = wps[Math.min(segIdx + 1, wps.length - 1)]
      const lon = a.lon + (b.lon - a.lon) * frac
      const lat = a.lat + (b.lat - a.lat) * frac
      const alt = a.altAGL + (b.altAGL - a.altAGL) * frac

      useDroneStore.getState().setSimulation({
        progress,
        dronePos: [lon, lat, alt],
      })

      if (progress >= 1.0) {
        useDroneStore.getState().setSimulation({ playing: false, progress: 1.0 })
        return
      }

      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [simulation?.playing, simulation?.planId, simulation?.speed, plans]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!simulation) return null

  const plan = plans.find((p) => p.id === simulation.planId)
  const pct = Math.round(simulation.progress * 100)
  const elapsed = (simulation.totalMs / simulation.speed / 1000) * simulation.progress

  const fmt = (sec: number) => {
    const m = Math.floor(sec / 60)
    const s = Math.floor(sec % 60)
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  const handlePlayPause = () => {
    if (simulation.playing) {
      setSimulation({ playing: false })
    } else {
      // 再開: 残り時間に合わせてstartedAtを調整
      const remaining = simulation.totalMs * (1 - simulation.progress)
      const adjustedStart = Date.now() - (simulation.totalMs - remaining) / simulation.speed
      setSimulation({ playing: true, startedAt: adjustedStart })
    }
  }

  const handleSpeedChange = (speed: number) => {
    if (simulation.playing) {
      const elapsed = (Date.now() - (simulation.startedAt ?? 0)) * simulation.speed
      const newStart = Date.now() - elapsed / speed
      setSimulation({ speed, startedAt: newStart })
    } else {
      setSimulation({ speed })
    }
  }

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const progress = parseFloat(e.target.value) / 100
    const plan = plans.find((p) => p.id === simulation.planId)
    if (!plan) return

    const wps = plan.waypoints
    const totalSegs = wps.length - 1
    const segProgress = progress * totalSegs
    const segIdx = Math.min(Math.floor(segProgress), totalSegs - 1)
    const frac = segProgress - segIdx
    const a = wps[segIdx], b = wps[Math.min(segIdx + 1, wps.length - 1)]

    setSimulation({
      progress,
      playing: false,
      dronePos: [
        a.lon + (b.lon - a.lon) * frac,
        a.lat + (b.lat - a.lat) * frac,
        a.altAGL + (b.altAGL - a.altAGL) * frac,
      ],
      startedAt: Date.now() - (simulation.totalMs * progress) / simulation.speed,
    })
  }

  return (
    <div className="sim-player">
      <div className="sim-header">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path d="M12 2L8 6H3l2.5 7.5L3 18h5l4 4 4-4h5l-2.5-4.5L17 6h-5l-4-4 4 0z"/>
          <circle cx="12" cy="12" r="2"/>
        </svg>
        <span className="sim-title">{plan?.name ?? 'シミュレーション'}</span>
        <button className="sim-close" onClick={stopSimulation}>×</button>
      </div>

      <div className="sim-seek-wrap">
        <input
          type="range" min="0" max="100" value={pct}
          className="sim-seek" onChange={handleSeek}
        />
        <div className="sim-time">
          <span>{fmt(elapsed)}</span>
          <span>{pct}%</span>
          <span>{fmt(simulation.totalMs / simulation.speed / 1000)}</span>
        </div>
      </div>

      <div className="sim-controls">
        <div className="sim-speed-group">
          {[1, 2, 5, 10].map((s) => (
            <button
              key={s}
              className={`sim-speed-btn ${simulation.speed === s ? 'active' : ''}`}
              onClick={() => handleSpeedChange(s)}
            >
              {s}×
            </button>
          ))}
        </div>

        <button className="sim-play-btn" onClick={handlePlayPause}>
          {simulation.playing ? (
            <svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
          )}
        </button>

        <button className="sim-reset-btn" onClick={() => {
          const plan = plans.find((p) => p.id === simulation.planId)
          if (plan?.waypoints[0]) {
            const w = plan.waypoints[0]
            setSimulation({ progress: 0, playing: false, dronePos: [w.lon, w.lat, w.altAGL], startedAt: Date.now() })
          }
        }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M1 4v6h6M23 20v-6h-6"/><path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4-4.64 4.36A9 9 0 0 1 3.51 15"/>
          </svg>
        </button>
      </div>

      <div className="sim-info">
        {simulation.dronePos && (
          <>
            <span>AGL: <b>{simulation.dronePos[2].toFixed(0)}m</b></span>
            <span>WP {Math.min(Math.floor(simulation.progress * (plan?.waypoints.length ?? 1 - 1)) + 1, plan?.waypoints.length ?? 1)}/{plan?.waypoints.length ?? 0}</span>
          </>
        )}
      </div>
    </div>
  )
}
