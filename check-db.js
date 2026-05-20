require('dotenv').config();
const { Pool } = require('pg');

console.log('--- Diagnostic Base de Données ---');
console.log('DATABASE_URL present:', !!process.env.DATABASE_URL);

if (!process.env.DATABASE_URL) {
  console.error('❌ ERREUR : La variable DATABASE_URL est absente.');
  console.log('Conseil : Créez un fichier .env à la racine avec votre URL Supabase.');
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function check() {
  try {
    console.log('Tentative de connexion...');
    const res = await pool.query('SELECT NOW()');
    console.log('✅ Connexion réussie ! Heure du serveur :', res.rows[0].now);
    
    const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    console.log('Tables trouvées :', tables.rows.map(t => t.table_name).join(', ') || '(aucune)');
    
    const pages = await pool.query('SELECT COUNT(*) FROM pages');
    console.log('Nombre de pages dans la table :', pages.rows[0].count);
    
  } catch (err) {
    console.error('❌ Erreur de connexion :', err.message);
  } finally {
    await pool.end();
  }
}

check();
