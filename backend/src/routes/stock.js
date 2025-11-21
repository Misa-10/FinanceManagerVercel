// routes/prices.js
import express from "express";
import { getYahooPrice } from "../services/yahoo.js";

const router = express.Router();

router.get("/:symbol", async (req, res) => {
  const { symbol } = req.params;

  try {
    const price = await getYahooPrice(symbol);
    res.json(price);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
