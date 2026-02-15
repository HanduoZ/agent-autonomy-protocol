import pg from "pg";

const pool = new pg.Pool({
  connectionString:
    process.env.DATABASE_URL ||
    "postgresql://a2amp:a2amp_dev@localhost:5432/a2amp",
  max: 20,
});

export default pool;
