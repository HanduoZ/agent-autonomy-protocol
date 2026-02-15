import { beforeAll, afterAll } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Use test database
const DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgresql://a2amp:a2amp_dev@localhost:5432/a2amp_test";

// Override for the app
process.env.DATABASE_URL = DATABASE_URL;

let pool: pg.Pool;

beforeAll(async () => {
  // Connect to default db to create test db if needed
  const adminPool = new pg.Pool({
    connectionString: "postgresql://a2amp:a2amp_dev@localhost:5432/a2amp",
  });

  try {
    await adminPool.query("CREATE DATABASE a2amp_test");
  } catch {
    // Database may already exist
  }
  await adminPool.end();

  // Connect to test db and run migrations
  pool = new pg.Pool({ connectionString: DATABASE_URL });

  const migrationsDir = path.resolve(__dirname, "../migrations");
  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  for (const file of files) {
    const sql = fs.readFileSync(path.join(migrationsDir, file), "utf-8");
    try {
      await pool.query(sql);
    } catch {
      // Tables/triggers may already exist from a previous run
    }
  }

  // Clean data before each test file (TRUNCATE, not DROP — preserves schema)
  await pool.query(
    "TRUNCATE reputation_scores, transactions, capabilities, agents CASCADE",
  );
});

afterAll(async () => {
  if (pool) {
    await pool.end();
  }
});
