import { pool } from "./db.js";
import { getAllTickers } from "../services/massive.js";

/**
 * Supprime les tickers avec symbol en double
 */
function deduplicateTickers(tickers) {
  const seen = new Set();
  return tickers.filter((t) => {
    if (seen.has(t.ticker)) return false;
    seen.add(t.ticker);
    return true;
  });
}

/**
 * Insertion par batch pour éviter de dépasser la limite de paramètres PostgreSQL
 */
async function insertTickersInBatches(tickers, batchSize = 1000) {
  const uniqueTickers = deduplicateTickers(tickers);

  for (let i = 0; i < uniqueTickers.length; i += batchSize) {
    const chunk = uniqueTickers.slice(i, i + batchSize);
    const values = [];
    const placeholders = chunk.map((t, idx) => {
      const base = idx * 4;
      values.push(
        t.ticker,
        t.name || "",
        t.primary_exchange || "",
        t.market || ""
      );
      return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, NOW())`;
    });

    await pool.query(
      `INSERT INTO tickers (symbol, description, exchange, market, updated_at)
       VALUES ${placeholders.join(", ")}
       ON CONFLICT (symbol) DO UPDATE
       SET description = EXCLUDED.description,
           exchange = EXCLUDED.exchange,
           market = EXCLUDED.market,
           updated_at = NOW()`,
      values
    );

    console.log(`[INFO] ${i + chunk.length} tickers insérés…`);
  }
}

export async function updateTickers() {
  console.log("===== MISE À JOUR DES TICKERS =====");

  // Récupérer tous les tickers Massive
  const data = await getAllTickers();
  const symbols = data.results;

  if (!symbols || symbols.length === 0) {
    console.log("⚠️ Aucun ticker récupéré !");
    return;
  }

  console.log(`→ ${symbols.length} tickers récupérés`);

  // Insertion par batch avec déduplication
  await insertTickersInBatches(symbols);

  console.log("✅ Mise à jour terminée.");
}
