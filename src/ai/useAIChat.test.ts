import { describe, it, expect } from 'vitest'
import { AI_MODELS, completionParams } from './useAIChat'

describe('completionParams', () => {
  it('OpenAIはtoolsを使うためreasoning_effortにnoneを明示し、max_completion_tokensを使う', () => {
    const openai = AI_MODELS.find((m) => m.provider === 'openai')!
    const params = completionParams(openai)
    expect(params).toEqual({ max_completion_tokens: 4096, reasoning_effort: 'none' })
    expect(params).not.toHaveProperty('max_tokens')
    expect(params).not.toHaveProperty('temperature')
  })

  it('GeminiのOpenAI互換にはreasoning_effortを送らずmax_tokensを使う', () => {
    for (const m of AI_MODELS.filter((m) => m.provider === 'gemini')) {
      expect(completionParams(m)).toEqual({ max_tokens: 4096 })
    }
  })
})
