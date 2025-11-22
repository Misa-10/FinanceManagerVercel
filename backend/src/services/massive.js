import axios from "axios";

const API_KEY = process.env.MASSIVE_API_KEY;

// utilitaire pour attendre
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function getAllTickers() {
  let allTickers = [];
  let url =
    "https://api.massive.com/v3/reference/tickers?market=stocks&active=false&order=asc&sort=ticker&limit=1000";

  try {
    while (url) {
      const res = await axios.get(url, {
        headers: {
          Authorization: `Bearer ${API_KEY}`,
        },
      });

      const data = res.data;

      if (data.results && data.results.length > 0) {
        allTickers.push(...data.results);
        console.log(
          `[INFO] ${allTickers.length} tickers récupérés jusqu'à présent…`
        );
      }

      // Massive fournit next_url pour la page suivante (déjà absolue)
      url = data.next_url || null;

      // Respecter le quota : 5 req/min => 1 req toutes les 12 secondes
      if (url) {
        console.log("[INFO] Attente de 12 secondes pour respecter le quota...");
        await sleep(12_000);
      }
    }

    return { results: allTickers };
  } catch (err) {
    console.error("Erreur Massive:", err.response?.data || err.message);
    throw new Error("Erreur API Massive");
  }
}
