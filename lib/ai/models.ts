import { xai } from '@ai-sdk/xai';
import { openai } from '@ai-sdk/openai';
import { anthropic, type AnthropicProviderOptions } from '@ai-sdk/anthropic';

// export const model = google('gemini-2.5-pro-preview-05-06')
export const imageModel = xai.image('grok-2-image')
export const speechModel = openai.speech('tts-1')
export const embeddingModel = openai.embedding('text-embedding-3-small', {
    dimensions: 1536,
})
export const summaryModel = openai('gpt-4o-mini')

export const chatModel = openai('gpt-4.1')
export const anthropicProviderOptions = {
    anthropic: {
        thinking: { type: 'enabled', budgetTokens: 15000 },
    } satisfies AnthropicProviderOptions,
}

export const jsonModel = openai('o4-mini', {
    structuredOutputs: true,
})