// 操作手順の番号と見出しはここだけで定義する。
// 以前はサイドバー・マップパネル・ガイド・ヘルプで番号が3系統に分かれ、初見の人が迷っていた
import type { SidebarTab } from '../types'

export interface StepDef {
  id: 'city' | 'route' | 'fly'
  number: number
  title: string
  /** この手順を行うサイドバーのタブ */
  tab: SidebarTab
  /** 完了の目安（ヘルプに表示） */
  doneWhen: string
}

export const STEPS: readonly StepDef[] = [
  { id: 'city',  number: 1, title: 'まちを選ぶ',       tab: 'map',   doneWhen: '見たい都市を選ぶ（最初は台東区）' },
  { id: 'route', number: 2, title: 'ルートを引く',     tab: 'plans', doneWhen: '飛行計画に通過ポイントを2つ以上置く' },
  { id: 'fly',   number: 3, title: '飛ばして確かめる', tab: 'plans', doneWhen: 'シミュレーションを最後まで見る' },
]

export function stepById(id: StepDef['id']): StepDef {
  const s = STEPS.find((x) => x.id === id)
  if (!s) throw new Error(`unknown step: ${id}`)
  return s
}

/** "STEP 2" のような表記 */
export function stepLabel(id: StepDef['id']): string {
  return `STEP ${stepById(id).number}`
}

/** タブに付ける番号（そのタブで行う最初の手順） */
export function firstStepOfTab(tab: SidebarTab): StepDef | undefined {
  return STEPS.find((s) => s.tab === tab)
}
