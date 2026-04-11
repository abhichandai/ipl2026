import { neon, NeonQueryFunction } from '@neondatabase/serverless';

let _sql: NeonQueryFunction<false, false> | null = null;

export function getDB(): NeonQueryFunction<false, false> {
  if (!_sql) {
    const url = process.env.DATABASE_URL || process.env.POSTGRES_URL!;
    _sql = neon(url);
  }
  return _sql;
}

export async function initDB() {
  const db = getDB();

  await db`CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    is_admin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`;

  await db`CREATE TABLE IF NOT EXISTS games (
    id SERIAL PRIMARY KEY,
    match_date DATE NOT NULL,
    team1 TEXT NOT NULL,
    team2 TEXT NOT NULL,
    actual_winner TEXT DEFAULT NULL,
    is_playoff BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`;

  await db`CREATE TABLE IF NOT EXISTS predictions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    orange_cap_1 TEXT, orange_cap_2 TEXT, orange_cap_3 TEXT,
    purple_cap_1 TEXT, purple_cap_2 TEXT, purple_cap_3 TEXT,
    top4_team_1 TEXT, top4_team_2 TEXT, top4_team_3 TEXT, top4_team_4 TEXT,
    ipl_winner TEXT,
    locked BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  )`;

  await db`CREATE TABLE IF NOT EXISTS live_data (
    id SERIAL PRIMARY KEY,
    orange_cap_rankings JSONB DEFAULT '[]',
    purple_cap_rankings JSONB DEFAULT '[]',
    top4_teams JSONB DEFAULT '[]',
    tournament_winner TEXT DEFAULT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
  )`;

  await db`CREATE TABLE IF NOT EXISTS game_predictions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    game_id INTEGER REFERENCES games(id) ON DELETE CASCADE,
    predicted_winner TEXT NOT NULL,
    UNIQUE(user_id, game_id)
  )`;

  const existing = await db`SELECT id FROM live_data LIMIT 1`;
  if ((existing as any[]).length === 0) {
    await db`INSERT INTO live_data (orange_cap_rankings, purple_cap_rankings, top4_teams) VALUES ('[]', '[]', '[]')`;
  }
}
