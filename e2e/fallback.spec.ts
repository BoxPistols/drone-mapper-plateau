import { expect, test } from '@playwright/test'

test.describe('WebGL が使えない環境', () => {
  test('地図の代わりに製品紹介・動画・直し方を出し、例外を出さない', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(e.message))

    await page.goto('./')

    const fallback = page.getByTestId('webgl-fallback')
    await expect(fallback.getByRole('heading', { name: '3D 地図を表示できません' })).toBeVisible()
    // 生のエラー文ではなく、見立てた原因を日本語で出す
    await expect(page.getByTestId('webgl-fallback-cause')).toContainText('WebGL')
    await expect(fallback).not.toContainText('公開URL')

    const video = fallback.locator('video')
    await expect(video).toBeVisible()
    await expect(video).toHaveAttribute('poster', /demo\/drone-mapper-plateau-poster\.jpg$/)
    await expect(video).toHaveAttribute('playsinline', '')
    await expect(video.locator('source')).toHaveAttribute('src', /demo\/drone-mapper-plateau\.mp4$/)
    await expect(video.locator('track[kind="captions"]')).toHaveCount(1)
    const src = await video.locator('source').getAttribute('src')
    const res = await page.request.get(new URL(src!, page.url()).toString())
    expect(res.status()).toBe(200)
    expect(res.headers()['content-type']).toContain('video/mp4')

    await expect(fallback.getByRole('link', { name: 'GitHub で README を読む' })).toHaveAttribute('href', /github\.com\/BoxPistols\/drone-mapper-plateau/)
    await expect(fallback.getByRole('listitem')).not.toHaveCount(0)

    // 地図を前提にした初回案内やツールバーは出さない。Cesium の画面も作らない
    await expect(page.locator('.cesium-widget')).toHaveCount(0)
    await expect(page.locator('.welcome-overlay, [aria-labelledby="welcome-title"]')).toHaveCount(0)
    // 地図の上で飛ぶデモフライトは押しても見えないので出さない。計画一覧などのサイドバーは残す
    await expect(page.getByRole('button', { name: 'デモフライトを見る' })).toHaveCount(0)
    await expect(page.getByRole('button', { name: /飛行計画/ }).first()).toBeVisible()

    const retry = fallback.getByRole('button', { name: 'もう一度試す' })
    await expect(retry).toBeVisible()
    const box = await retry.boundingBox()
    expect(box!.height).toBeGreaterThanOrEqual(44)
    await retry.click()
    await expect(fallback.getByRole('status')).toContainText('まだ WebGL を使えません')

    expect(errors).toEqual([])
  })

  test('スマートフォン幅でも横にはみ出さない', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 760 })
    await page.goto('./')
    const fallback = page.getByTestId('webgl-fallback')
    await expect(fallback.locator('video')).toBeVisible()
    const overflow = await fallback.evaluate((el) => el.scrollWidth - el.clientWidth)
    expect(overflow).toBeLessThanOrEqual(0)
  })
})
