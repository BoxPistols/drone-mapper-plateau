// グローバルなキーボードショートカットが入力欄のタイピングを奪わないための共通判定。
// SimPlayer / PhotoViewer など複数の window keydown リスナーで使う。
export function isEditableTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null
  if (!el || !el.tagName) return false
  const tag = el.tagName.toLowerCase()
  return tag === 'input' || tag === 'textarea' || tag === 'select' || el.isContentEditable
}
