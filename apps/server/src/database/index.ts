import { drizzle } from 'drizzle-orm/node-postgres';
import { customAlphabet } from 'nanoid';
import config from '../config';
import * as schema from './schema';

const generate = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 12);

export const newId = (prefix: string) => `${prefix}_${generate()}`;
export const database = drizzle(config.DATABASE_URL, { schema });
export type Database = typeof database;
