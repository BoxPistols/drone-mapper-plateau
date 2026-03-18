import { useState } from 'react'
import { CesiumViewer } from './components/CesiumViewer'
import { CitySelector } from './components/CitySelector'
import { BuildingInfo } from './components/BuildingInfo'
import type { CityConfig, BuildingProperties } from './types'
import './App.css'

const PLATEAU_CITIES: CityConfig[] = [
  // 東京都
  {
    id: 'taito',
    name: '台東区',
    prefecture: '東京都',
    tilesUrl: 'https://assets.cms.plateau.reearth.io/assets/59/0fbb20-59cb-4ce5-9d12-2273ce72e6d2/13106_taito-ku_city_2024_citygml_1_op_bldg_3dtiles_13106_taito-ku_lod2_no_texture/tileset.json',
    longitude: 139.7965,
    latitude: 35.7150,
    height: 1000,
    lod: 2,
  },
  {
    id: 'minato',
    name: '港区',
    prefecture: '東京都',
    tilesUrl: 'https://assets.cms.plateau.reearth.io/assets/ee/252e4a-c745-45fd-95f0-f0a396d4e395/13103_minato-ku_pref_2023_citygml_2_op_bldg_3dtiles_13103_minato-ku_lod2_no_texture/tileset.json',
    longitude: 139.7454,
    latitude: 35.6585,
    height: 1200,
    lod: 2,
  },
  // 宮城県
  {
    id: 'sendai',
    name: '仙台市',
    prefecture: '宮城県',
    tilesUrl: 'https://assets.cms.plateau.reearth.io/assets/bd/e78220-9044-4dcd-9519-5ff5730e25f2/04100_sendai-shi_city_2024_citygml_1_op_bldg_3dtiles_04101_aoba-ku_lod2_no_texture/tileset.json',
    longitude: 140.8697,
    latitude: 38.2526,
    height: 1500,
    lod: 2,
  },
  // 石川県
  {
    id: 'kaga',
    name: '加賀市',
    prefecture: '石川県',
    tilesUrl: 'https://assets.cms.plateau.reearth.io/assets/aa/36a235-f066-4d31-861a-11cf2e25ba66/17206_kaga-shi_city_2024_citygml_1_op_bldg_3dtiles_lod2_no_texture/tileset.json',
    longitude: 136.3058,
    latitude: 36.2984,
    height: 1500,
    lod: 2,
  },
  // 静岡県
  {
    id: 'numazu',
    name: '沼津市',
    prefecture: '静岡県',
    tilesUrl: 'https://assets.cms.plateau.reearth.io/assets/0e/14ced9-b904-42fa-af64-ca1be1269ac1/22203_numazu-shi_city_2023_citygml_3_op_bldg_3dtiles_lod3/tileset.json',
    longitude: 138.8643,
    latitude: 35.0964,
    height: 800,
    lod: 3,
    hasTexture: true,
  },
  // 広島県
  {
    id: 'hiroshima',
    name: '広島市',
    prefecture: '広島県',
    tilesUrl: 'https://assets.cms.plateau.reearth.io/assets/96/b46095-22bc-4190-b658-3ef163e36c9f/34100_hiroshima-shi_city_2024_citygml_1_op_bldg_3dtiles_34101_naka-ku_lod2_no_texture/tileset.json',
    longitude: 132.4553,
    latitude: 34.3954,
    height: 1200,
    lod: 2,
  },
  // 福岡県
  {
    id: 'fukuoka',
    name: '福岡市',
    prefecture: '福岡県',
    tilesUrl: 'https://assets.cms.plateau.reearth.io/assets/bf/d8ff81-ad03-486b-a021-6865e50c3b23/40130_fukuoka-shi_city_2024_citygml_2_op_bldg_3dtiles_40133_chuo-ku_lod2/tileset.json',
    longitude: 130.4017,
    latitude: 33.5901,
    height: 1200,
    lod: 2,
    hasTexture: true,
  },
]

function App() {
  const [selectedCity, setSelectedCity] = useState<CityConfig>(PLATEAU_CITIES[0])
  const [buildingProps, setBuildingProps] = useState<BuildingProperties | null>(null)

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-left">
          <span className="header-badge">PLATEAU</span>
          <div>
            <h1>3D都市モデルビューワー</h1>
            <p>Project PLATEAU × 国交省データプラットフォーム</p>
          </div>
        </div>
        <div className="header-right">
          <span className="city-display">{selectedCity.prefecture}</span>
          <span className="city-display-name">{selectedCity.name}</span>
          {selectedCity.lod && (
            <span className={`lod-badge lod-${selectedCity.lod}`}>LOD{selectedCity.lod}</span>
          )}
        </div>
      </header>
      <CitySelector
        cities={PLATEAU_CITIES}
        selected={selectedCity}
        onSelect={(city) => {
          setSelectedCity(city)
          setBuildingProps(null)
        }}
      />
      <div className="viewer-container">
        <CesiumViewer city={selectedCity} onBuildingSelect={setBuildingProps} />
        {buildingProps && (
          <BuildingInfo properties={buildingProps} onClose={() => setBuildingProps(null)} />
        )}
      </div>
    </div>
  )
}

export default App
