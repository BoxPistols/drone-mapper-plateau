// 3D 地図を出せないときの文言。原因・直し方は BoxPistols/drone-show-simulator (#54) の WebglNotice と揃えている
import type { BrowserKind, PlatformKind, TilesFailureKind, WebglFailureKind } from '../utils/webgl'

/** 文中の chrome:// などはページからリンクできないので、選んでコピーできる code として出す */
export type CopySegment = string | { code: string }
export type CopyLine = CopySegment[]
export type FixGuide = { steps: CopyLine[]; note?: CopyLine }

const NAMES: Record<BrowserKind, string> = {
  chrome: 'Chrome',
  edge: 'Edge',
  firefox: 'Firefox',
  safari: 'Safari',
  opera: 'Opera',
  samsung: 'Samsung Internet',
  other: 'ブラウザ',
}

const RESTART_NOTE: CopyLine = ['オンでも表示されないときは、ブラウザを完全に終了して開き直してください。']
const VERIFY_CHROME: CopyLine = [' で「WebGL」「WebGL2」が Hardware accelerated になっていれば有効です。']

/** OS とブラウザの組み合わせごとの直し方。1 手順 1 行に収める */
export function fixGuide(browser: BrowserKind, platform: PlatformKind): FixGuide {
  if (platform === 'ios') {
    // iOS のブラウザはすべて中身が Safari なので、設定は端末側
    const name = browser === 'other' ? 'お使いのブラウザ' : NAMES[browser]
    return {
      steps: [
        ['「設定」→「プライバシーとセキュリティ」で「ロックダウンモード」を確認'],
        browser === 'safari'
          ? ['オンなら、アドレスバー左の「ぁあ」→「Web サイトの設定」で、このサイトだけオフ']
          : [`オンなら、ロックダウンモードの「Web ブラウズを設定」で ${name} を除外`],
        ['iOS / iPadOS を最新にして、ブラウザを開き直す'],
      ],
    }
  }
  if (platform === 'android') {
    return {
      steps: [
        ['Google Play でブラウザを、設定で Android を最新にする'],
        ['ブラウザを最近使ったアプリの一覧から閉じて、開き直す'],
        ['直らなければ、パソコンで開く'],
      ],
    }
  }
  switch (browser) {
    case 'chrome':
      return {
        steps: [
          [{ code: 'chrome://settings/system' }, ' をアドレスバーに貼って開く'],
          ['「グラフィック アクセラレーションが使用可能な場合は使用する」をオン'],
          ['横に出る「再起動」を押す'],
        ],
        note: [{ code: 'chrome://gpu' }, ...VERIFY_CHROME, ' Brave は ', { code: 'brave://settings/system' }, ' で同じ手順です。'],
      }
    case 'edge':
      return {
        steps: [
          [{ code: 'edge://settings/system' }, ' をアドレスバーに貼って開く'],
          ['「使用可能な場合はグラフィック アクセラレータを使用する」をオン'],
          ['Edge を再起動する'],
        ],
        note: [{ code: 'edge://gpu' }, ...VERIFY_CHROME],
      }
    case 'opera':
      return {
        steps: [
          [{ code: 'opera://settings' }, ' を開き、「ハードウェア」で検索'],
          ['「ハードウェアアクセラレーションを使用する」をオン'],
          ['Opera を再起動する'],
        ],
        note: RESTART_NOTE,
      }
    case 'firefox':
      return {
        steps: [
          ['「設定」→「一般」→「パフォーマンス」を開く'],
          ['「推奨のパフォーマンス設定を使用する」を外し、「ハードウェアアクセラレーションを使用する」をオン'],
          ['Firefox を再起動する'],
        ],
        // webgl.disabled を false に戻すのは初期状態に戻すだけ
        note: ['まだ表示されないときは ', { code: 'about:config' }, ' で ', { code: 'webgl.disabled' }, ' を false に戻す'],
      }
    case 'safari':
      return {
        steps: [
          ['ロックダウンモードがオンなら、Safari の「設定」→「Web サイト」→「ロックダウンモード」で、このサイトだけオフ'],
          ['macOS を最新にして、Safari を開き直す'],
        ],
      }
    default:
      return {
        steps: [
          ['ブラウザの設定を開き、「ハードウェア」で検索'],
          ['ハードウェア（グラフィック）アクセラレーションをオン'],
          ['ブラウザを再起動する'],
        ],
        note: RESTART_NOTE,
      }
  }
}

/**
 * 設定を変えれば直る見立てか。ハードウェアアクセラレーションやロックダウンモードの手順はこのときだけ出す。
 * blocked と context-lost は設定が正しくても起きるので、設定を疑わせる手順は出さない
 */
export function isSettingsCause(kind: WebglFailureKind): boolean {
  return kind === 'api-missing' || kind === 'disabled' || kind === 'creation-failed'
}

/** 見立てごとの直し方。設定由来でないものは、開き直しと再試行を案内する */
export function recoveryGuide(kind: WebglFailureKind, browser: BrowserKind, platform: PlatformKind): FixGuide {
  if (kind === 'blocked') {
    return {
      steps: [
        ['ブラウザを完全に終了して、開き直す'],
        ['このページをもう一度開く'],
      ],
      note: ['何度も止まるときは、ブラウザと OS（グラフィックドライバ）を最新にしてください。'],
    }
  }
  if (kind === 'context-lost') {
    return {
      steps: [
        ['3D を使うほかのタブやアプリを閉じる'],
        ['下の「もう一度試す」を押す'],
        ['戻らなければ、ページを再読み込みする'],
      ],
      note: ['何度も起きるときは、ブラウザを完全に終了して開き直してください。'],
    }
  }
  return fixGuide(browser, platform)
}

/** 見出し下の説明。表示中に止まった場合は「この環境では使えない」と言わない */
export function leadText(kind: WebglFailureKind): string {
  switch (kind) {
    case 'context-lost':
      return '表示中に 3D 描画（WebGL）が止まったため、地図を出せなくなりました。アプリの動きは下の動画でご覧いただけます。'
    case 'blocked':
      return 'ブラウザがこのページの 3D 描画（WebGL）を一時的に止めているため、地図を出せません。アプリの動きは下の動画でご覧いただけます。'
    default:
      return 'この環境では WebGL（ブラウザの 3D 描画機能）が使えないため、地図を出せません。アプリの動きは下の動画でご覧いただけます。'
  }
}

/**
 * 設定を変える前に読んでほしいこと。Apple 端末の手順はロックダウンモードの解除なので、
 * 守りの機能を弱めることを「安全」とは言わず、解除してよい場面を限る
 */
export function safetyCopy(platform: PlatformKind, browser: BrowserKind): { title: string; body: string } {
  if (platform === 'ios' || browser === 'safari') {
    return {
      title: 'ロックダウンモードを解除する前に',
      body: 'ロックダウンモードは、標的型の攻撃に備えてブラウザの機能を絞る仕組みです。解除するのは信頼できるサイトだけにしてください。解除しなくても、動画でアプリの動きを確認できます。',
    }
  }
  return {
    title: '有効にしても安全です',
    body: 'WebGL は主要なブラウザに標準で入っている機能です。有効にしても、サイトが端末のファイルやほかのタブに触れることはありません。',
  }
}

/** 「なぜ使えないのか」を 1 文で。ブラウザが返した状態から分ける */
export function causeText(kind: WebglFailureKind, platform: PlatformKind, browser: BrowserKind): string {
  const apple = platform === 'ios' || browser === 'safari'
  switch (kind) {
    case 'api-missing':
      return apple
        ? 'このブラウザでは WebGL が止められています。多くはロックダウンモードが原因です。'
        : 'このブラウザでは WebGL が止められています。ブラウザの設定、拡張機能、管理者の設定などが原因です。'
    case 'disabled':
      return '設定や管理者のポリシーで WebGL が止められています。会社や学校の端末なら管理者にご相談ください。'
    case 'blocked':
      return 'グラフィックの不具合のため、ブラウザが WebGL を一時的に止めています。ブラウザを完全に終了して開き直すと戻ります。'
    case 'creation-failed':
      return platform === 'desktop'
        ? 'GPU を使えない状態です。ハードウェアアクセラレーションがオフ、ドライバが対応外、リモートデスクトップや仮想環境などが考えられます。'
        : '端末のグラフィック機能を使えない状態です。ブラウザや OS が古い可能性があります。'
    case 'context-lost':
      return '表示中に GPU との接続が切れました。スリープからの復帰やメモリ不足で起きることがあります。'
  }
}

export const WEBGL_COPY = {
  title: '3D 地図を表示できません',
  embedded:
    'このページは別のページの中に埋め込まれて表示されています。埋め込み先が 3D 描画を許可していない場合は、新しいタブで開くと表示できることがあります。',
  openInNewTab: '新しいタブで開く',
  retry: 'もう一度試す',
  retryFailed: 'まだ WebGL を使えません。設定を変えたあとは、ブラウザの再起動が必要です。',
  sidebarNote: '左のメニューから、飛行計画の一覧や AI アシスタントの説明はこのまま開けます。',
  techDetails: '技術的な情報',
} as const

export const PRODUCT_COPY = {
  name: 'DroneMapper',
  value: '建物の高さを見ながらドローンの飛行ルートを引き、飛ばす前にブラウザ上で確かめるアプリです。',
  videoLabel: 'DroneMapper のデモ動画（25 秒、音声なし）',
  highlights: [
    {
      title: 'PLATEAU の 3D 都市モデルで下見',
      body: '国土交通省 PLATEAU の建物データを地図に重ね、ルートが建物に当たらないかを確かめられます。',
    },
    {
      title: '地上高を保つ飛行シミュレーション',
      body: '区間ごとに「距離 ÷ 速度」で実時間を出し、地盤の高さに地上高を足して飛ばします。俯瞰・追跡・機体視点の 3 つのカメラ付き。',
    },
    {
      title: 'AI が計画を作り、KML で持ち出せる',
      body: '自然言語の指示からツール呼び出しで飛行計画を作成（手元でキーを設定したとき）。海抜高度付きの KML で Google Earth に書き出せます。',
    },
  ],
  readme: 'GitHub で README を読む',
  readmeUrl: 'https://github.com/BoxPistols/drone-mapper-plateau#readme',
  portfolio: 'ポートフォリオを見る',
  portfolioUrl: 'https://asagiri-design.carrd.co/',
} as const

export const ION_TOKEN_MISSING =
  'Cesium ion のトークンが未設定のため、地形の凹凸と衛星写真は使えません。平らな地表に国土地理院の航空写真を表示しています（.env の VITE_CESIUM_TOKEN で切り替わります）。'

export const SIM_NEEDS_MAP = '飛行シミュレーションは 3D 地図の上で再生するため、この環境では再生できません。'

export const ION_TERRAIN_FAILED = '地形データ（Cesium ion）を読み込めませんでした。平らな地表で表示しています。'

export const TILES_FAILURE_TEXT: Record<TilesFailureKind, string> = {
  offline: 'インターネットに接続されていません。接続を確かめてから再試行してください。',
  'blocked-or-unreachable':
    'PLATEAU の配信サーバーに接続できませんでした。社内ネットワークのフィルタや拡張機能で遮断されている可能性があります。',
  server: 'PLATEAU の配信サーバーがエラーを返しました。時間をおいて再試行してください。',
  unknown: '原因を特定できませんでした。時間をおいて再試行してください。',
}
