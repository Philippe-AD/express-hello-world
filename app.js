const express = require("express");
const path = require("path");
require("dotenv").config();
const Airtable = require("airtable");

const app = express();
const port = process.env.PORT || 3001;

// Configuration Airtable
const base = new Airtable({
  apiKey: process.env.AIRTABLE_API_KEY
}).base(process.env.AIRTABLE_BASE_ID);

// Middleware pour parser JSON
app.use(express.json());
app.use(express.static('.'));

app.get("/", (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

// Routes API Airtable

// GET - Récupérer tous les enregistrements
app.get('/api/records', async (req, res) => {
  try {
    const records = [];
    await base(process.env.AIRTABLE_TABLE_NAME).select({
      view: 'Grid view'
    }).eachPage((pageRecords, fetchNextPage) => {
      pageRecords.forEach((record) => {
        records.push({
          id: record.id,
          fields: record.fields
        });
      });
      fetchNextPage();
    });
    res.json(records);
  } catch (error) {
    console.error('Erreur lors de la récupération des enregistrements:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des données' });
  }
});

// POST - Créer un nouvel enregistrement
app.post('/api/records', async (req, res) => {
  try {
    const { fields } = req.body;
    const record = await base(process.env.AIRTABLE_TABLE_NAME).create(fields);
    res.json({
      id: record.id,
      fields: record.fields
    });
  } catch (error) {
    console.error('Erreur lors de la création de l\'enregistrement:', error);
    res.status(500).json({ error: 'Erreur lors de la création de l\'enregistrement' });
  }
});

// PUT - Mettre à jour un enregistrement
app.put('/api/records/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { fields } = req.body;
    const record = await base(process.env.AIRTABLE_TABLE_NAME).update(id, fields);
    res.json({
      id: record.id,
      fields: record.fields
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour de l\'enregistrement:', error);
    res.status(500).json({ error: 'Erreur lors de la mise à jour de l\'enregistrement' });
  }
});

// DELETE - Supprimer un enregistrement
app.delete('/api/records/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deletedRecord = await base(process.env.AIRTABLE_TABLE_NAME).destroy(id);
    res.json({ message: 'Enregistrement supprimé', id: deletedRecord.id });
  } catch (error) {
    console.error('Erreur lors de la suppression de l\'enregistrement:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression de l\'enregistrement' });
  }
});

const server = app.listen(port, () => console.log(`Example app listening on port ${port}!`));

server.keepAliveTimeout = 120 * 1000;
server.headersTimeout = 120 * 1000;

// const confetti = require("canvas-confetti");
