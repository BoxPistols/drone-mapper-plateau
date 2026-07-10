import { defineConfig } from 'vitest/config'

// Cesium は WebGL/canvas 依存で jsdom では動かないため、
// テストは純粋ロジック（sim/utils/store）に限定する。
// UI コンポーネントの描画テストが必要になったら environment を 'jsdom' に切り替える。
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    globals: true,
  },
})
