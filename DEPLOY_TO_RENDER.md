# 🚀 DÉPLOIEMENT SUR RENDER

Ce guide explique comment déployer cette application Node.js + PostgreSQL sur Render.

## 1. Préparation de la base de données (Supabase)

1. Créez un projet sur [Supabase](https://supabase.com/).
2. Allez dans **Project Settings > Database**.
3. Copiez la **Connection String** (mode URI).
   - Elle ressemble à : `postgresql://postgres:[PASSWORD]@db.[REF].supabase.co:5432/postgres`

## 2. Configuration sur Render

1. Créez un **New Web Service** sur [Render](https://dashboard.render.com/).
2. Connectez votre dépôt GitHub.
3. Configurez les paramètres suivants :
   - **Runtime** : `Node`
   - **Build Command** : `npm install`
   - **Start Command** : `npm start`
4. Ajoutez les **Environment Variables** :
   - `DATABASE_URL` : Votre URL de connexion Supabase.
   - `API_TOKEN` : Un jeton secret pour sécuriser l'administration.
     - *Générez-en un avec :* `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
   - `NODE_ENV` : `production`

## 3. Mise à jour et Push

Pour envoyer vos modifications vers GitHub, vous pouvez utiliser le script `push.bat` (sur Windows) :
```bash
push.bat
```

## 🛠️ Maintenance

- La table `pages` est créée automatiquement au premier démarrage.
- L'administration des pages est accessible via `/pages-admin`.
- Le gestionnaire de données est accessible via `/supabase`.

---
calmtechnology.ch
