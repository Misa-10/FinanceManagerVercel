import express from "express";
import { pool } from "../script/db.js";
import { getUSDtoEUR } from "../services/yahoo.js";

const router = express.Router();

// Récupérer tous les ordres avec le compte et type associé
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        o.id, o.symbol, o.type, o.quantity, o.price, o.date, o.currency,
        a.id AS account_id, a.name AS account_name,
        at.id AS account_type_id, at.name AS account_type
      FROM orders o
      JOIN accounts a ON o.account_id = a.id
      JOIN account_types at ON o.account_type_id = at.id
      ORDER BY o.date DESC
    `);

    const usdToEur = await getUSDtoEUR();

    const ordersWithConversion = result.rows.map((o) => {
      const priceEUR =
        o.currency === "USD" ? +(o.price * usdToEur).toFixed(2) : o.price;
      const total = +(o.price * o.quantity).toFixed(2);
      const totalEUR =
        o.currency === "USD" ? +(total * usdToEur).toFixed(2) : total;

      return {
        ...o,
        priceEUR,
        total,
        totalEUR,
      };
    });

    res.json(ordersWithConversion);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Créer un ordre
router.post("/", async (req, res) => {
  const {
    account_id,
    account_type_id,
    symbol,
    type,
    quantity,
    price,
    date,
    currency,
  } = req.body;

  if (
    !account_id ||
    !account_type_id ||
    !symbol ||
    !type ||
    !quantity ||
    !price
  )
    return res.status(400).json({ error: "Champs obligatoires manquants" });

  // Détecte la devise si non fournie
  const orderCurrency =
    currency || (symbol.toUpperCase().includes("USD") ? "USD" : "EUR");

  try {
    const result = await pool.query(
      `INSERT INTO orders 
       (account_id, account_type_id, symbol, type, quantity, price, date, currency)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING *`,
      [
        account_id,
        account_type_id,
        symbol,
        type,
        quantity,
        price,
        date || new Date(),
        orderCurrency,
      ]
    );

    const orderId = result.rows[0].id;
    const fullOrder = await pool.query(
      `
      SELECT 
        o.id, o.symbol, o.type, o.quantity, o.price, o.date, o.currency,
        a.id AS account_id, a.name AS account_name,
        at.id AS account_type_id, at.name AS account_type
      FROM orders o
      JOIN accounts a ON o.account_id = a.id
      JOIN account_types at ON o.account_type_id = at.id
      WHERE o.id = $1
      `,
      [orderId]
    );

    res.json(fullOrder.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Mettre à jour un ordre
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const {
    account_id,
    account_type_id,
    symbol,
    type,
    quantity,
    price,
    date,
    currency,
  } = req.body;

  if (
    !account_id ||
    !account_type_id ||
    !symbol ||
    !type ||
    !quantity ||
    !price
  )
    return res.status(400).json({ error: "Champs obligatoires manquants" });

  const orderCurrency =
    currency || (symbol.toUpperCase().includes("USD") ? "USD" : "EUR");

  try {
    const result = await pool.query(
      `UPDATE orders
       SET account_id=$1, account_type_id=$2, symbol=$3, type=$4, quantity=$5, price=$6, date=$7, currency=$8
       WHERE id=$9
       RETURNING *`,
      [
        account_id,
        account_type_id,
        symbol,
        type,
        quantity,
        price,
        date || new Date(),
        orderCurrency,
        id,
      ]
    );

    if (result.rows.length === 0)
      return res.status(404).json({ error: "Ordre non trouvé" });

    const fullOrder = await pool.query(
      `
      SELECT 
        o.id, o.symbol, o.type, o.quantity, o.price, o.date, o.currency,
        a.id AS account_id, a.name AS account_name,
        at.id AS account_type_id, at.name AS account_type
      FROM orders o
      JOIN accounts a ON o.account_id = a.id
      JOIN account_types at ON o.account_type_id = at.id
      WHERE o.id = $1
      `,
      [id]
    );

    res.json(fullOrder.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Supprimer un ordre
router.delete("/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      "DELETE FROM orders WHERE id = $1 RETURNING *",
      [id]
    );

    if (result.rows.length === 0)
      return res.status(404).json({ error: "Ordre non trouvé" });

    res.json({ message: "Ordre supprimé avec succès" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Import CSV
router.post("/import", async (req, res) => {
  const orders = req.body; // tableau d'ordres

  if (!Array.isArray(orders) || orders.length === 0)
    return res.status(400).json({ error: "Aucun ordre fourni pour l'import" });

  try {
    const values = [];
    const placeholders = orders
      .map((o, i) => {
        const idx = i * 8; // +1 colonne pour currency
        const orderType =
          o.type && o.type.toLowerCase() === "sell" ? "sell" : "buy";
        const quantity = Number(
          String(o.quantity)
            .replace(",", ".")
            .replace(/[^\d.-]/g, "")
        );
        const price = Number(
          String(o.price)
            .replace(",", ".")
            .replace(/[^\d.-]/g, "")
        );
        const date = o.date
          ? new Date(o.date).toISOString()
          : new Date().toISOString();
        const currency =
          o.currency ||
          (o.symbol.toUpperCase().includes("USD") ? "USD" : "EUR");

        if (isNaN(quantity) || isNaN(price)) {
          throw new Error(
            `Valeur invalide pour quantity ou price sur l'ordre ${o.symbol}`
          );
        }

        values.push(
          o.account_id,
          o.account_type_id,
          o.symbol,
          orderType,
          quantity,
          price,
          date,
          currency
        );
        return `($${idx + 1},$${idx + 2},$${idx + 3},$${idx + 4},$${idx + 5},$${
          idx + 6
        },$${idx + 7},$${idx + 8})`;
      })
      .join(",");

    const query = `INSERT INTO orders (account_id, account_type_id, symbol, type, quantity, price, date, currency) VALUES ${placeholders} RETURNING *`;

    const result = await pool.query(query, values);

    const ids = result.rows.map((r) => r.id);
    const fullOrders = await pool.query(
      `SELECT 
        o.id, o.symbol, o.type, o.quantity, o.price, o.date, o.currency,
        a.id AS account_id, a.name AS account_name,
        at.id AS account_type_id, at.name AS account_type
      FROM orders o
      JOIN accounts a ON o.account_id = a.id
      JOIN account_types at ON o.account_type_id = at.id
      WHERE o.id = ANY($1::int[])
      ORDER BY o.date DESC`,
      [ids]
    );

    res.json({ message: "Import CSV réussi", orders: fullOrders.rows });
  } catch (err) {
    console.error("Erreur import CSV:", err);
    res.status(500).json({ error: err.message });
  }
});

// Récupérer les ordres d’un compte et d’un type
router.get("/account/:accountId/type/:typeId", async (req, res) => {
  const { accountId, typeId } = req.params;

  try {
    const result = await pool.query(
      `
      SELECT 
        o.id, o.symbol, o.type, o.quantity, o.price, o.date, o.currency,
        a.id AS account_id, a.name AS account_name,
        at.id AS account_type_id, at.name AS account_type
      FROM orders o
      JOIN accounts a ON o.account_id = a.id
      JOIN account_types at ON o.account_type_id = at.id
      WHERE o.account_id = $1
      AND o.account_type_id = $2
      ORDER BY o.date DESC
      `,
      [accountId, typeId]
    );

    const usdToEur = await getUSDtoEUR(); // taux USD -> EUR

    const ordersWithConversion = result.rows.map((o) => {
      const priceEUR =
        o.currency === "USD" ? +(o.price * usdToEur).toFixed(2) : o.price;
      const total = +(o.price * o.quantity).toFixed(2);
      const totalEUR =
        o.currency === "USD" ? +(total * usdToEur).toFixed(2) : total;

      return {
        ...o,
        priceEUR,
        total,
        totalEUR,
      };
    });

    res.json(ordersWithConversion);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
