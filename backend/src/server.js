// express apiroutes
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { testDB } from "./script/db.js";
import accountRoutes from "./routes/accounts.js";
import { initDatabase } from "./initDatabase.js";
import ordersRouter from "./routes/orders.js";
import tickersRouter from "./routes/tickers.js";
import cron from "node-cron";
import { updateTickers } from "./script/updateTickers.js";
import stockRoutes from "./routes/stock.js";
import "./script/Portfolio.js";
import portfolioRouter from "./routes/portfolio.js";

// initialize dotenv
dotenv.config();

// create express app
const app = express();
const PORT = process.env.PORT || 8000;

// middleware
app.use(cors());
app.use(express.json());

// routes
app.use("/api/orders", ordersRouter);
app.use("/api/accounts", accountRoutes);
app.use("/api/tickers", tickersRouter);
app.use("/api/stock", stockRoutes);
app.use("/api/portfolio", portfolioRouter);

// test de la bdd au démarrage
await testDB(); // Vérifie la connexion
await initDatabase(); // Crée toutes les tables
// await updateTickers(); // Peut enfin tourner
// Tous les mois le 1er à 3h du matin
cron.schedule("0 3 1 * *", async () => {
  console.log("CRON: mise à jour mensuelle des tickers…");
  await updateTickers();
});

// start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
