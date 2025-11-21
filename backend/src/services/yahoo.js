import YahooFinance from "yahoo-finance2";

const yf = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

export async function getYahooPrice(symbol) {
  try {
    const quote = await yf.quote(symbol);

    return {
      symbol: quote.symbol,
      price: quote.regularMarketPrice || null,
      previousClose: quote.regularMarketPreviousClose || null,
      marketState: quote.marketState || null,

      // ✅ Ajout essentiel :
      longName: quote.longName || null,
      shortName: quote.shortName || null,
    };
  } catch (err) {
    console.error("Erreur Yahoo Finance:", err.message);
    throw new Error("Impossible de récupérer le prix Yahoo Finance");
  }
}

export async function getUSDtoEUR() {
  try {
    const quote = await yf.quote("EURUSD=X"); // symbole Yahoo pour EUR/USD
    const rate = quote.regularMarketPrice;
    if (!rate) throw new Error("Taux EUR/USD introuvable");
    return rate; // 1 USD = rate EUR
  } catch (err) {
    console.error("Erreur récupération EUR/USD:", err.message);
    return 0.93; // fallback si échec
  }
}
