import { pool } from "./script/db.js";

export async function initDatabase() {
  try {
    // Table account_types
    await pool.query(`
      CREATE TABLE IF NOT EXISTS account_types (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL UNIQUE
      );
    `);

    // Table accounts
    await pool.query(`
      CREATE TABLE IF NOT EXISTS accounts (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL
      );
    `);

    // Table pivot many-to-many accounts ↔ account_types
    await pool.query(`
  CREATE TABLE IF NOT EXISTS account_account_types (
    account_id INT REFERENCES accounts(id) ON DELETE CASCADE,
    account_type_id INT REFERENCES account_types(id) ON DELETE CASCADE,
    cash NUMERIC(12,2) DEFAULT 0,
    PRIMARY KEY (account_id, account_type_id)
  );
`);

    // Table orders
    await pool.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        account_id INT REFERENCES accounts(id) ON DELETE CASCADE,
        account_type_id INT REFERENCES account_types(id) ON DELETE CASCADE,
        symbol TEXT NOT NULL,
        type TEXT NOT NULL, -- buy ou sell
        quantity NUMERIC NOT NULL,
        price NUMERIC NOT NULL,
        date TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    // Table tickers
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tickers (
        id SERIAL PRIMARY KEY,
        symbol TEXT NOT NULL UNIQUE,
        description TEXT,
        exchange TEXT,
        market TEXT,
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Table portfolio_history
    await pool.query(`
      CREATE TABLE IF NOT EXISTS portfolio_history (
        id SERIAL PRIMARY KEY,
        date DATE NOT NULL UNIQUE,
        total_value NUMERIC(12,2) NOT NULL
      );
    `);

    // Vérifier si la table account_types est vide
    const { rows } = await pool.query(
      "SELECT COUNT(*) AS count FROM account_types"
    );
    const count = Number(rows[0].count);

    if (count === 0) {
      console.log("Insertion des types de comptes…");

      await pool.query(`
        INSERT INTO account_types (name)
        VALUES
          ('Livret A'),
          ('Livret de Développement Durable et Solidaire (LDDS)'),
          ('Livret d’Épargne Populaire (LEP)'),
          ('Livret Jeune'),
          ('Compte Épargne Logement (CEL)'),
          ('Plan Épargne Logement (PEL)'),
          ('Assurance vie'),
          ('Compte Courant'),
          ('Plan d’Épargne en Actions (PEA)'),
          ('Plan d’Épargne Entreprise (PEE)'),
          ('Plan d’Épargne Retraite (PER)'),
          ('Compte Titres Ordinaire (CTO)'),
          ('Cryptomonnaies'),
          ('Autre')
        ON CONFLICT DO NOTHING;
      `);

      console.log("Types de comptes insérés avec succès.");
    } else {
      console.log("Types de comptes déjà présents. Pas d’insertion.");
    }

    console.log("Base de données initialisée avec succès !");
  } catch (err) {
    console.error("Erreur lors de l'initialisation de la BDD:", err.message);
  }
}
