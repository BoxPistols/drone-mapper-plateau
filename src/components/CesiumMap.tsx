import { useEffect, useRef } from 'react'
import {
  Viewer, Cesium3DTileset, Cesium3DTileFeature,
  Cartesian3, Cartographic, Cartesian2,
  Ion, createWorldTerrainAsync,
  Math as CesiumMath, Cesium3DTileStyle,
  ScreenSpaceEventHandler, ScreenSpaceEventType,
  Color, Entity, ConstantPositionProperty,
  LabelStyle, VerticalOrigin, HorizontalOrigin,
  PolylineGlowMaterialProperty,
  CallbackProperty, PolygonHierarchy,
  HeightReference, NearFarScalar,
} from 'cesium'
import { useDroneStore } from '../store/droneStore'
import 'cesium/Build/Cesium/Widgets/widgets.css'

Ion.defaultAccessToken = import.meta.env.VITE_CESIUM_TOKEN ?? ''

const ZONE_COLORS: Record<string, Color> = {
  planned:    Color.fromCssColorString('#58a6ff').withAlpha(0.25),
  restricted: Color.fromCssColorString('#f85149').withAlpha(0.25),
  caution:    Color.fromCssColorString('#d29922').withAlpha(0.25),
  completed:  Color.fromCssColorString('#3fb950').withAlpha(0.25),
}
const ZONE_OUTLINE: Record<string, Color> = {
  planned:    Color.fromCssColorString('#58a6ff').withAlpha(0.8),
  restricted: Color.fromCssColorString('#f85149').withAlpha(0.8),
  caution:    Color.fromCssColorString('#d29922').withAlpha(0.8),
  completed:  Color.fromCssColorString('#3fb950').withAlpha(0.8),
}

export function CesiumMap() {
  const containerRef = useRef<HTMLDivElement>(null)
  const viewerRef = useRef<Viewer | null>(null)
  const tilesetRef = useRef<Cesium3DTileset | null>(null)
  const selectedFeatureRef = useRef<Cesium3DTileFeature | null>(null)
  const handlerRef = useRef<ScreenSpaceEventHandler | null>(null)
  const entityRefs = useRef<Entity[]>([])
  const droneEntityRef = useRef<Entity | null>(null)
  const tileStatusRef = useRef<'loading' | 'ready' | 'error'>('loading')
  const overlayRef = useRef<HTMLDivElement>(null)

  const store = useDroneStore()

  // ── Cesium初期化（マウント時のみ）──────────────
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
      infoBox: false,
      selectionIndicator: false,
    })

    if (import.meta.env.VITE_CESIUM_TOKEN) {
      createWorldTerrainAsync().then((t) => { viewer.terrainProvider = t }).catch(() => {})
    }
    viewer.shadows = false
    viewer.scene.fog.enabled = true
    viewerRef.current = viewer

    return () => {
      handlerRef.current?.destroy()
      handlerRef.current = null
      viewer.destroy()
      viewerRef.current = null
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── 都市切替（3D Tiles）──────────────────────
  useEffect(() => {
    const viewer = viewerRef.current
    if (!viewer) return
    const city = store.selectedCity

    if (tilesetRef.current) {
      viewer.scene.primitives.remove(tilesetRef.current)
      tilesetRef.current = null
    }

    tileStatusRef.current = 'loading'
    if (overlayRef.current) {
      overlayRef.current.style.display = 'flex'
      overlayRef.current.innerHTML = `
        <div class="spinner"></div>
        <p>${city.name}の3D都市モデルを読み込み中...</p>
      `
    }

    Cesium3DTileset.fromUrl(city.tilesUrl, { maximumScreenSpaceError: 16 })
      .then((tileset) => {
        if (!city.hasTexture) {
          tileset.style = new Cesium3DTileStyle({
            color: { conditions: [['true', 'color("white", 0.9)']] },
          })
        }
        viewer.scene.primitives.add(tileset)
        tilesetRef.current = tileset
        viewer.camera.flyTo({
          destination: Cartesian3.fromDegrees(city.longitude, city.latitude, city.height),
          orientation: { heading: CesiumMath.toRadians(0), pitch: CesiumMath.toRadians(-45), roll: 0 },
          duration: 2,
        })
        tileStatusRef.current = 'ready'
        if (overlayRef.current) overlayRef.current.style.display = 'none'
      })
      .catch((e) => {
        tileStatusRef.current = 'error'
        if (overlayRef.current) {
          overlayRef.current.innerHTML = `<p style="color:#f85149">読み込み失敗</p><small>${e}</small>`
        }
      })

    store.setBuildingProps(null)
    selectedFeatureRef.current = null
  }, [store.selectedCity]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── イベントハンドラ（モード変化）──────────────
  useEffect(() => {
    const viewer = viewerRef.current
    if (!viewer) return

    handlerRef.current?.destroy()
    const handler = new ScreenSpaceEventHandler(viewer.canvas)
    handlerRef.current = handler

    handler.setInputAction((movement: { position: Cartesian2 }) => {
      const mode = useDroneStore.getState().mapMode
      const scene = viewer.scene
      const pos = movement.position

      if (mode === 'select') {
        // 建物選択
        if (selectedFeatureRef.current) {
          selectedFeatureRef.current.color = Color.WHITE.withAlpha(0.9)
          selectedFeatureRef.current = null
        }
        const picked = scene.pick(pos)
        if (picked instanceof Cesium3DTileFeature) {
          picked.color = Color.fromCssColorString('#58a6ff').withAlpha(0.95)
          selectedFeatureRef.current = picked
          const props: Record<string, unknown> = {}
          try {
            for (const name of picked.getPropertyIds()) props[name] = picked.getProperty(name)
          } catch { /* noop */ }
          useDroneStore.getState().setBuildingProps(props as never)
        } else {
          useDroneStore.getState().setBuildingProps(null)
        }
        return
      }

      // 地表座標取得
      const ellipsoid = scene.globe.ellipsoid
      const cartesian = viewer.camera.pickEllipsoid(pos, ellipsoid)
      if (!cartesian) return
      const carto = Cartographic.fromCartesian(cartesian)
      const lon = CesiumMath.toDegrees(carto.longitude)
      const lat = CesiumMath.toDegrees(carto.latitude)

      if (mode === 'pin') {
        useDroneStore.getState().addPin(lon, lat, 0)
        useDroneStore.getState().setMapMode('select')
      } else if (mode === 'zone') {
        useDroneStore.getState().addDrawingPoint(lon, lat)
      } else if (mode === 'waypoint') {
        const { activePlanId, addWaypoint } = useDroneStore.getState()
        if (activePlanId) addWaypoint(activePlanId, lon, lat)
      }
    }, ScreenSpaceEventType.LEFT_CLICK)

    // ゾーン: ダブルクリックで確定
    handler.setInputAction(() => {
      const { mapMode, drawingZonePoints, commitZone } = useDroneStore.getState()
      if (mapMode === 'zone' && drawingZonePoints.length >= 3) {
        const name = prompt('ゾーン名を入力', 'フライトゾーン') ?? 'フライトゾーン'
        commitZone(name, 'planned')
      }
    }, ScreenSpaceEventType.LEFT_DOUBLE_CLICK)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── エンティティ更新（ピン・ゾーン・WP・シム）──
  useEffect(() => {
    const viewer = viewerRef.current
    if (!viewer) return

    const { pins, zones, plans, activePlanId, drawingZonePoints, simulation } =
      useDroneStore.getState()

    // 既存エンティティを削除
    entityRefs.current.forEach((e) => viewer.entities.remove(e))
    entityRefs.current = []
    if (droneEntityRef.current) {
      viewer.entities.remove(droneEntityRef.current)
      droneEntityRef.current = null
    }

    const add = (e: Entity) => {
      viewer.entities.add(e)
      entityRefs.current.push(e)
      return e
    }

    // ── ピン ──
    for (const pin of pins) {
      add(new Entity({
        position: new ConstantPositionProperty(Cartesian3.fromDegrees(pin.lon, pin.lat, pin.alt + 5)),
        point: { pixelSize: 12, color: Color.fromCssColorString(pin.color), outlineColor: Color.WHITE, outlineWidth: 2, heightReference: HeightReference.RELATIVE_TO_GROUND },
        label: {
          text: pin.name, font: '13px "DM Sans"',
          fillColor: Color.WHITE, outlineColor: Color.BLACK, outlineWidth: 2,
          style: LabelStyle.FILL_AND_OUTLINE,
          verticalOrigin: VerticalOrigin.BOTTOM, horizontalOrigin: HorizontalOrigin.CENTER,
          pixelOffset: { x: 0, y: -16 } as never,
          scaleByDistance: new NearFarScalar(200, 1, 3000, 0.3),
          heightReference: HeightReference.RELATIVE_TO_GROUND,
        },
      }))
    }

    // ── ゾーン ──
    for (const zone of zones) {
      if (zone.coordinates.length < 3) continue
      const positions = zone.coordinates.map(([lon, lat]) => Cartesian3.fromDegrees(lon, lat))
      add(new Entity({
        polygon: {
          hierarchy: new PolygonHierarchy(positions),
          material: ZONE_COLORS[zone.type] ?? Color.BLUE.withAlpha(0.2),
          outline: true, outlineColor: ZONE_OUTLINE[zone.type] ?? Color.BLUE,
          outlineWidth: 2, heightReference: HeightReference.CLAMP_TO_GROUND,
        },
        position: new ConstantPositionProperty(
          Cartesian3.fromDegrees(
            zone.coordinates.reduce((s, c) => s + c[0], 0) / zone.coordinates.length,
            zone.coordinates.reduce((s, c) => s + c[1], 0) / zone.coordinates.length,
            50
          )
        ),
        label: {
          text: zone.name, font: '12px "DM Sans"',
          fillColor: Color.WHITE, outlineColor: Color.BLACK, outlineWidth: 2,
          style: LabelStyle.FILL_AND_OUTLINE,
          verticalOrigin: VerticalOrigin.CENTER,
        },
      }))
    }

    // ── 描画中ゾーン プレビュー ──
    if (drawingZonePoints.length > 0) {
      const pts = [...drawingZonePoints]
      const linePositions = [
        ...pts.map(([lon, lat]) => Cartesian3.fromDegrees(lon, lat, 30)),
        ...(pts.length >= 2 ? [Cartesian3.fromDegrees(pts[0][0], pts[0][1], 30)] : []),
      ]
      add(new Entity({
        polyline: {
          positions: linePositions,
          width: 2,
          material: new PolylineGlowMaterialProperty({ glowPower: 0.2, color: Color.fromCssColorString('#58a6ff').withAlpha(0.8) }),
          clampToGround: false,
        },
      }))
      for (let i = 0; i < pts.length; i++) {
        add(new Entity({
          position: new ConstantPositionProperty(Cartesian3.fromDegrees(pts[i][0], pts[i][1], 30)),
          point: { pixelSize: 8, color: Color.fromCssColorString('#58a6ff'), outlineColor: Color.WHITE, outlineWidth: 2 },
        }))
      }
    }

    // ── アクティブ計画のウェイポイント ──
    const activePlan = plans.find((p) => p.id === activePlanId)
    if (activePlan && activePlan.waypoints.length > 0) {
      const wps = activePlan.waypoints

      // ウェイポイントパスライン
      if (wps.length >= 2) {
        add(new Entity({
          polyline: {
            positions: wps.map((w) => Cartesian3.fromDegrees(w.lon, w.lat, w.altAGL)),
            width: 3,
            material: new PolylineGlowMaterialProperty({
              glowPower: 0.3,
              color: Color.fromCssColorString('#7ee8a2').withAlpha(0.9),
            }),
          },
        }))
      }

      // ウェイポイントマーカー
      wps.forEach((wp, idx) => {
        const isFirst = idx === 0
        const isLast = idx === wps.length - 1
        add(new Entity({
          position: new ConstantPositionProperty(Cartesian3.fromDegrees(wp.lon, wp.lat, wp.altAGL)),
          point: {
            pixelSize: isFirst || isLast ? 14 : 10,
            color: isFirst
              ? Color.fromCssColorString('#3fb950')
              : isLast
              ? Color.fromCssColorString('#f85149')
              : Color.fromCssColorString('#7ee8a2'),
            outlineColor: Color.WHITE,
            outlineWidth: 2,
          },
          label: {
            text: `WP${idx + 1}\n${wp.altAGL}m`,
            font: '11px "DM Sans"',
            fillColor: Color.WHITE, outlineColor: Color.BLACK, outlineWidth: 2,
            style: LabelStyle.FILL_AND_OUTLINE,
            verticalOrigin: VerticalOrigin.BOTTOM,
            pixelOffset: { x: 0, y: -14 } as never,
            scaleByDistance: new NearFarScalar(100, 1, 5000, 0.2),
          },
        }))

        // 高度バー（地面からAGLまで）
        add(new Entity({
          polyline: {
            positions: [
              Cartesian3.fromDegrees(wp.lon, wp.lat, 0),
              Cartesian3.fromDegrees(wp.lon, wp.lat, wp.altAGL),
            ],
            width: 1,
            material: Color.WHITE.withAlpha(0.3),
          },
        }))
      })
    }

    // ── ドローンシミュレーション ──
    if (simulation?.dronePos) {
      const [lon, lat, alt] = simulation.dronePos

      // 完了済みパスの表示（シミュレーション対象計画）
      const simPlan = plans.find((p) => p.id === simulation.planId)
      if (simPlan && simPlan.waypoints.length >= 2) {
        const progress = simulation.progress
        const wps = simPlan.waypoints
        const totalSegs = wps.length - 1
        const segProgress = progress * totalSegs
        const segIdx = Math.min(Math.floor(segProgress), totalSegs - 1)

        // 完了パスラインの生成
        const donePath: Cartesian3[] = []
        for (let i = 0; i <= segIdx && i < wps.length; i++) {
          donePath.push(Cartesian3.fromDegrees(wps[i].lon, wps[i].lat, wps[i].altAGL))
        }
        if (donePath.length > 0) {
          donePath.push(Cartesian3.fromDegrees(lon, lat, alt))
        }
        if (donePath.length >= 2) {
          add(new Entity({
            polyline: {
              positions: donePath,
              width: 4,
              material: new PolylineGlowMaterialProperty({
                glowPower: 0.4,
                color: Color.fromCssColorString('#58a6ff').withAlpha(0.9),
              }),
            },
          }))
        }
      }

      // ドローンアイコン（ビルボード代替：大きめポイント）
      const droneEntity = new Entity({
        position: new ConstantPositionProperty(Cartesian3.fromDegrees(lon, lat, alt)),
        point: {
          pixelSize: 20,
          color: Color.fromCssColorString('#58a6ff'),
          outlineColor: Color.WHITE,
          outlineWidth: 3,
        },
        label: {
          text: `🚁 ${alt.toFixed(0)}m AGL`,
          font: '13px "DM Sans"',
          fillColor: Color.WHITE, outlineColor: Color.BLACK, outlineWidth: 2,
          style: LabelStyle.FILL_AND_OUTLINE,
          verticalOrigin: VerticalOrigin.BOTTOM,
          pixelOffset: { x: 0, y: -24 } as never,
        },
        // カメラ垂直FOVコーン（簡易：下向きの細い円錐）
        ellipse: {
          semiMinorAxis: new CallbackProperty(() => alt * Math.tan(((30 * Math.PI) / 180) / 2), false),
          semiMajorAxis: new CallbackProperty(() => alt * Math.tan(((30 * Math.PI) / 180) / 2), false),
          height: 0,
          material: Color.fromCssColorString('#f0c040').withAlpha(0.15),
          outline: true,
          outlineColor: Color.fromCssColorString('#f0c040').withAlpha(0.5),
          heightReference: HeightReference.CLAMP_TO_GROUND,
        },
      })
      viewer.entities.add(droneEntity)
      droneEntityRef.current = droneEntity
    }
  }, [ // eslint-disable-line react-hooks/exhaustive-deps
    store.pins, store.zones, store.plans, store.activePlanId,
    store.drawingZonePoints, store.simulation?.dronePos, store.simulation?.planId,
  ])

  // ── カメラを検索結果にフライ（グローバルで呼び出せるように export）──
  useEffect(() => {
    const handler = (e: CustomEvent<{ lat: number; lon: number }>) => {
      viewerRef.current?.camera.flyTo({
        destination: Cartesian3.fromDegrees(e.detail.lon, e.detail.lat, 800),
        orientation: { heading: 0, pitch: CesiumMath.toRadians(-45), roll: 0 },
        duration: 1.5,
      })
    }
    window.addEventListener('cesium:flyTo', handler as EventListener)
    return () => window.removeEventListener('cesium:flyTo', handler as EventListener)
  }, [])

  return (
    <div className="cesium-wrapper">
      <div ref={containerRef} className="cesium-container" />
      <div ref={overlayRef} className="overlay loading" style={{ display: 'flex' }}>
        <div className="spinner" />
        <p>3D都市モデルを読み込み中...</p>
      </div>
    </div>
  )
}
