import { useEffect, useRef } from 'react'

// モーダルのアクセシビリティ共通処理:
// - Escape キーで閉じる
// - 開いた瞬間にモーダル内先頭のフォーカス可能要素へフォーカス移動
// - Tab を内部にトラップ（背後の要素へ抜けない）
// role="dialog" aria-modal="true" は各モーダル側で付与する。
export function useModalA11y<T extends HTMLElement>(onClose: () => void) {
  const ref = useRef<T>(null)

  useEffect(() => {
    const container = ref.current

    const focusable = () =>
      Array.from(
        container?.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        ) ?? []
      ).filter((el) => !el.hasAttribute('disabled') && el.offsetParent !== null)

    // 初期フォーカス
    const first = focusable()[0]
    first?.focus()

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
        return
      }
      if (e.key === 'Tab') {
        const items = focusable()
        if (items.length === 0) return
        const firstEl = items[0]
        const lastEl = items[items.length - 1]
        if (e.shiftKey && document.activeElement === firstEl) {
          e.preventDefault(); lastEl.focus()
        } else if (!e.shiftKey && document.activeElement === lastEl) {
          e.preventDefault(); firstEl.focus()
        }
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return ref
}
