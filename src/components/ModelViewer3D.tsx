import { useRef, useEffect } from 'react'
import type { MediaItem } from '../types'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

export function ModelViewer3D({ item: _item }: { item: MediaItem }) {
  const mountRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = mountRef.current
    if (!container) return

    // シーン
    const scene = new THREE.Scene()
    scene.background = new THREE.Color('#0f172a')
    scene.fog = new THREE.Fog('#0f172a', 30, 80)

    // カメラ
    const camera = new THREE.PerspectiveCamera(
      50,
      container.clientWidth / container.clientHeight,
      0.1,
      200
    )
    camera.position.set(15, 12, 15)

    // レンダラー
    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(container.clientWidth, container.clientHeight)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    container.appendChild(renderer.domElement)

    // コントロール
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.autoRotate = true
    controls.autoRotateSpeed = 1.5
    controls.enableDamping = true
    controls.dampingFactor = 0.05
    controls.target.set(0, 3, 0)

    // グリッド
    const grid = new THREE.GridHelper(40, 40, '#334155', '#1e293b')
    scene.add(grid)

    // ライト
    const ambient = new THREE.AmbientLight('#94a3b8', 0.6)
    scene.add(ambient)
    const directional = new THREE.DirectionalLight('#e2e8f0', 0.8)
    directional.position.set(10, 15, 5)
    scene.add(directional)

    // ワイヤーフレーム建物群（7棟）
    const buildings = [
      { w: 3, h: 8, d: 3, x: 0, z: 0 },
      { w: 2, h: 5, d: 4, x: 5, z: -2 },
      { w: 4, h: 12, d: 3, x: -5, z: 3 },
      { w: 2.5, h: 6, d: 2.5, x: 3, z: 5 },
      { w: 3, h: 10, d: 2, x: -3, z: -5 },
      { w: 2, h: 4, d: 3, x: 7, z: 4 },
      { w: 3.5, h: 7, d: 3.5, x: -7, z: -3 },
    ]

    const wireframeMat = new THREE.MeshBasicMaterial({
      color: '#60a5fa',
      wireframe: true,
      transparent: true,
      opacity: 0.6,
    })

    buildings.forEach(({ w, h, d, x, z }) => {
      const geo = new THREE.BoxGeometry(w, h, d)
      const mesh = new THREE.Mesh(geo, wireframeMat)
      mesh.position.set(x, h / 2, z)
      scene.add(mesh)
    })

    // アニメーションループ
    let animId: number
    const animate = () => {
      animId = requestAnimationFrame(animate)
      controls.update()
      renderer.render(scene, camera)
    }
    animate()

    // リサイズ対応
    const onResize = () => {
      if (!container) return
      const w = container.clientWidth
      const h = container.clientHeight
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
    }
    window.addEventListener('resize', onResize)

    // クリーンアップ
    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', onResize)
      controls.dispose()
      renderer.dispose()
      wireframeMat.dispose()
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose()
        }
      })
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement)
      }
    }
  }, [])

  return (
    <div className="media-viewer-model3d" ref={mountRef}>
      <span className="media-viewer-model3d-hint">ドラッグで回転</span>
    </div>
  )
}
