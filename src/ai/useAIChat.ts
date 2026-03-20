/**
 * AIチャット用 React Hook
 * Anthropic SDK + tool use でドローンストアを自然言語で操作する
 *
 * ⚠️ セキュリティ注意: VITE_ANTHROPIC_API_KEY はクライアントバンドルに含まれる。
 *    本番環境では server-side proxy（Vite dev proxy 等）を経由すること。
 */
import { useState, useCallback, useRef } from 'react'
import Anthropic from '@anthropic-ai/sdk'
import { AI_TOOLS, executeTool } from './tools'

const MODEL = 'claude-opus-4-6'

const SYSTEM_PROMPT = `あなたは日本の3D都市モデル（PLATEAU）を使ったドローン飛行計画アプリのAIアシスタントです。

できること:
- 都市の切り替え（台東区・港区・仙台・加賀・沼津・広島・福岡）
- 自然言語からの飛行計画生成（ウェイポイント追加）
- ランドマーク（ピン）の設置
- フライトシミュレーションの開始
- 現在の計画状態の確認

日本のドローン規制（2022年改正航空法）:
- 最大飛行高度: 地上150m以下
- 人口集中地区・空港周辺は許可申請が必要
- 一般的な練習飛行: 30〜100m AGL

回答は日本語で、シンプル・明確に。ツールを使う前後に何をするか一言伝えること。
座標を指定するときは「浅草寺付近（139.79, 35.71）」のように具体的に説明すること。`

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  isThinking?: boolean
}

export function useAIChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const clientRef = useRef<Anthropic | null>(null)
  const historyRef = useRef<Anthropic.MessageParam[]>([])

  // Anthropic クライアントを遅延初期化（API キーが必要な時だけ）
  const getClient = useCallback(() => {
    if (!clientRef.current) {
      const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY
      if (!apiKey) throw new Error('VITE_ANTHROPIC_API_KEY が設定されていません')
      clientRef.current = new Anthropic({
        apiKey,
        dangerouslyAllowBrowser: true, // クライアントサイド使用を明示
      })
    }
    return clientRef.current
  }, [])

  const sendMessage = useCallback(async (userInput: string) => {
    if (loading) return
    setError(null)
    setLoading(true)

    // UIにユーザーメッセージを追加
    setMessages((prev) => [...prev, { role: 'user', content: userInput }])

    // Anthropic API 用の履歴にも追加
    historyRef.current = [...historyRef.current, { role: 'user', content: userInput }]

    // ストリーミング用の assistant メッセージプレースホルダー
    setMessages((prev) => [...prev, { role: 'assistant', content: '', isThinking: true }])

    try {
      const client = getClient()

      // tool-use ループ（Claude がツールを使い終わるまで繰り返す）
      let assistantText = ''
      let continueLoop = true

      while (continueLoop) {
        const stream = await client.messages.stream({
          model: MODEL,
          max_tokens: 4096,
          system: SYSTEM_PROMPT,
          tools: AI_TOOLS,
          tool_choice: { type: 'auto' },
          messages: historyRef.current,
        })

        // テキストをストリーミング表示
        stream.on('text', (delta) => {
          assistantText += delta
          setMessages((prev) => {
            const next = [...prev]
            next[next.length - 1] = { role: 'assistant', content: assistantText, isThinking: false }
            return next
          })
        })

        const message = await stream.finalMessage()

        // アシスタントメッセージを履歴に追加
        historyRef.current = [...historyRef.current, { role: 'assistant', content: message.content }]

        if (message.stop_reason === 'end_turn' || message.stop_reason !== 'tool_use') {
          continueLoop = false
          break
        }

        // ── ツールコール処理 ────────────────────
        const toolUseBlocks = message.content.filter(
          (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use'
        )

        const toolResults: Anthropic.ToolResultBlockParam[] = []
        for (const toolUse of toolUseBlocks) {
          const result = executeTool(toolUse.name, toolUse.input as Record<string, unknown>)
          toolResults.push({
            type: 'tool_result',
            tool_use_id: toolUse.id,
            content: result,
          })
        }

        // ツール結果を履歴に追加してループ継続
        historyRef.current = [...historyRef.current, { role: 'user', content: toolResults }]

        // 次のストリームに備えてテキストをリセット
        assistantText = ''
      }
    } catch (err) {
      const msg = err instanceof Anthropic.APIError
        ? `API エラー (${err.status}): ${err.message}`
        : err instanceof Error ? err.message : '不明なエラー'
      setError(msg)
      setMessages((prev) => {
        const next = [...prev]
        next[next.length - 1] = { role: 'assistant', content: `⚠️ ${msg}`, isThinking: false }
        return next
      })
    } finally {
      setLoading(false)
    }
  }, [loading, getClient])

  const clearHistory = useCallback(() => {
    setMessages([])
    setError(null)
    historyRef.current = []
  }, [])

  return { messages, loading, error, sendMessage, clearHistory }
}
