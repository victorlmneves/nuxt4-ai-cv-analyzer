export default defineNuxtConfig({
  future: { compatibilityVersion: 4 },
  compatibilityDate: '2025-02-20',
  modules: ['@nuxtjs/tailwindcss'],
  css: ['~/assets/css/main.css'],
  runtimeConfig: {
    anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',
    openaiApiKey: process.env.OPENAI_API_KEY || '',
    geminiApiKey: process.env.GEMINI_API_KEY || '',
  },
  nitro: {
    experimental: { wasm: true }
  }
})
