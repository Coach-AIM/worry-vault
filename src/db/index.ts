import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import * as schema from './schema';
import path from 'path';

const dbUrl = process.env.DATABASE_URL || `file:${path.join(process.cwd(), 'local.db')}`;

const client = createClient({ url: dbUrl });
export const db = drizzle(client, { schema });
