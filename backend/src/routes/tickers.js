// routes/tickers.js
import express from "express";
import { getAllTickers } from "../services/massive.js";

const router = express.Router();

// Récupérer tous les tickers
router.get("/", async (req, res) => {
  try {
    console.log("[INFO] Chargement de tous les tickers Massive…");
    const symbols = await getAllTickers();

    // Nettoyage / mapping si nécessaire
    const cleaned = symbols.map((s) => ({
      symbol: s.symbol,
      description: s.name || s.description || "",
      exchange: s.exchange || "",
      type: s.type || "",
    }));

    res.json(cleaned);
    console.log(`[INFO] ${cleaned.length} tickers renvoyés`);
  } catch (err) {
    console.error("[ERROR] Erreur récupération tickers:", err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;
