import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import * as schema from './schema';
import path from 'path';

const dbUrl = process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL || `file:${path.join(process.cwd(), 'local.db')}`;
const authToken = process.env.TURSO_AUTH_TOKEN || process.env.DATABASE_AUTH_TOKEN;

const client = createClient({ 
  url: dbUrl,
  authToken: authToken
});
export const db = drizzle(client, { schema });
