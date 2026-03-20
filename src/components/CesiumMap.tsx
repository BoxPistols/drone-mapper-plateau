import { useEffect, useRef, useState } from 'react'
import {
  Viewer, Cesium3DTileset, Cesium3DTileFeature,
  Cartesian3, Cartographic, Cartesian2,
  Ion, createWorldTerrainAsync,
  Math as CesiumMath, Cesium3DTileStyle,
  ScreenSpaceEventHandler, ScreenSpaceEventType,
  Color, Entity, ConstantPositionProperty,
  LabelStyle, VerticalOrigin, HorizontalOrigin,
  PolylineGlowMaterialProperty, CallbackProperty,
  PolygonHierarchy, HeightReference, NearFarScalar,
  HeadingPitchRange, defined, Matrix4, Transforms, SceneMode,
} from 'cesium'
import { useDroneStore } from '../store/droneStore'
import { droneSimBridge } from '../sim/droneSimBridge'
import 'cesium/Build/Cesium/Widgets/widgets.css'

Ion.defaultAccessToken = import.meta.env.VITE_CESIUM_TOKEN ?? ''

// Cesium Viewer を他コンポーネントから参照できるように公開
export const cesiumViewerRef: { current: Viewer | null } = { current: null }

const ZONE_FILL: Record<string, Color> = {
  planned:    Color.fromCssColorString('#58a6ff').withAlpha(0.2),
  restricted: Color.fromCssColorString('#f85149').withAlpha(0.2),
  caution:    Color.fromCssColorString('#d29922').withAlpha(0.2),
  completed:  Color.fromCssColorString('#3fb950').withAlpha(0.2),
}
const ZONE_EDGE: Record<string, Color> = {
  planned:    Color.fromCssColorString('#58a6ff').withAlpha(0.85),
  restricted: Color.fromCssColorString('#f85149').withAlpha(0.85),
  caution:    Color.fromCssColorString('#d29922').withAlpha(0.85),
  completed:  Color.fromCssColorString('#3fb950').withAlpha(0.85),
}

// ドローンアイコンをCanvasで生成（上面図・HUDスタイル）
function buildDroneCanvas(size = 72): HTMLCanvasElement {
  const c = document.createElement('canvas')
  c.width = size; c.height = size
  const ctx = c.getContext('2d')!
  const cx = size / 2, cy = size / 2
  const arm = size * 0.34, r = size * 0.14
  const col = '#39d353'      // tactical green
  const colDim = 'rgba(57,211,83,0.25)'
  const colGlow = 'rgba(57,211,83,0.12)'

  // グロー（外周リング）
  ctx.beginPath(); ctx.arc(cx, cy, size * 0.42, 0, Math.PI * 2)
  ctx.strokeStyle = colGlow; ctx.lineWidth = size * 0.18; ctx.stroke()

  // 4本アーム
  ctx.strokeStyle = col; ctx.lineWidth = size * 0.06; ctx.lineCap = 'round'
  for (const a of [45, 135, 225, 315]) {
    const rad = (a * Math.PI) / 180
    ctx.beginPath()
    ctx.moveTo(cx + size * 0.06 * Math.cos(rad), cy + size * 0.06 * Math.sin(rad))
    ctx.lineTo(cx + arm * Math.cos(rad), cy + arm * Math.sin(rad))
    ctx.stroke()
  }

  // ローター円
  for (const a of [45, 135, 225, 315]) {
    const rad = (a * Math.PI) / 180
    const rx = cx + arm * Math.cos(rad), ry = cy + arm * Math.sin(rad)
    ctx.beginPath(); ctx.arc(rx, ry, r, 0, Math.PI * 2)
    ctx.fillStyle = colDim; ctx.fill()
    ctx.strokeStyle = col; ctx.lineWidth = 1.5; ctx.stroke()
  }

  // 中心ボディ（六角形）
  ctx.beginPath()
  for (let i = 0; i < 6; i++) {
    const a = (i * 60 - 30) * Math.PI / 180
    const bx = cx + size * 0.1 * Math.cos(a), by = cy + size * 0.1 * Math.sin(a)
    i === 0 ? ctx.moveTo(bx, by) : ctx.lineTo(bx, by)
  }
  ctx.closePath()
  ctx.fillStyle = col; ctx.fill()

  // 機首方向インジケーター（上向き三角）
  ctx.beginPath()
  ctx.moveTo(cx, cy - size * 0.44)
  ctx.lineTo(cx - size * 0.06, cy - size * 0.32)
  ctx.lineTo(cx + size * 0.06, cy - size * 0.32)
  ctx.closePath()
  ctx.fillStyle = col; ctx.fill()

  return c
}

export function CesiumMap() {
  const containerRef = useRef<HTMLDivElement>(null)
  const viewerRef = useRef<Viewer | null>(null)
  const [sceneMode, setSceneMode] = useState<'3d' | '2d' | 'columbus'>('3d')
  const tilesetRef = useRef<Cesium3DTileset | null>(null)
  const selectedFeatureRef = useRef<Cesium3DTileFeature | null>(null)
  const handlerRef = useRef<ScreenSpaceEventHandler | null>(null)
  const staticEntitiesRef = useRef<Entity[]>([])
  const droneEntityRef = useRef<Entity | null>(null)
  const preRenderRemoveRef = useRef<(() => void) | null>(null)
  const overlayRef = useRef<HTMLDivElement>(null)

  const store = useDroneStore()

  // ── 初期化（マウント時のみ）────────────────────
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
      createWorldTerrainAsync().then((t) => {
        viewer.terrainProvider = t
        // depthTestAgainstTerrain は意図的に設定しない:
        // true にすると pickPosition() の挙動が変わりピッキング精度が下がる
      }).catch(() => {})
    }

    viewer.shadows = false
    viewer.scene.fog.enabled = true
    viewer.scene.globe.maximumScreenSpaceError = 1.5 // 地形クオリティ

    viewerRef.current = viewer
    cesiumViewerRef.current = viewer

    return () => {
      preRenderRemoveRef.current?.()
      handlerRef.current?.destroy()
      handlerRef.current = null
      viewer.destroy()
      viewerRef.current = null
      cesiumViewerRef.current = null
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── 都市切替（3D Tiles）────────────────────────
  useEffect(() => {
    const viewer = viewerRef.current
    if (!viewer) return
    const city = store.selectedCity

    if (tilesetRef.current) {
      viewer.scene.primitives.remove(tilesetRef.current)
      tilesetRef.current = null
    }

    if (overlayRef.current) {
      overlayRef.current.style.display = 'flex'
      overlayRef.current.textContent = ''
      const sp = document.createElement('div')
      sp.className = 'spinner'
      const p = document.createElement('p')
      p.textContent = `${city.name}の3D都市モデルを読み込み中...`
      overlayRef.current.append(sp, p)
    }

    Cesium3DTileset.fromUrl(city.tilesUrl, {
      maximumScreenSpaceError: 4, // ← 低いほど高精細（旧16 → 4）
    })
      .then((tileset) => {
        if (!city.hasTexture) {
          tileset.style = new Cesium3DTileStyle({
            color: { conditions: [['true', 'color("white", 0.95)']] },
          })
        }
        viewer.scene.primitives.add(tileset)
        tilesetRef.current = tileset

        // データエリアの中心・適切な高度でフライ（より近く・より急角度）
        viewer.camera.flyTo({
          destination: Cartesian3.fromDegrees(city.longitude, city.latitude, city.height),
          orientation: {
            heading: CesiumMath.toRadians(0),
            pitch: CesiumMath.toRadians(-55), // ← より急角度（旧-45 → -55）
            roll: 0,
          },
          duration: 2,
        })

        if (overlayRef.current) overlayRef.current.style.display = 'none'
      })
      .catch((e) => {
        if (overlayRef.current) {
          overlayRef.current.innerHTML = `<p style="color:#f85149;font-size:13px">読み込み失敗</p><small style="color:#8b949e;font-size:10px">${e}</small>`
        }
      })

    store.setBuildingProps(null)
    selectedFeatureRef.current = null
  }, [store.selectedCity]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── クリックイベント（モード別）────────────────
  useEffect(() => {
    const viewer = viewerRef.current
    if (!viewer) return

    handlerRef.current?.destroy()
    const handler = new ScreenSpaceEventHandler(viewer.canvas)
    handlerRef.current = handler

    handler.setInputAction((movement: { position: Cartesian2 }) => {
      const state = useDroneStore.getState()
      const mode = state.mapMode
      const pos = movement.position

      if (mode === 'select') {
        // 左クリックは地図操作のみ。エンティティポップアップは右クリックで開く。
        // 3D Tile 建物のハイライトだけ維持。
        if (selectedFeatureRef.current) {
          selectedFeatureRef.current.color = Color.WHITE.withAlpha(0.95)
          selectedFeatureRef.current = null
        }
        const picked = viewer.scene.pick(pos)
        // エンティティをクリックした場合はポップアップを閉じるだけ
        if (defined(picked) && picked.id instanceof Entity) {
          state.setMapPopup(null)
          return
        }
        // 3D Tile 建物はハイライト表示
        state.setMapPopup(null)
        if (picked instanceof Cesium3DTileFeature) {
          picked.color = Color.fromCssColorString('#58a6ff').withAlpha(0.95)
          selectedFeatureRef.current = picked
          const props: Record<string, unknown> = {}
          try {
            for (const name of picked.getPropertyIds()) props[name] = picked.getProperty(name)
          } catch { /* noop */ }
          state.setBuildingProps(props as never)
        } else {
          state.setBuildingProps(null)
        }
        return
      }

      // ── 地表座標取得 ──────────────────────────────────────────
      // globe.pick(ray): カメラからのレイと地形メッシュの交点を純粋な数学計算で求める。
      // 深度バッファ・エンティティ・レンダリング状態に完全非依存 → 最も安定した手法。
      // pickPosition() は PolylineGraphics 等で誤った深度を返すため使用しない。
      let cartesian: Cartesian3 | undefined

      const ray = viewer.camera.getPickRay(pos)
      if (ray) {
        const pt = viewer.scene.globe.pick(ray, viewer.scene)
        if (pt) cartesian = pt
      }

      // フォールバック: 楕円体面との交点を取得し、ロード済みタイルの地形高度で補正
      // （地形タイル未ロード時も視差ずれを最小化する）
      if (!cartesian) {
        const ell = viewer.camera.pickEllipsoid(pos, viewer.scene.globe.ellipsoid)
        if (ell) {
          const c = Cartographic.fromCartesian(ell)
          const h = viewer.scene.globe.getHeight(c)
          if (h != null) c.height = h
          cartesian = Cartographic.toCartesian(c)
        }
      }

      if (!cartesian) return

      const carto = Cartographic.fromCartesian(cartesian)
      const lon = CesiumMath.toDegrees(carto.longitude)
      const lat = CesiumMath.toDegrees(carto.latitude)
      const altM = carto.height   // 実際の海抜高度

      if (mode === 'pin') {
        useDroneStore.getState().addPin(lon, lat, altM)
        useDroneStore.getState().setMapMode('select')
      } else if (mode === 'zone') {
        useDroneStore.getState().addDrawingPoint(lon, lat)
      } else if (mode === 'waypoint') {
        const { activePlanId, addWaypoint } = useDroneStore.getState()
        // carto.height = globe.pick() で得た地盤高(MSL) をそのまま groundAlt として保存
        if (activePlanId) addWaypoint(activePlanId, lon, lat, altM)
      }
    }, ScreenSpaceEventType.LEFT_CLICK)

    // ダブルクリック: zone モード → ゾーン確定のみ
    handler.setInputAction((movement: { position: Cartesian2 }) => {
      const { mapMode, drawingZonePoints, commitZone } = useDroneStore.getState()
      const pos = movement.position

      if (mapMode === 'zone') {
        const pts = drawingZonePoints.slice(0, -2)
        if (pts.length >= 3) {
          const name = prompt('ゾーン名を入力', 'フライトゾーン') ?? 'フライトゾーン'
          commitZone(name, 'planned', pts)
        }
        return
      }
      // select モードのダブルクリックは地図ズームに任せる（何もしない）
      void movement.position
    }, ScreenSpaceEventType.LEFT_DOUBLE_CLICK)

    // 右クリック:
    //   zone モード → 最後の頂点をアンドゥ
    //   select モード + エンティティ → ポップアップ表示（編集・削除はポップアップ内で行う）
    //   その他 → ポップアップ閉じる
    handler.setInputAction((movement: { position: Cartesian2 }) => {
      const { mapMode, drawingZonePoints, removeLastDrawingPoint, setMapMode, setMapPopup } = useDroneStore.getState()
      const pos = movement.position

      if (mapMode === 'zone') {
        if (drawingZonePoints.length > 0) removeLastDrawingPoint()
        else setMapMode('select')
        return
      }

      if (mapMode === 'select') {
        const picked = viewer.scene.pick(pos)
        if (defined(picked) && picked.id instanceof Entity) {
          const eid: string = (picked.id as Entity).id ?? ''
          if (eid.startsWith('pin:')) {
            setMapPopup({ type: 'pin', id: eid.slice(4), x: pos.x, y: pos.y })
            return
          }
          if (eid.startsWith('zone:')) {
            setMapPopup({ type: 'zone', id: eid.slice(5), x: pos.x, y: pos.y })
            return
          }
          if (eid.startsWith('wp:')) {
            const parts = eid.split(':')
            setMapPopup({ type: 'waypoint', id: parts[2], planId: parts[1], x: pos.x, y: pos.y })
            return
          }
        }
      }

      setMapPopup(null)
    }, ScreenSpaceEventType.RIGHT_CLICK)

    // Escape キー: モードリセット / ポップアップ閉じる
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      const { mapMode, setMapMode, resetDrawingPoints } = useDroneStore.getState()
      if (mapMode === 'zone') resetDrawingPoints()
      if (mapMode !== 'select') setMapMode('select')
      useDroneStore.getState().setMapPopup(null)
    }
    window.addEventListener('keydown', onKeyDown)

    return () => {
      handlerRef.current?.destroy()
      handlerRef.current = null
      window.removeEventListener('keydown', onKeyDown)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── 静的エンティティ更新（ピン・ゾーン・WP）────
  useEffect(() => {
    const viewer = viewerRef.current
    if (!viewer) return

    const { pins, zones, plans, activePlanId, drawingZonePoints } = useDroneStore.getState()

    staticEntitiesRef.current.forEach((e) => viewer.entities.remove(e))
    staticEntitiesRef.current = []

    const add = (e: Entity) => {
      viewer.entities.add(e)
      staticEntitiesRef.current.push(e)
      return e
    }

    // ── ピン ──
    for (const pin of pins) {
      add(new Entity({
        id: `pin:${pin.id}`,
        position: new ConstantPositionProperty(
          Cartesian3.fromDegrees(pin.lon, pin.lat, pin.alt + 3)
        ),
        point: {
          pixelSize: 13,
          color: Color.fromCssColorString(pin.color),
          outlineColor: Color.WHITE,
          outlineWidth: 2,
          heightReference: HeightReference.RELATIVE_TO_GROUND,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        },
        label: {
          text: pin.name,
          font: '13px "DM Sans"',
          fillColor: Color.WHITE,
          outlineColor: Color.BLACK,
          outlineWidth: 2,
          style: LabelStyle.FILL_AND_OUTLINE,
          verticalOrigin: VerticalOrigin.BOTTOM,
          horizontalOrigin: HorizontalOrigin.CENTER,
          pixelOffset: { x: 0, y: -16 } as never,
          scaleByDistance: new NearFarScalar(200, 1, 4000, 0.3),
          heightReference: HeightReference.RELATIVE_TO_GROUND,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        },
      }))
    }

    // ── ゾーン ──
    for (const zone of zones) {
      if (zone.coordinates.length < 3) continue
      const positions = zone.coordinates.map(([lon, lat]) => Cartesian3.fromDegrees(lon, lat))
      const centerLon = zone.coordinates.reduce((s, c) => s + c[0], 0) / zone.coordinates.length
      const centerLat = zone.coordinates.reduce((s, c) => s + c[1], 0) / zone.coordinates.length

      add(new Entity({
        id: `zone:${zone.id}`,
        position: new ConstantPositionProperty(Cartesian3.fromDegrees(centerLon, centerLat, 20)),
        polygon: {
          hierarchy: new PolygonHierarchy(positions),
          material: ZONE_FILL[zone.type] ?? Color.BLUE.withAlpha(0.2),
          outline: true,
          outlineColor: ZONE_EDGE[zone.type] ?? Color.BLUE,
          outlineWidth: 2,
          heightReference: HeightReference.CLAMP_TO_GROUND,
        },
        label: {
          text: zone.name,
          font: '12px "DM Sans"',
          fillColor: Color.WHITE,
          outlineColor: Color.BLACK,
          outlineWidth: 2,
          style: LabelStyle.FILL_AND_OUTLINE,
          verticalOrigin: VerticalOrigin.CENTER,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        },
      }))
    }

    // ── 描画中ゾーン プレビュー ──
    if (drawingZonePoints.length > 0) {
      const pts = [...drawingZonePoints]
      const linePos = [
        ...pts.map(([lon, lat]) => Cartesian3.fromDegrees(lon, lat, 5)),
        ...(pts.length >= 2 ? [Cartesian3.fromDegrees(pts[0][0], pts[0][1], 5)] : []),
      ]
      add(new Entity({
        polyline: {
          positions: linePos, width: 2, clampToGround: true,
          material: new PolylineGlowMaterialProperty({
            glowPower: 0.2, color: Color.fromCssColorString('#58a6ff').withAlpha(0.9),
          }),
        },
      }))
      for (const [lon, lat] of pts) {
        add(new Entity({
          position: new ConstantPositionProperty(Cartesian3.fromDegrees(lon, lat, 5)),
          point: {
            pixelSize: 9,
            color: Color.fromCssColorString('#58a6ff'),
            outlineColor: Color.WHITE, outlineWidth: 2,
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
          },
        }))
      }
    }

    // ── アクティブ計画のウェイポイント ──
    const activePlan = plans.find((p) => p.id === activePlanId)
    if (activePlan && activePlan.waypoints.length > 0) {
      const wps = activePlan.waypoints

      if (wps.length >= 2) {
        // ルートライン: groundAlt + altAGL = 実際のMSL高度で描画
        add(new Entity({
          polyline: {
            positions: wps.map((w) => Cartesian3.fromDegrees(w.lon, w.lat, w.groundAlt + w.altAGL)),
            width: 3,
            clampToGround: false,
            material: new PolylineGlowMaterialProperty({
              glowPower: 0.35, color: Color.fromCssColorString('#7ee8a2').withAlpha(0.9),
            }),
          },
        }))
        // 垂直プロファイル可視化（高度の段差が一目でわかる）
        for (let i = 0; i < wps.length - 1; i++) {
          const a = wps[i], b = wps[i + 1]
          const aMsl = a.groundAlt + a.altAGL, bMsl = b.groundAlt + b.altAGL
          if (Math.abs(aMsl - bMsl) > 5) {
            add(new Entity({
              polyline: {
                positions: [
                  Cartesian3.fromDegrees(b.lon, b.lat, aMsl),
                  Cartesian3.fromDegrees(b.lon, b.lat, bMsl),
                ],
                width: 2,
                material: Color.fromCssColorString('#7ee8a2').withAlpha(0.4),
              },
            }))
          }
        }
      }

      wps.forEach((wp, idx) => {
        const isFirst = idx === 0, isLast = idx === wps.length - 1
        const mslAlt = wp.groundAlt + wp.altAGL   // 実際の海抜高度(MSL)
        add(new Entity({
          // クリック検出のため wp: プレフィックスで planId:wpId を格納
          id: `wp:${activePlanId}:${wp.id}`,
          position: new ConstantPositionProperty(
            Cartesian3.fromDegrees(wp.lon, wp.lat, mslAlt)
          ),
          point: {
            pixelSize: isFirst || isLast ? 16 : 12,
            color: isFirst
              ? Color.fromCssColorString('#3fb950')
              : isLast ? Color.fromCssColorString('#f85149')
              : Color.fromCssColorString('#7ee8a2'),
            outlineColor: Color.WHITE, outlineWidth: 2,
            heightReference: HeightReference.NONE,
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
          },
          label: {
            text: `WP${idx + 1}\n地上${wp.altAGL}m`,
            font: '12px sans-serif',
            fillColor: Color.WHITE, outlineColor: Color.BLACK, outlineWidth: 2,
            style: LabelStyle.FILL_AND_OUTLINE,
            verticalOrigin: VerticalOrigin.BOTTOM,
            pixelOffset: { x: 0, y: -16 } as never,
            scaleByDistance: new NearFarScalar(100, 1, 6000, 0.2),
            heightReference: HeightReference.NONE,
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
          },
        }))
        // 高度バー（地盤高MSL から飛行高度MSL まで）
        add(new Entity({
          polyline: {
            positions: [
              Cartesian3.fromDegrees(wp.lon, wp.lat, wp.groundAlt),
              Cartesian3.fromDegrees(wp.lon, wp.lat, mslAlt),
            ],
            width: 1,
            material: Color.WHITE.withAlpha(0.25),
          },
        }))
      })
    }
  }, [ // eslint-disable-line react-hooks/exhaustive-deps
    store.pins, store.zones, store.plans, store.activePlanId, store.drawingZonePoints,
  ])

  // ── ドローンシミュレーション（CallbackProperty）─
  useEffect(() => {
    const viewer = viewerRef.current
    if (!viewer) return

    // 既存ドローンエンティティ削除
    if (droneEntityRef.current) {
      viewer.entities.remove(droneEntityRef.current)
      droneEntityRef.current = null
    }
    preRenderRemoveRef.current?.()
    preRenderRemoveRef.current = null

    if (!store.simulation) {
      droneSimBridge.active = false
      viewer.trackedEntity = undefined
      return
    }

    droneSimBridge.active = true

    // ─ ドローン位置: groundAlt (地盤高MSL) + altAGL (地上高) = 絶対高度
    // groundAlt は preRender ループで globe.getHeight() から毎フレーム更新される
    const dronePositionCB = new CallbackProperty(() => {
      return Cartesian3.fromDegrees(
        droneSimBridge.lon,
        droneSimBridge.lat,
        droneSimBridge.groundAlt + droneSimBridge.altAGL,
      )
    }, false)

    // ─ ドローンアイコン（Canvas ビルボード）
    const iconCanvas = buildDroneCanvas(56)

    // POVモード時はドローン本体を非表示（カメラがドローン視点のため）
    const droneVisible = new CallbackProperty(
      () => droneSimBridge.cameraMode !== 'pov',
      false
    )

    const droneEntity = viewer.entities.add(new Entity({
      position: dronePositionCB as never,
      billboard: {
        image: iconCanvas,
        width: 48, height: 48,
        verticalOrigin: VerticalOrigin.CENTER,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
        rotation: new CallbackProperty(() => (Date.now() / 500) % (Math.PI * 2), false) as never,
        show: droneVisible as never,
      },
      label: {
        text: new CallbackProperty(() => {
          const alt = droneSimBridge.altAGL.toFixed(0)
          const hdg = Math.round(((droneSimBridge.heading % 360) + 360) % 360)
          return `▲ ${alt}m  HDG ${hdg}°`
        }, false) as never,
        font: '700 11px "Space Grotesk", monospace',
        fillColor: Color.fromCssColorString('#39d353'),
        outlineColor: Color.fromCssColorString('#0d1117'),
        outlineWidth: 3,
        style: LabelStyle.FILL_AND_OUTLINE,
        verticalOrigin: VerticalOrigin.BOTTOM,
        pixelOffset: { x: 0, y: -40 } as never,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
        show: droneVisible as never,
      },
      // カメラFOVコーン（地面投影楕円）
      ellipse: {
        semiMinorAxis: new CallbackProperty(
          () => droneSimBridge.altAGL * Math.tan(((25 * Math.PI) / 180) / 2), false
        ),
        semiMajorAxis: new CallbackProperty(
          () => droneSimBridge.altAGL * Math.tan(((25 * Math.PI) / 180) / 2), false
        ),
        height: 0,
        material: Color.fromCssColorString('#f0c040').withAlpha(0.12),
        outline: true,
        outlineColor: Color.fromCssColorString('#f0c040').withAlpha(0.5),
        heightReference: HeightReference.CLAMP_TO_GROUND,
        show: droneVisible as never,
      },
    }))

    droneEntityRef.current = droneEntity

    // ─ カメラ追従 + 地盤高更新（preRender で毎フレーム実行）
    const removeCameraListener = viewer.scene.preRender.addEventListener(() => {
      const sim = useDroneStore.getState().simulation
      if (!sim || !droneSimBridge.active) return

      // 地盤高を同期取得（ロード済みタイルから高速に返る）
      const carto = Cartographic.fromDegrees(droneSimBridge.lon, droneSimBridge.lat)
      droneSimBridge.groundAlt = viewer.scene.globe.getHeight(carto) ?? 0

      const pos = Cartesian3.fromDegrees(
        droneSimBridge.lon,
        droneSimBridge.lat,
        droneSimBridge.groundAlt + droneSimBridge.altAGL,
      )
      const headingRad = CesiumMath.toRadians(droneSimBridge.heading)

      // droneSimBridge.cameraMode を常に同期（show CallbackProperty が参照）
      droneSimBridge.cameraMode = sim.cameraMode

      if (sim.cameraMode === 'follow') {
        // 追従: 後方から近距離で追う
        const followDist = Math.max(60, droneSimBridge.altAGL * 2.0)
        viewer.camera.lookAt(pos, new HeadingPitchRange(headingRad + Math.PI, CesiumMath.toRadians(-25), followDist))
      } else if (sim.cameraMode === 'pov') {
        // POV: ドローン視点（一人称）
        // ECEFオフセットは無意味（日本のECEF X軸≠東方向）なので pos をそのまま使用。
        // setView の heading/pitch がローカルENU方向を正しく解釈する。
        viewer.camera.setView({
          destination: pos,
          orientation: {
            heading: headingRad,
            pitch: CesiumMath.toRadians(-20),
            roll: 0,
          },
        })
      }
    })

    preRenderRemoveRef.current = removeCameraListener

    return () => {
      if (droneEntityRef.current) {
        viewerRef.current?.entities.remove(droneEntityRef.current)
        droneEntityRef.current = null
      }
      removeCameraListener()
      preRenderRemoveRef.current = null
      droneSimBridge.active = false
    }
  }, [store.simulation?.planId]) // planIdが変わった時だけエンティティを再生成

  // ── カメラモード変更（free に戻す時 lookAt 解除）
  useEffect(() => {
    const viewer = viewerRef.current
    if (!viewer) return
    if (store.simulation?.cameraMode === 'free') {
      // Matrix4.IDENTITY でロック解除（カメラ位置が origin のときの NaN を回避）
      try { viewer.camera.lookAtTransform(Matrix4.IDENTITY) } catch { /* noop */ }
    }
  }, [store.simulation?.cameraMode])

  // ── 場所検索 flyTo イベント ──────────────────
  useEffect(() => {
    const handler = (e: CustomEvent<{ lat: number; lon: number }>) => {
      viewerRef.current?.camera.flyTo({
        destination: Cartesian3.fromDegrees(e.detail.lon, e.detail.lat, 600),
        orientation: { heading: 0, pitch: CesiumMath.toRadians(-50), roll: 0 },
        duration: 1.5,
      })
    }
    window.addEventListener('cesium:flyTo', handler as EventListener)
    return () => window.removeEventListener('cesium:flyTo', handler as EventListener)
  }, [])

  // ── データエリアへ戻るイベント ────────────────
  useEffect(() => {
    const handler = () => {
      const city = useDroneStore.getState().selectedCity
      viewerRef.current?.camera.flyTo({
        destination: Cartesian3.fromDegrees(city.longitude, city.latitude, city.height),
        orientation: { heading: 0, pitch: CesiumMath.toRadians(-55), roll: 0 },
        duration: 1.5,
      })
    }
    window.addEventListener('cesium:flyToCity', handler)
    return () => window.removeEventListener('cesium:flyToCity', handler)
  }, [])

  const handleResetCamera = () => {
    const viewer = viewerRef.current
    if (!viewer) return
    const c = viewer.camera
    viewer.camera.setView({
      destination: c.position,
      orientation: { heading: c.heading, pitch: c.pitch, roll: 0 },
    })
  }

  const handleZoom = (dir: 'in' | 'out') => {
    const viewer = viewerRef.current
    if (!viewer) return
    const amount = viewer.camera.positionCartographic.height * 0.3
    dir === 'in' ? viewer.camera.zoomIn(amount) : viewer.camera.zoomOut(amount)
  }

  const handleSceneMode = (mode: '3d' | '2d' | 'columbus') => {
    const viewer = viewerRef.current
    if (!viewer) return
    // morphTo 系は現在の視点位置を保持したままモードを切り替える
    // duration=0.6 で自然なアニメーション遷移
    if (mode === '3d') viewer.scene.morphTo3D(0.6)
    else if (mode === '2d') viewer.scene.morphTo2D(0.6)
    else viewer.scene.morphToColumbusView(0.6)
    setSceneMode(mode)
  }

  return (
    <div className="cesium-wrapper">
      <div ref={containerRef} className="cesium-container" />
      <div ref={overlayRef} className="overlay loading" style={{ display: 'flex' }}>
        <div className="spinner" />
        <p>3D都市モデルを読み込み中...</p>
      </div>

      {/* ── マップコントロールパネル ── */}
      <div className="map-controls">
        {/* 2D / Columbus / 3D 切り替え */}
        <div className="map-ctrl-group">
          <button
            className={`map-ctrl-btn${sceneMode === '2d' ? ' active' : ''}`}
            onClick={() => handleSceneMode('2d')}
            title="2D平面マップ"
          >2D</button>
          <button
            className={`map-ctrl-btn${sceneMode === 'columbus' ? ' active' : ''}`}
            onClick={() => handleSceneMode('columbus')}
            title="2.5D コロンバスビュー"
          >2.5D</button>
          <button
            className={`map-ctrl-btn${sceneMode === '3d' ? ' active' : ''}`}
            onClick={() => handleSceneMode('3d')}
            title="3Dグローブ"
          >3D</button>
        </div>

        <div className="map-ctrl-divider" />

        {/* ズーム */}
        <button className="map-ctrl-btn map-ctrl-icon" onClick={() => handleZoom('in')} title="ズームイン">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}>
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
        </button>
        <button className="map-ctrl-btn map-ctrl-icon" onClick={() => handleZoom('out')} title="ズームアウト">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
        </button>

        <div className="map-ctrl-divider" />

        {/* 傾きリセット */}
        <button className="map-ctrl-btn map-ctrl-icon" onClick={handleResetCamera} title="画面の傾きをリセット">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M12 2 L12 6 M12 18 L12 22 M2 12 L6 12 M18 12 L22 12"/>
            <circle cx="12" cy="12" r="5"/>
            <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none"/>
          </svg>
        </button>
      </div>
    </div>
  )
}
