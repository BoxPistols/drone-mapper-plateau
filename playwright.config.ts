import { defineConfig, devices } from '@playwright/test'

const PORT = Number(process.env.PORT ?? 4179)
const ORIGIN = `http://127.0.0.1:${PORT}`

// 本番と同じ base（/drone-mapper-plateau/）で配信される dist/ を相手にする。先に `npm run build` が要る
export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  use: {
    baseURL: `${ORIGIN}/drone-mapper-plateau/`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      // GPU を持たない CI でも地図が描けるよう、CPU 実装の SwiftShader で WebGL を動かす
      name: 'webgl-swiftshader',
      testMatch: /map\.spec\.ts$/,
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: { args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] },
      },
    },
    {
      // ハードウェアアクセラレーションを切られた・管理ポリシーで止められた環境の再現
      name: 'webgl-disabled',
      testMatch: /fallback\.spec\.ts$/,
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: { args: ['--disable-webgl', '--disable-3d-apis'] },
      },
    },
  ],
  webServer: {
    command: `npx vite preview --port ${PORT} --host 127.0.0.1 --strictPort`,
    url: `${ORIGIN}/drone-mapper-plateau/`,
    reuseExistingServer: false,
    timeout: 60_000,
  },
})
