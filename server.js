const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Fichiers statiques
app.use(express.static(path.join(__dirname, "public")));

// Route API test
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
