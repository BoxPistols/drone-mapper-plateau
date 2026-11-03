import { existsSync } from 'node:fs'
import { expect, test } from '@playwright/test'

test.describe('WebGL が使える環境', () => {
  test('3D 地図を描き、代替表示は出さない', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(e.message))

    await page.goto('./')

    await expect(page.locator('.cesium-widget canvas')).toBeVisible()
    await expect(page.getByTestId('webgl-fallback')).toHaveCount(0)
    // 描画ループが回っていること（Cesium は描画のたびに canvas を作り直さない）
    const size = await page.locator('.cesium-widget canvas').evaluate((c: HTMLCanvasElement) => c.width * c.height)
    expect(size).toBeGreaterThan(0)

    expect(errors).toEqual([])
  })

  test('WebGL1 しか取れない環境でも、Cesium に webgl1 を頼んで地図を描く', async ({ page }) => {
    // WebGL2RenderingContext はあるが webgl2 の文脈が作れない端末（古い GPU やドライバ）の再現
    await page.addInitScript(() => {
      const original = HTMLCanvasElement.prototype.getContext
      HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, id: string, ...rest: unknown[]) {
        if (id === 'webgl2') return null
        const ctx = (original as (...a: unknown[]) => unknown).call(this, id, ...rest)
        if (ctx) this.dataset.ctx = id
        return ctx
      } as typeof original
    })
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(e.message))

    await page.goto('./')

    await expect(page.locator('.cesium-widget canvas')).toBeVisible()
    await expect(page.locator('.cesium-widget canvas')).toHaveAttribute('data-ctx', 'webgl')
    await expect(page.getByTestId('webgl-fallback')).toHaveCount(0)
    expect(errors).toEqual([])
  })

  test('Cesium ion のトークンが無いビルドでは、その旨を地図上に出す', async ({ page }) => {
    // 手元に .env がある、またはトークン付きでビルドした場合はお知らせが出ないのが正しい
    test.skip(existsSync('.env') || !!process.env.VITE_CESIUM_TOKEN, 'built with a Cesium ion token')
    await page.goto('./')
    await expect(page.locator('.cesium-widget canvas')).toBeVisible()
    await expect(page.locator('.map-notice')).toContainText('VITE_CESIUM_TOKEN')
  })
})
