import { useState } from 'react'
import { Sidebar } from './components/Sidebar'
import { CesiumMap } from './components/CesiumMap'
import { BuildingInfo } from './components/BuildingInfo'
import { LocationSearch } from './components/LocationSearch'
import { MapToolbar } from './components/map/MapToolbar'
import { SimPlayer } from './components/map/SimPlayer'
import { HelpModal } from './components/HelpModal'
import { MapEntityPopup } from './components/map/MapEntityPopup'
import { WelcomeScreen, shouldShowWelcome } from './components/WelcomeScreen'
import { useDroneStore } from './store/droneStore'
import './App.css'

// 現在の状態に合わせた「次のステップ」ガイドを表示
function StepGuide() {
  const { pins, zones, plans, simulation, mapMode } = useDroneStore()

  if (simulation) return null // シミュレーション中は非表示

  const hasPlan = plans.length > 0
  const hasWaypoints = plans.some((p) => p.waypoints.length >= 2)
  const hasZone = zones.length > 0

  if (mapMode === 'zone') return (
    <div className="step-guide step-guide--action">
      <span className="step-guide-icon">✏️</span>
      <span>地図上をクリックして飛行エリアを囲みましょう。<b>ダブルクリック</b>で確定</span>
    </div>
  )
  if (mapMode === 'pin') return (
    <div className="step-guide step-guide--action">
      <span className="step-guide-icon">📍</span>
      <span>地図上をクリックして目印を置きましょう</span>
    </div>
  )
  if (mapMode === 'waypoint') return (
    <div className="step-guide step-guide--action">
      <span className="step-guide-icon">🛸</span>
      <span>地図上をクリックして通過ポイントを追加しましょう。ポイント数: 2つ以上必要です</span>
    </div>
  )

  if (!hasZone && pins.length === 0 && !hasPlan) return (
    <div className="step-guide">
      <span className="step-guide-icon">👋</span>
      <span>左の<b>「マップ」</b>タブから始めましょう。まずデモを見てみるのがおすすめです！</span>
    </div>
  )
  if (!hasZone) return (
    <div className="step-guide">
      <span className="step-guide-icon">🗺️</span>
      <span><b>STEP 2:</b> ドローンを飛ばすエリアを地図上で囲んでみましょう</span>
    </div>
  )
  if (!hasPlan) return (
    <div className="step-guide">
      <span className="step-guide-icon">📋</span>
      <span><b>STEP 3:</b> 左の<b>「飛行計画」</b>タブで飛行ルートを作りましょう</span>
    </div>
  )
  if (!hasWaypoints) return (
    <div className="step-guide">
      <span className="step-guide-icon">📍</span>
      <span><b>STEP 4:</b> 飛行計画を開いて「地図で追加」から通過ポイントを2つ以上置きましょう</span>
    </div>
  )
  return (
    <div className="step-guide step-guide--ready">
      <span className="step-guide-icon">✅</span>
      <span>準備完了！飛行計画の<b>「試しに飛ばしてみる」</b>ボタンでシミュレーションを開始できます</span>
    </div>
  )
}

function App() {
  const { selectedCity, buildingProps, setBuildingProps, simulation } = useDroneStore()
  const [helpOpen, setHelpOpen] = useState(false)
  const [welcomeOpen, setWelcomeOpen] = useState(() => shouldShowWelcome())

  const handleLocationSelect = (lat: number, lon: number) => {
    window.dispatchEvent(new CustomEvent('cesium:flyTo', { detail: { lat, lon } }))
  }

  return (
    <div className="app">
      {/* ヘッダー */}
      <header className="app-header">
        <div className="header-left">
          <div className="app-logo">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M12 2L8 6H3l2.5 7.5L3 18h5l4 4 4-4h5l-2.5-4.5L19 6h-5l-3.5-4zM12 8v8M8 12h8"/>
            </svg>
          </div>
          <div className="header-title-wrap">
            <h1>DroneMapper</h1>
            <span className="header-sub">ドローン飛行管理</span>
          </div>
        </div>

        <div className="header-center">
          <LocationSearch onSelect={handleLocationSelect} />
        </div>

        <div className="header-right">
          <span className="header-city-name">{selectedCity.prefecture} {selectedCity.name}</span>
          {simulation && (
            <span className="sim-indicator">
              <span className="sim-indicator-dot" />
              飛行中
            </span>
          )}
          <button
            className="header-return-btn"
            title="この都市に戻る"
            onClick={() => window.dispatchEvent(new CustomEvent('cesium:flyToCity'))}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
            </svg>
          </button>
          <button
            className="header-help-btn"
            title="使い方を見る"
            onClick={() => setHelpOpen(true)}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{width:18,height:18}}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            <span className="header-help-btn-text">使い方</span>
          </button>
        </div>
      </header>

      {/* メインレイアウト */}
      <div className="main-layout">
        <Sidebar />

        <div className="map-area">
          <CesiumMap />
          <MapToolbar />
          {buildingProps && (
            <BuildingInfo
              properties={buildingProps}
              onClose={() => setBuildingProps(null)}
            />
          )}
          {simulation && <SimPlayer />}
          <MapEntityPopup />
          <StepGuide />
        </div>
      </div>

      {helpOpen && <HelpModal onClose={() => setHelpOpen(false)} />}
      {welcomeOpen && <WelcomeScreen onClose={() => setWelcomeOpen(false)} />}
    </div>
  )
}

export default App
