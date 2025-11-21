import express from "express";
import { pool } from "../script/db.js";
import Papa from "papaparse";

const router = express.Router();

// GET /api/portfolio/history
router.get("/history", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT date, total_value
      FROM portfolio_history
      ORDER BY date ASC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Fonction pour parser les dates
function parseFlexibleDate(str) {
  if (!str) return null;

  const dateOnly = str.split(" ")[0].trim();

  // ISO
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) {
    return new Date(dateOnly);
  }

  // FR
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateOnly)) {
    const [d, m, y] = dateOnly.split("/");
    return new Date(`${y}-${m}-${d}`);
  }

  // Fallback
  const d = new Date(dateOnly);
  return isNaN(d.getTime()) ? null : d;
}

// POST /api/portfolio/import
router.post("/import", async (req, res) => {
  const { csv } = req.body; // Le CSV en texte
  if (!csv) return res.status(400).json({ error: "Aucun CSV fourni" });

  // Parse CSV
  const { data, errors } = Papa.parse(csv, {
    header: true, // permet d'utiliser les noms de colonnes si présentes
    skipEmptyLines: true,
  });

  if (errors.length) {
    return res
      .status(400)
      .json({ error: "Erreur parsing CSV", details: errors });
  }

  try {
    // Normalisation et conversion
    const rows = data
      .map((row) => {
        const date = parseFlexibleDate(row.date);
        const total_value = parseFloat(
          String(row.total_value).replace(",", ".")
        );

        if (!date || isNaN(total_value)) return null;
        return { date: date.toISOString().split("T")[0], total_value };
      })
      .filter(Boolean);

    if (rows.length === 0) {
      return res.status(400).json({ error: "Aucune ligne valide à importer" });
    }

    // Éviter doublons dans le CSV
    const uniqueRowsMap = {};
    rows.forEach((r) => {
      uniqueRowsMap[r.date] = r.total_value; // garde la dernière valeur si doublon
    });

    const uniqueRows = Object.entries(uniqueRowsMap).map(
      ([date, total_value]) => ({
        date,
        total_value,
      })
    );

    // Préparer requête batch
    const values = [];
    const placeholders = uniqueRows
      .map((r, i) => {
        values.push(r.date, r.total_value);
        return `($${i * 2 + 1}, $${i * 2 + 2})`;
      })
      .join(",");

    const query = `
      INSERT INTO portfolio_history (date, total_value)
      VALUES ${placeholders}
      ON CONFLICT (date) DO UPDATE SET total_value = EXCLUDED.total_value
    `;

    await pool.query(query, values);

    res.json({
      message: `${uniqueRows.length} lignes importées avec succès !`,
    });
  } catch (err) {
    console.error("Erreur import CSV portfolio_history:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
