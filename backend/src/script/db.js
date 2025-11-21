import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Pool } = pg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// Test de connexion au démarrage
export async function testDB() {
  try {
    const res = await pool.query("SELECT NOW()");
    console.log("DB OK:", res.rows[0].now);
  } catch (err) {
    console.error("DB ERROR:", err.message);
  }
}
