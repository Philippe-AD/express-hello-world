# 🚀 GUIDE DE DÉPLOIEMENT SUR RENDER

## 📋 Préparation avant déploiement

### 1. Variables d'environnement pour la production

Votre fichier `.env` ne sera PAS uploadé (c'est dans .gitignore).
Il faut configurer les variables dans Render :

```env
AIRTABLE_API_KEY=votre_token_personnel_airtable
AIRTABLE_BASE_ID=votre_identifiant_de_base
AIRTABLE_TABLE_NAME=votre_nom_de_table
```

**⚠️ IMPORTANT** : Consultez le fichier `render-env-vars.txt` (local uniquement) pour les vraies valeurs.

### 2. Vérification des fichiers nécessaires

✅ **Fichiers requis pour Render :**
- `package.json` (✓ présent)
- `app.js` (✓ modifié avec Airtable)
- `index.html` (✓ adapté aux vrais champs)
- `.gitignore` (✓ .env exclu)

❌ **Fichiers à ne PAS uploader :**
- `.env` (secrets locaux)
- `node_modules/` (sera réinstallé)
- `test-*.js` (scripts de test locaux)

## 🔄 MÉTHODES DE DÉPLOIEMENT

### Option A : Via GitHub (Recommandé)

#### Étape 1 : Préparer le repository
```bash
# Ajouter les fichiers modifiés
git add app.js index.html package.json

# Commit avec les nouvelles fonctionnalités
git commit -m "Add Airtable integration with dynamic UI"

# Push vers GitHub
git push origin main
```

#### Étape 2 : Configurer Render
1. **Connecter GitHub** : Allez sur render.com/dashboard
2. **Nouveau Web Service** : "Create Web Service"
3. **Sélectionner repo** : `Philippe-AD/express-hello-world`
4. **Configuration** :
   - Name: `express-airtable-app`
   - Branch: `main`
   - Build Command: `npm install`
   - Start Command: `npm start`

#### Étape 3 : Variables d'environnement
Dans Render Dashboard → Environment :
- Copiez les valeurs depuis votre fichier `render-env-vars.txt` local

### Option B : Déploiement direct

#### Étape 1 : Préparer l'archive
```bash
# Supprimer les fichiers de test
rm test-*.js analyze-*.js detect-*.js explore-*.js

# Vérifier le contenu
ls -la
```

#### Étape 2 : Upload manuel
1. **Zipper le projet** (sans node_modules et .env)
2. **Upload via Render** interface

## ⚙️ CONFIGURATION RENDER

### Build Settings
```yaml
Build Command: npm install
Start Command: npm start
Node Version: 18+ (ou selon engines dans package.json)
```

### Environment Variables (OBLIGATOIRE)
```
AIRTABLE_API_KEY=votre_token_personnel_airtable
AIRTABLE_BASE_ID=votre_identifiant_de_base
AIRTABLE_TABLE_NAME=votre_nom_de_table
PORT=3001
```

### Health Check
```
Health Check Path: /api/test
```

## 🔧 PROBLÈMES COURANTS

### 1. Erreur de build
```bash
# Solution : Vérifier package.json
npm install  # Test local d'abord
```

### 2. Variables d'environnement manquantes
```bash
# Dans les logs Render, vous verrez :
# "AIRTABLE_API_KEY: undefined"
# Solution : Configurer dans Environment tab
```

### 3. Erreur de port
```javascript
// Render utilise process.env.PORT automatiquement
const port = process.env.PORT || 3001;  // ✓ Correct dans votre code
```

## 📊 SURVEILLANCE POST-DÉPLOIEMENT

### Tests à effectuer après déploiement :
1. **Page principale** : `https://votre-app.onrender.com`
2. **API test** : `https://votre-app.onrender.com/api/test`
3. **API records** : `https://votre-app.onrender.com/api/records`
4. **Ajout d'enregistrement** via formulaire

### Logs à surveiller :
```bash
# Dans Render Dashboard → Logs
# Rechercher ces messages :
✅ "Example app listening on port XXXX"
✅ "Configuration Airtable initialisée"
❌ "AIRTABLE_API_KEY: undefined" → Configurer variables
❌ "NOT_AUTHORIZED" → Vérifier token
```

## 🎯 CHECKLIST FINAL

- [ ] Code testé localement
- [ ] Variables .env configurées dans Render
- [ ] Repository GitHub mis à jour
- [ ] Build réussi sur Render
- [ ] Tests fonctionnels OK
- [ ] Interface Airtable accessible

## 🚀 COMMANDES RAPIDES

```bash
# Déploiement via Git
git add .
git commit -m "Update: Airtable integration ready for production"
git push origin main

# Test local avant push
npm start
# Vérifier : http://localhost:3001
```

## 📞 SUPPORT

En cas de problème :
1. **Logs Render** : Dashboard → votre service → Logs
2. **Build logs** : Pour erreurs de déploiement
3. **Runtime logs** : Pour erreurs d'exécution
4. **Environment** : Vérifier variables