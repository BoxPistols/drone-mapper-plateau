import { Sidebar } from './components/Sidebar'
import { CesiumMap } from './components/CesiumMap'
import { BuildingInfo } from './components/BuildingInfo'
import { LocationSearch } from './components/LocationSearch'
import { MapToolbar } from './components/map/MapToolbar'
import { SimPlayer } from './components/map/SimPlayer'
import { useDroneStore } from './store/droneStore'
import './App.css'

function App() {
  const { selectedCity, buildingProps, setBuildingProps, simulation } = useDroneStore()

  const handleLocationSelect = (lat: number, lon: number) => {
    window.dispatchEvent(new CustomEvent('cesium:flyTo', { detail: { lat, lon } }))
  }

  const activeLod = selectedCity.lod

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
            <span className="header-sub">自治体向けドローン飛行管理</span>
          </div>
        </div>

        <div className="header-center">
          <LocationSearch onSelect={handleLocationSelect} />
        </div>

        <div className="header-right">
          <span className="header-city-pref">{selectedCity.prefecture}</span>
          <span className="header-city-name">{selectedCity.name}</span>
          {activeLod && <span className={`lod-badge lod-${activeLod}`}>LOD{activeLod}</span>}
          {simulation && (
            <span className="sim-indicator">
              <span className="sim-indicator-dot" />
              シミュレート中
            </span>
          )}
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
          {!simulation && (
            <div className="map-hint">
              建物クリックで属性表示 / ツールバーでピン・ゾーン・WP追加
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default App
