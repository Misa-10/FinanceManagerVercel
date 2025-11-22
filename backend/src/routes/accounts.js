import express from "express";
import { pool } from "../script/db.js";
import { getYahooPrice } from "../services/yahoo.js";

const router = express.Router();

// Récupérer les types (pour le menu déroulant / multi-select)
router.get("/types", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM account_types");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Créer un compte avec plusieurs types
router.post("/", async (req, res) => {
  const { name, account_type_ids } = req.body; // array of ids
  if (
    !name ||
    !Array.isArray(account_type_ids) ||
    account_type_ids.length === 0
  ) {
    return res.status(400).json({ error: "Nom et types requis" });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Créer le compte
    const result = await client.query(
      "INSERT INTO accounts (name) VALUES ($1) RETURNING *",
      [name]
    );
    const account = result.rows[0];

    // Créer les liaisons N-to-N
    for (const typeId of account_type_ids) {
      await client.query(
        "INSERT INTO account_account_types (account_id, account_type_id) VALUES ($1, $2)",
        [account.id, typeId]
      );
    }

    await client.query("COMMIT");
    res.json({ ...account, account_type_ids });
  } catch (err) {
    await client.query("ROLLBACK");
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// Récupérer tous les comptes avec leurs types
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(`
        SELECT 
    a.id, 
    a.name, 
    json_agg(json_build_object('id', at.id, 'name', at.name)) AS types
  FROM accounts a
  LEFT JOIN account_account_types act ON a.id = act.account_id
  LEFT JOIN account_types at ON act.account_type_id = at.id
  GROUP BY a.id
  ORDER BY a.name;
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Supprimer un compte
router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query("DELETE FROM accounts WHERE id = $1", [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/full", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        a.id AS account_id,
        a.name AS account_name,
        at.id AS type_id,
        at.name AS type_name,
        act.cash AS cash, 
        o.id AS order_id,
        o.symbol,
        o.quantity,
        o.price,
        o.date,
        o.type
      FROM accounts a
      LEFT JOIN account_account_types act ON a.id = act.account_id
      LEFT JOIN account_types at ON act.account_type_id = at.id
      LEFT JOIN orders o 
        ON o.account_id = a.id 
        AND o.account_type_id = at.id
      ORDER BY a.id, at.id, o.date DESC;
    `);

    const rows = result.rows;
    const accounts = {};

    // ----------------------------------------------------
    // 1. Regroupe comptes -> types -> orders
    // ----------------------------------------------------
    rows.forEach((row) => {
      if (!accounts[row.account_id]) {
        accounts[row.account_id] = {
          id: row.account_id,
          name: row.account_name,
          types: {},
        };
      }

      if (!accounts[row.account_id].types[row.type_id]) {
        accounts[row.account_id].types[row.type_id] = {
          id: row.type_id,
          name: row.type_name,
          cash: Number(row.cash) || 0,
          orders: [],
        };
      }

      // Vérifie que le symbole existe
      if (row.order_id && row.symbol) {
        accounts[row.account_id].types[row.type_id].orders.push({
          id: row.order_id,
          symbol: row.symbol.trim().toUpperCase(),
          quantity: Number(row.quantity),
          price: Number(row.price),
          date: row.date,
          type: row.type,
        });
      }
    });

    // ----------------------------------------------------
    // 2. Récupère tous les symboles Yahoo uniques
    // ----------------------------------------------------
    const symbols = [
      ...new Set(
        rows.filter((r) => r.symbol).map((r) => r.symbol.trim().toUpperCase())
      ),
    ];

    // ----------------------------------------------------
    // 3. Fetch Yahoo (longName, price, etc.)
    // ----------------------------------------------------
    const yahooInfo = {};

    for (const s of symbols) {
      try {
        const q = (await getYahooPrice(s)) || {};
        yahooInfo[s] = {
          longName: q.longName || q.shortName || s,
          shortName: q.shortName || s,
          currentPrice: q.price || null,
        };
      } catch (err) {
        console.log("Yahoo error for", s);
        yahooInfo[s] = {
          longName: s,
          shortName: s,
          currentPrice: null,
        };
      }
    }

    // ----------------------------------------------------
    // 4. Transforme les orders -> positions (PRU, totals)
    // ----------------------------------------------------
    const formatted = Object.values(accounts).map((account) => {
      let accountTotal = 0;

      const types = Object.values(account.types).map((type) => {
        const positions = {};

        // Agrégation des ordres
        type.orders.forEach((o) => {
          const sym = o.symbol;
          if (!positions[sym]) {
            positions[sym] = {
              symbol: sym,
              longName: yahooInfo[sym]?.longName || sym,
              shortName: yahooInfo[sym]?.shortName || sym,
              quantity: 0,
              totalCost: 0,
            };
          }

          if (o.type === "buy") {
            positions[sym].quantity += o.quantity;
            positions[sym].totalCost += o.quantity * o.price;
          } else if (o.type === "sell") {
            positions[sym].quantity -= o.quantity;
            positions[sym].totalCost -= o.quantity * o.price;
          }
        });

        // Calculs PRU, currentPrice, value, diff
        let typeTotal = type.cash; // inclut cash directement

        const finalPositions = Object.values(positions)
          .filter((p) => p.quantity > 0)
          .map((p) => {
            p.avgPrice = p.totalCost / p.quantity;
            p.currentPrice = yahooInfo[p.symbol]?.currentPrice || p.avgPrice;
            p.currentValue = p.currentPrice * p.quantity;
            p.diffValue = p.currentValue - p.totalCost;
            p.diffPercent = (p.diffValue / p.totalCost) * 100;

            typeTotal += p.currentValue;

            return p;
          });

        const totalInvested = finalPositions.reduce(
          (sum, p) => sum + p.totalCost,
          0
        );

        const diffValueType = typeTotal - (totalInvested + type.cash);
        const diffPercentType =
          totalInvested + type.cash === 0
            ? 0
            : (diffValueType / (totalInvested + type.cash)) * 100;

        accountTotal += typeTotal;

        return {
          id: type.id,
          name: type.name,
          cash: type.cash,
          totalValue: typeTotal,
          totalInvested,
          diffValue: diffValueType,
          diffPercent: diffPercentType,
          positions: finalPositions,
        };
      });

      return {
        id: account.id,
        name: account.name,
        totalValue: accountTotal,
        types,
      };
    });

    res.json(formatted);
  } catch (err) {
    console.error("Erreur /accounts/full :", err);
    res.status(500).json({ error: err.message });
  }
});

// Mettre à jour les liquidités d’un type de compte
router.put("/cash", async (req, res) => {
  const { account_id, type_id, cash } = req.body;

  if (!account_id || !type_id) {
    return res.status(400).json({ error: "account_id et type_id requis" });
  }

  try {
    await pool.query(
      `UPDATE account_account_types
       SET cash = $3
       WHERE account_id = $1 AND account_type_id = $2`,
      [account_id, type_id, cash]
    );

    res.json({ success: true, cash });
  } catch (err) {
    console.error("Erreur update cash :", err);
    res.status(500).json({ error: err.message });
  }
});

// Récupérer un compte par id avec ses types
router.get("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      `
      SELECT a.id, a.name, COALESCE(json_agg(at.*) FILTER (WHERE at.id IS NOT NULL), '[]') AS types
      FROM accounts a
      LEFT JOIN account_account_types act ON a.id = act.account_id
      LEFT JOIN account_types at ON act.account_type_id = at.id
      WHERE a.id = $1
      GROUP BY a.id
    `,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Compte introuvable" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
