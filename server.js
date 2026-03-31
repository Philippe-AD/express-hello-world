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

// ── Initialisation automatique de la table pages ─────────────────────────────
async function setupPagesTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS pages (
        id         SERIAL PRIMARY KEY,
        title      TEXT NOT NULL,
        description TEXT DEFAULT '',
        url        TEXT NOT NULL,
        color      TEXT DEFAULT '#3ecf8e',
        bg_color   TEXT DEFAULT '#ecfdf5',
        icon       TEXT DEFAULT 'globe',
        active     BOOLEAN DEFAULT true,
        sort_order INT DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    const { rows } = await pool.query('SELECT COUNT(*) FROM pages');
    if (parseInt(rows[0].count) === 0) {
      await pool.query(`
        INSERT INTO pages (title, description, url, color, bg_color, icon, sort_order) VALUES
        ('Supabase Manager', 'Consulte, ajoute, modifie et supprime des enregistrements dans tes tables PostgreSQL.', '/supabase', '#3ecf8e', '#ecfdf5', 'database', 1),
        ('Gestion des pages', 'Ajoute, modifie et organise les pages visibles sur le dashboard.', '/pages-admin', '#6366f1', '#eef2ff', 'settings', 2)
      `);
    }
    // Ajouter les pages manquantes (idempotent)
    await pool.query(`
      INSERT INTO pages (title, description, url, color, bg_color, icon, sort_order)
      SELECT 'Horloge & Calendrier', 'Horloge analogique et calendrier mensuel.', '/clock.html', '#c8b560', '#fef9ec', 'clock', 3
      WHERE NOT EXISTS (SELECT 1 FROM pages WHERE url = '/clock.html')
    `);
    console.log('Table pages prête.');
  } catch (err) {
    console.error('Erreur setup pages:', err.message);
  }
}
setupPagesTable();

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
app.use(express.json({ limit: "100kb" }));
app.use(express.urlencoded({ extended: true, limit: "100kb" }));

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

// ── Authentification API ─────────────────────────────────────────────────────
const API_TOKEN = process.env.API_TOKEN;

function requireAuth(req, res, next) {
  if (!API_TOKEN) return next(); // pas de token configuré = dev local
  const auth = req.headers["authorization"] || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (token !== API_TOKEN) {
    return res.status(401).json({ error: "Non autorisé" });
  }
  next();
}

// Fichiers statiques
app.use(express.static(path.join(__dirname, "public")));

// ── Routes Supabase Manager ──────────────────────────────────────────────────

// Frontend
app.get("/supabase", (req, res) =>
  res.sendFile(path.join(__dirname, "public", "supabase.html"))
);

// Liste des tables publiques
app.get('/api/pg/tables', requireAuth, async (req, res) => {
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
app.get('/api/pg/:table/columns', requireAuth, async (req, res) => {
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

// Tous les enregistrements d'une table (paginé)
app.get('/api/pg/:table', requireAuth, async (req, res) => {
  try {
    const { table } = req.params;
    const limit  = Math.min(parseInt(req.query.limit)  || 100, 500);
    const offset = Math.max(parseInt(req.query.offset) || 0,   0);
    if (!(await isValidTable(table)))
      return res.status(400).json({ error: "Table invalide" });
    const [rRows, rCount] = await Promise.all([
      pool.query(`SELECT * FROM "${table}" LIMIT $1 OFFSET $2`, [limit, offset]),
      pool.query(`SELECT COUNT(*) FROM "${table}"`),
    ]);
    res.json({
      total: parseInt(rCount.rows[0].count),
      limit,
      offset,
      rows: rRows.rows,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Créer un enregistrement
app.post('/api/pg/:table', requireAuth, async (req, res) => {
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
app.put('/api/pg/:table/:id', requireAuth, async (req, res) => {
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
app.delete('/api/pg/:table/:id', requireAuth, async (req, res) => {
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

// ── Routes Pages dashboard ───────────────────────────────────────────────────

app.get("/pages-admin", (req, res) =>
  res.sendFile(path.join(__dirname, "public", "pages-admin.html"))
);

// Pages actives (public — utilisé par index.html)
app.get('/api/pages', async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT * FROM pages WHERE active = true ORDER BY sort_order, id`
    );
    res.json(r.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Toutes les pages (admin)
app.get('/api/pages/all', requireAuth, async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM pages ORDER BY sort_order, id');
    res.json(r.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Créer une page
app.post('/api/pages', requireAuth, async (req, res) => {
  try {
    const { title, description, url, color, bg_color, icon, active, sort_order } = req.body;
    if (!title || !url) return res.status(400).json({ error: 'title et url requis' });
    const r = await pool.query(
      `INSERT INTO pages (title, description, url, color, bg_color, icon, active, sort_order)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [title, description || '', url, color || '#3ecf8e', bg_color || '#ecfdf5',
       icon || 'globe', active !== false, parseInt(sort_order) || 0]
    );
    res.json(r.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Modifier une page
app.put('/api/pages/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, url, color, bg_color, icon, active, sort_order } = req.body;
    if (!title || !url) return res.status(400).json({ error: 'title et url requis' });
    const r = await pool.query(
      `UPDATE pages SET title=$1, description=$2, url=$3, color=$4, bg_color=$5,
       icon=$6, active=$7, sort_order=$8 WHERE id=$9 RETURNING *`,
      [title, description || '', url, color || '#3ecf8e', bg_color || '#ecfdf5',
       icon || 'globe', active !== false, parseInt(sort_order) || 0, id]
    );
    res.json(r.rows[0] ?? { message: 'Page introuvable' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Supprimer une page
app.delete('/api/pages/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM pages WHERE id = $1', [id]);
    res.json({ message: 'Page supprimée', id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

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

const server = app.listen(PORT, () => {
  console.log(`Serveur démarré sur le port ${PORT}`);
});

// Arrêt propre (SIGTERM envoyé par Render avant redémarrage)
process.on('SIGTERM', () => {
  console.log('SIGTERM reçu — arrêt propre...');
  server.close(() => {
    pool.end(() => {
      console.log('Connexions fermées.');
      process.exit(0);
    });
  });
});
