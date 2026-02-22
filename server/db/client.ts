import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// ── Client ────────────────────────────────────────────────────────────────────
// Nitro (Nuxt server) runs in a single process — we use a module-level
// singleton so we don't open a new connection pool on every hot-reload.
// In production, the pool is created once and reused across all requests.

let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function useDb() {
    if (_db) {
        return _db;
    }

    const config = useRuntimeConfig();

    if (!config.databaseUrl) {
        throw new Error('DATABASE_URL is not set. Add it to your .env file.');
    }

    const client = postgres(config.databaseUrl, {
        max: 10,
        idle_timeout: 30,
        connect_timeout: 10,
    });

    _db = drizzle(client, { schema });

    return _db;
}
