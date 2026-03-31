const express = require("express");
const path = require("path");
require("dotenv").config();
const { Pool } = require("pg");

const app = express();
const PORT = process.env.PORT || 3000;

// Pool PostgreSQL / Supabase
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// Vérifie que le nom de table est réel (anti-injection)
async function isValidTable(name) {
  const r = await pool.query(
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name = $1`,
    [name]
  );
  return r.rows.length > 0;
}

// Retourne l'ensemble des colonnes réelles d'une table (anti-injection)
async function getValidColumns(name) {
  const r = await pool.query(
    `SELECT column_name FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = $1`,
    [name]
  );
  return new Set(r.rows.map((row) => row.column_name));
}

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Forcer HTTPS (Render transmet x-forwarded-proto, absent en local)
app.use((req, res, next) => {
  const proto = req.headers["x-forwarded-proto"];
  if (proto && proto !== "https") {
    return res.redirect(301, "https://" + req.headers.host + req.url);
  }
  if (proto === "https") {
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }
  next();
});

// Fichiers statiques
app.use(express.static(path.join(__dirname, "public")));

// ── Routes Supabase Manager ──────────────────────────────────────────────────

// Frontend
app.get("/supabase", (req, res) =>
  res.sendFile(path.join(__dirname, "public", "supabase.html"))
);

// Liste des tables publiques
app.get("/api/pg/tables", async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT table_name FROM information_schema.tables
       WHERE table_schema = 'public' ORDER BY table_name`
    );
    res.json(r.rows.map((row) => row.table_name));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Colonnes d'une table
app.get("/api/pg/:table/columns", async (req, res) => {
  try {
    const { table } = req.params;
    if (!(await isValidTable(table)))
      return res.status(400).json({ error: "Table invalide" });
    const r = await pool.query(
      `SELECT column_name, data_type, is_nullable, column_default
       FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = $1
       ORDER BY ordinal_position`,
      [table]
    );
    res.json(r.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Tous les enregistrements d'une table (max 500)
app.get("/api/pg/:table", async (req, res) => {
  try {
    const { table } = req.params;
    if (!(await isValidTable(table)))
      return res.status(400).json({ error: "Table invalide" });
    const r = await pool.query(`SELECT * FROM "${table}" LIMIT 500`);
    res.json(r.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Créer un enregistrement
app.post("/api/pg/:table", async (req, res) => {
  try {
    const { table } = req.params;
    if (!(await isValidTable(table)))
      return res.status(400).json({ error: "Table invalide" });
    const validCols = await getValidColumns(table);
    const fields = Object.fromEntries(
      Object.entries(req.body).filter(([k]) => validCols.has(k))
    );
    const keys = Object.keys(fields);
    if (!keys.length) return res.status(400).json({ error: "Aucun champ valide" });
    const values = Object.values(fields);
    const cols = keys.map((k) => `"${k}"`).join(", ");
    const placeholders = keys.map((_, i) => `$${i + 1}`).join(", ");
    const r = await pool.query(
      `INSERT INTO "${table}" (${cols}) VALUES (${placeholders}) RETURNING *`,
      values
    );
    res.json(r.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Mettre à jour un enregistrement
app.put("/api/pg/:table/:id", async (req, res) => {
  try {
    const { table, id } = req.params;
    if (!(await isValidTable(table)))
      return res.status(400).json({ error: "Table invalide" });
    const validCols = await getValidColumns(table);
    const fields = Object.fromEntries(
      Object.entries(req.body).filter(([k]) => validCols.has(k))
    );
    const keys = Object.keys(fields);
    if (!keys.length) return res.status(400).json({ error: "Aucun champ valide" });
    const values = Object.values(fields);
    const setClause = keys.map((k, i) => `"${k}" = $${i + 1}`).join(", ");
    const r = await pool.query(
      `UPDATE "${table}" SET ${setClause} WHERE id = $${keys.length + 1} RETURNING *`,
      [...values, id]
    );
    res.json(r.rows[0] ?? { message: "Aucune ligne mise à jour" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Supprimer un enregistrement
app.delete("/api/pg/:table/:id", async (req, res) => {
  try {
    const { table, id } = req.params;
    if (!(await isValidTable(table)))
      return res.status(400).json({ error: "Table invalide" });
    await pool.query(`DELETE FROM "${table}" WHERE id = $1`, [id]);
    res.json({ message: "Enregistrement supprimé", id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Routes existantes ────────────────────────────────────────────────────────

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    app: "mon-app-render",
    time: new Date().toISOString(),
  });
});

// Exemple POST
app.post("/api/echo", (req, res) => {
  const { message } = req.body;
  res.json({
    received: message || null,
  });
});

// Fallback simple
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`Serveur démarré sur le port ${PORT}`);
});
