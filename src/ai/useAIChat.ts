/**
 * AIチャット用 React Hook — マルチモデル対応
 *
 * 無料枠: gpt-5.4-nano / Gemini 2.5 Flash（アプリ側キー）
 * 有料枠: gpt-5.4-mini（ユーザー自身のOpenAI APIキー）
 */
import { useState, useCallback, useRef } from 'react'
import OpenAI from 'openai'
import { AI_TOOLS, executeTool } from './tools'

// ── モデル定義 ──
export type AIProvider = 'openai' | 'gemini'
export type ModelTier = 'free' | 'premium'

export interface AIModel {
  id: string
  label: string
  provider: AIProvider
  tier: ModelTier
}

export const AI_MODELS: AIModel[] = [
  { id: 'gpt-5.4-nano',      label: 'GPT-5.4 nano',      provider: 'openai', tier: 'free' },
  { id: 'gemini-2.5-flash',  label: 'Gemini 2.5 Flash',  provider: 'gemini', tier: 'free' },
  { id: 'gpt-5.4-mini',      label: 'GPT-5.4 mini',      provider: 'openai', tier: 'premium' },
]

export const DEFAULT_MODEL = AI_MODELS[0] // gpt-5.4-nano

const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/openai/'

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

// ── クライアント生成 ──
function createClient(model: AIModel, userApiKey: string | null): OpenAI {
  if (model.tier === 'premium') {
    if (!userApiKey) throw new Error('このモデルには APIキーの入力が必要です')
    return new OpenAI({ apiKey: userApiKey, dangerouslyAllowBrowser: true })
  }

  // 無料枠
  if (model.provider === 'gemini') {
    const key = import.meta.env.VITE_GEMINI_API_KEY
    if (!key) throw new Error('VITE_GEMINI_API_KEY が未設定です')
    return new OpenAI({ apiKey: key, baseURL: GEMINI_BASE_URL, dangerouslyAllowBrowser: true })
  }

  // OpenAI 無料枠
  const key = import.meta.env.VITE_OPENAI_API_KEY
  if (!key) throw new Error('VITE_OPENAI_API_KEY が未設定です')
  return new OpenAI({ apiKey: key, dangerouslyAllowBrowser: true })
}

// ── Hook ──
export function useAIChat(model: AIModel, userApiKey: string | null) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const historyRef = useRef<OpenAI.ChatCompletionMessageParam[]>([])

  const sendMessage = useCallback(async (userInput: string) => {
    if (loading) return
    setError(null)
    setLoading(true)

    setMessages((prev) => [...prev, { role: 'user', content: userInput }])
    historyRef.current = [...historyRef.current, { role: 'user', content: userInput }]
    setMessages((prev) => [...prev, { role: 'assistant', content: '', isThinking: true }])

    try {
      const client = createClient(model, userApiKey)

      let assistantText = ''
      let continueLoop = true

      while (continueLoop) {
        const stream = await client.chat.completions.create({
          model: model.id,
          max_tokens: 4096,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            ...historyRef.current,
          ],
          tools: AI_TOOLS,
          tool_choice: 'auto',
          stream: true,
        })

        const accToolCalls: Map<number, { id: string; name: string; arguments: string }> = new Map()
        let finishReason: string | null = null

        for await (const chunk of stream) {
          const choice = chunk.choices[0]
          if (!choice) continue

          const contentDelta = choice.delta?.content
          if (contentDelta) {
            assistantText += contentDelta
            setMessages((prev) => {
              const next = [...prev]
              next[next.length - 1] = { role: 'assistant', content: assistantText, isThinking: false }
              return next
            })
          }

          const toolCallDeltas = choice.delta?.tool_calls
          if (toolCallDeltas) {
            for (const tc of toolCallDeltas) {
              const existing = accToolCalls.get(tc.index)
              if (existing) {
                if (tc.function?.arguments) existing.arguments += tc.function.arguments
              } else {
                accToolCalls.set(tc.index, {
                  id: tc.id ?? '',
                  name: tc.function?.name ?? '',
                  arguments: tc.function?.arguments ?? '',
                })
              }
            }
          }

          if (choice.finish_reason) finishReason = choice.finish_reason
        }

        const assistantMessage: OpenAI.ChatCompletionMessageParam = {
          role: 'assistant',
          content: assistantText || null,
        }
        const toolCallsList = Array.from(accToolCalls.values())
        if (toolCallsList.length > 0) {
          (assistantMessage as OpenAI.ChatCompletionAssistantMessageParam).tool_calls = toolCallsList.map((tc) => ({
            id: tc.id,
            type: 'function' as const,
            function: { name: tc.name, arguments: tc.arguments },
          }))
        }
        historyRef.current = [...historyRef.current, assistantMessage]

        if (finishReason !== 'tool_calls' || toolCallsList.length === 0) {
          continueLoop = false
          break
        }

        for (const toolCall of toolCallsList) {
          let parsedArgs: Record<string, unknown> = {}
          try { parsedArgs = JSON.parse(toolCall.arguments) } catch { /* empty */ }
          const result = executeTool(toolCall.name, parsedArgs)
          historyRef.current = [
            ...historyRef.current,
            { role: 'tool', tool_call_id: toolCall.id, content: result },
          ]
        }
        assistantText = ''
      }
    } catch (err) {
      const msg = err instanceof OpenAI.APIError
        ? `API エラー (${err.status}): ${err.message}`
        : err instanceof Error ? err.message : '不明なエラー'
      setError(msg)
      setMessages((prev) => {
        const next = [...prev]
        next[next.length - 1] = { role: 'assistant', content: msg, isThinking: false }
        return next
      })
    } finally {
      setLoading(false)
    }
  }, [loading, model, userApiKey])

  const clearHistory = useCallback(() => {
    setMessages([])
    setError(null)
    historyRef.current = []
  }, [])

  return { messages, loading, error, sendMessage, clearHistory }
}
