import cron from "node-cron";
import axios from "axios";
import { pool } from "./db.js";

// Fonction pour enregistrer la valeur globale
async function recordPortfolioValue() {
  try {
    const res = await axios.get("http://localhost:8000/api/accounts/full");
    const accounts = res.data || [];

    const totalValue = accounts.reduce(
      (sum, a) => sum + (a.totalValue || 0),
      0
    );
    console.log(`Valeur globale calculée: ${totalValue} €`);

    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

    await pool.query(
      `
      INSERT INTO portfolio_history (date, total_value)
      VALUES ($1, $2)
      ON CONFLICT (date) DO UPDATE
      SET total_value = EXCLUDED.total_value
      `,
      [today, totalValue]
    );

    console.log(`Valeur globale enregistrée pour ${today}: ${totalValue} €`);
  } catch (err) {
    console.error("Erreur lors de l'enregistrement de la valeur globale:", err);
  }
}

// ----------------------------------------------------
// Cron job : tous les jours à 23h59
// ----------------------------------------------------
cron.schedule("59 23 * * *", () => {
  console.log("Lancement du cron pour enregistrer la valeur globale...");
  recordPortfolioValue();
});

// ----------------------------------------------------
// Exécution immédiate si lancé directement avec node
// ----------------------------------------------------
if (process.argv.includes("--now")) {
  console.log(
    "Exécution immédiate de l'enregistrement de la valeur globale..."
  );
  recordPortfolioValue();
}
