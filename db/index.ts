import 'dotenv/config'
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import * as schema from './schema'

const connectionString = process.env.DATABASE_URL!

if (!connectionString) {
  throw new Error('DB URI Not Defined in .env')
}

const pool = new Pool({
  connectionString,
  ssl: connectionString.includes('sslmode=require')
    ? {
        rejectUnauthorized: false
      }
    : undefined,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 1000
})

export const db = drizzle(pool, { schema })
