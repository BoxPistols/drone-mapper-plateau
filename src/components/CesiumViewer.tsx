import { useEffect, useRef, useState } from 'react'
import {
  Viewer,
  Cesium3DTileset,
  Cesium3DTileFeature,
  Cartesian3,
  Cartesian2,
  Ion,
  createWorldTerrainAsync,
  Math as CesiumMath,
  Cesium3DTileStyle,
  ScreenSpaceEventHandler,
  ScreenSpaceEventType,
  Color,
} from 'cesium'
import type { CityConfig, BuildingProperties } from '../types'
import 'cesium/Build/Cesium/Widgets/widgets.css'

Ion.defaultAccessToken = import.meta.env.VITE_CESIUM_TOKEN ?? ''

interface Props {
  city: CityConfig
  onBuildingSelect?: (props: BuildingProperties | null) => void
}

export function CesiumViewer({ city, onBuildingSelect }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const viewerRef = useRef<Viewer | null>(null)
  const tilesetRef = useRef<Cesium3DTileset | null>(null)
  const selectedFeatureRef = useRef<Cesium3DTileFeature | null>(null)
  const [initialized, setInitialized] = useState(false)
  const [tileStatus, setTileStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [errorMsg, setErrorMsg] = useState('')

  // 初期化（マウント時のみ）
  useEffect(() => {
    if (!containerRef.current || viewerRef.current) return

    const viewer = new Viewer(containerRef.current, {
      baseLayerPicker: false,
      geocoder: false,
      homeButton: true,
      sceneModePicker: false,
      navigationHelpButton: false,
      animation: false,
      timeline: false,
      fullscreenButton: true,
      infoBox: false,        // 独自パネルを使うためオフ
      selectionIndicator: false,
    })

    if (import.meta.env.VITE_CESIUM_TOKEN) {
      createWorldTerrainAsync().then((terrain) => {
        viewer.terrainProvider = terrain
      }).catch(() => {})
    }

    viewer.shadows = false
    viewer.scene.fog.enabled = true

    // 建物クリックハンドラ
    const handler = new ScreenSpaceEventHandler(viewer.canvas)
    handler.setInputAction((movement: { position: Cartesian2 }) => {
      const picked = viewer.scene.pick(movement.position)

      // 前の選択を解除
      if (selectedFeatureRef.current) {
        selectedFeatureRef.current.color = Color.WHITE.withAlpha(0.9)
        selectedFeatureRef.current = null
      }

      if (picked instanceof Cesium3DTileFeature) {
        // 選択した建物をハイライト
        picked.color = Color.fromCssColorString('#58a6ff').withAlpha(0.95)
        selectedFeatureRef.current = picked

        // プロパティを収集
        const props: BuildingProperties = {}
        try {
          const names = picked.getPropertyIds()
          for (const name of names) {
            props[name] = picked.getProperty(name) as BuildingProperties[string]
          }
        } catch {
          // getPropertyIds が未サポートの場合のフォールバック
        }
        onBuildingSelect?.(props)
      } else {
        onBuildingSelect?.(null)
      }
    }, ScreenSpaceEventType.LEFT_CLICK)

    viewerRef.current = viewer
    setInitialized(true)

    return () => {
      handler.destroy()
      viewer.destroy()
      viewerRef.current = null
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // 都市変更時に3D Tilesを切り替え
  useEffect(() => {
    const viewer = viewerRef.current
    if (!viewer || !initialized) return

    // 選択中の建物をリセット
    selectedFeatureRef.current = null

    // 既存のタイルセットを削除
    if (tilesetRef.current) {
      viewer.scene.primitives.remove(tilesetRef.current)
      tilesetRef.current = null
    }

    setTileStatus('loading')
    setErrorMsg('')

    const load = async () => {
      try {
        const tileset = await Cesium3DTileset.fromUrl(city.tilesUrl, {
          maximumScreenSpaceError: 16,
        })

        // テクスチャなしの場合のみ白色スタイル適用
        if (!city.hasTexture) {
          tileset.style = new Cesium3DTileStyle({
            color: {
              conditions: [
                ['true', 'color("white", 0.9)'],
              ],
            },
          })
        }

        viewer.scene.primitives.add(tileset)
        tilesetRef.current = tileset

        viewer.camera.flyTo({
          destination: Cartesian3.fromDegrees(city.longitude, city.latitude, city.height),
          orientation: {
            heading: CesiumMath.toRadians(0),
            pitch: CesiumMath.toRadians(-45),
            roll: 0,
          },
          duration: 2,
        })

        setTileStatus('ready')
      } catch (e) {
        console.error('3D Tiles読み込みエラー:', e)
        setErrorMsg(String(e))
        setTileStatus('error')

        viewerRef.current?.camera.flyTo({
          destination: Cartesian3.fromDegrees(city.longitude, city.latitude, city.height),
          orientation: {
            heading: CesiumMath.toRadians(0),
            pitch: CesiumMath.toRadians(-45),
            roll: 0,
          },
          duration: 2,
        })
      }
    }

    load()
  }, [city, initialized]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="cesium-wrapper">
      <div ref={containerRef} className="cesium-container" />
      {tileStatus === 'loading' && (
        <div className="overlay loading">
          <div className="spinner" />
          <p>{city.name}の3D都市モデルを読み込み中...</p>
        </div>
      )}
      {tileStatus === 'error' && (
        <div className="overlay error">
          <p>3D Tilesの読み込みに失敗しました</p>
          <small>{errorMsg}</small>
          <p className="error-hint">
            PLATEAU公式サイトからtileset.jsonのURLを確認してください
          </p>
        </div>
      )}
      {tileStatus === 'ready' && (
        <div className="click-hint">建物をクリックで属性表示</div>
      )}
    </div>
  )
}
