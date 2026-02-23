export default defineNuxtConfig({
    future: { compatibilityVersion: 4 },

    compatibilityDate: '2025-02-20',

    devtools: { enabled: true },

    modules: ['@nuxtjs/tailwindcss', 'nuxt-auth-utils'],

    css: ['~/assets/scss/main.scss'],

    runtimeConfig: {
        // AI providers
        anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',
        openaiApiKey: process.env.OPENAI_API_KEY || '',
        geminiApiKey: process.env.GEMINI_API_KEY || '',
        // Database
        databaseUrl: process.env.DATABASE_URL || '',
        // Auth (nuxt-auth-utils reads NUXT_SESSION_PASSWORD automatically)
        session: {
            password: process.env.NUXT_SESSION_PASSWORD || '',
            maxAge: 60 * 60 * 24 * 7, // 7 days
        },
        public: {
            supabaseUrl: process.env.SUPABASE_URL || '',
        },
    },

    nitro: {
        experimental: { wasm: true },
    },
});
