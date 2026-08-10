import { sql } from 'bun';
import { mkdir, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { createLogger } from '../utils';

const log = createLogger('migrate');
const table = 'schema_migrations';
const directory = join(import.meta.dir, 'migrations');

async function ensureTable() {
  await sql.unsafe(`CREATE TABLE IF NOT EXISTS ${table} (
    version INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);
}

async function migrations() {
  await mkdir(directory, { recursive: true });
  const files = (await readdir(directory)).filter((f) => f.endsWith('.up.sql')).sort();
  return files.map((upFile) => {
    const match = upFile.match(/^(\d+)_(.+)\.up\.sql$/);
    if (!match) throw new Error(`Invalid migration filename: ${upFile}`);
    return {
      version: Number(match[1]),
      name: match[2]!,
      upFile,
      downFile: `${match[1]}_${match[2]}.down.sql`,
    };
  });
}

async function up() {
  await ensureTable();
  const rows = await sql.unsafe(`SELECT version FROM ${table}`);
  const applied = new Set(rows.map((row: { version: number }) => row.version));
  for (const migration of await migrations()) {
    if (applied.has(migration.version)) continue;
    const contents = await Bun.file(join(directory, migration.upFile)).text();
    await sql.begin(async (tx) => {
      await tx.unsafe(contents);
      await tx.unsafe(`INSERT INTO ${table} (version, name) VALUES ($1, $2)`, [
        migration.version,
        migration.name,
      ]);
    });
    log.info({ file: migration.upFile }, 'migration applied');
  }
}

async function down() {
  await ensureTable();
  const [latest] = await sql.unsafe(`SELECT version FROM ${table} ORDER BY version DESC LIMIT 1`);
  if (!latest) return log.info('nothing to roll back');
  const migration = (await migrations()).find((item) => item.version === latest.version);
  if (!migration) throw new Error(`Migration ${latest.version} not found`);
  const contents = await Bun.file(join(directory, migration.downFile)).text();
  await sql.begin(async (tx) => {
    await tx.unsafe(contents);
    await tx.unsafe(`DELETE FROM ${table} WHERE version = $1`, [migration.version]);
  });
  log.info({ file: migration.downFile }, 'migration rolled back');
}

async function generate() {
  const name = process.argv.find((arg) => arg.startsWith('--name='))?.split('=')[1];
  if (!name || !/^[a-z][a-z0-9_]*$/.test(name)) {
    throw new Error('usage: generate --name=lowercase_name');
  }
  const existing = await migrations();
  const version = String(Math.max(0, ...existing.map((item) => item.version)) + 1).padStart(4, '0');
  await Bun.write(join(directory, `${version}_${name}.up.sql`), `-- ${version}_${name} (up)\n`);
  await Bun.write(join(directory, `${version}_${name}.down.sql`), `-- ${version}_${name} (down)\n`);
}

const command = process.argv[2];
if (command === 'up') await up();
else if (command === 'down') await down();
else if (command === 'generate') await generate();
else throw new Error('usage: migrate.ts <up|down|generate>');
await sql.close();
