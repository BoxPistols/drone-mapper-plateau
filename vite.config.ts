import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import cesium from 'vite-plugin-cesium'
import { existsSync, rmSync, renameSync } from 'fs'
import path from 'path'

const base = '/drone-mapper-plateau/'

// vite-plugin-cesium が dist/drone-mapper-plateau/cesium/ にコピーするバグを修正
// GitHub Pages では dist/ が /drone-mapper-plateau/ として配信されるため
// dist/cesium/ に置く必要がある
function fixCesiumBasePath(): Plugin {
  return {
    name: 'fix-cesium-base-path',
    closeBundle: {
      sequential: true,
      order: 'post',
      handler() {
        const wrongPath = path.join('dist', base, 'cesium')
        const rightPath = path.join('dist', 'cesium')
        if (existsSync(wrongPath)) {
          renameSync(wrongPath, rightPath)
          // 空ディレクトリを削除
          const emptyDir = path.join('dist', base.split('/').filter(Boolean)[0])
          if (existsSync(emptyDir)) rmSync(emptyDir, { recursive: true })
        }
      },
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), cesium(), fixCesiumBasePath()],
  base,
})
