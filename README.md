# 🎮 Collège Universe — Site GMod

Site web statique pour le serveur GMod **Collège Universe**, avec accès protégé par mot de passe.

---

## 🚀 Déploiement sur GitHub Pages

1. **Crée un nouveau repository** sur GitHub (ex: `collegeun-site`)
2. **Upload tous les fichiers** ou clone + push
3. Va dans **Settings → Pages**
4. Source : **Deploy from a branch**
5. Branch : `main` / `(root)`
6. Ton site sera disponible sur : `https://ton-pseudo.github.io/collegeun-site/`

---

## 🔐 Changer le mot de passe

Le mot de passe par défaut est `admin`.

Pour le changer :

1. Va sur [ce générateur SHA-256](https://emn178.github.io/online-tools/sha256.html)
2. Entre ton nouveau mot de passe et copie le hash
3. Ouvre `data/config.json`
4. Remplace la valeur de `password_hash` par ton nouveau hash

```json
{
  "password_hash": "TON_HASH_SHA256_ICI",
  ...
}
```

> ⚠️ **Note de sécurité** : La protection est client-side (JavaScript). Elle empêche l'accès casual mais un utilisateur avancé peut contourner via les DevTools. C'est suffisant pour une communauté privée, mais pas pour des données vraiment sensibles.

---

## ⚙️ Configuration

Ouvre `data/config.json` pour personnaliser :

```json
{
  "password_hash": "...",
  "site_title": "Collège Universe — GMod",
  "server_ip": "play.collegeun.fr",
  "server_port": "27015"
}
```

---

## 🔧 Personnalisation

| Fichier | Ce que tu peux changer |
|---------|----------------------|
| `data/config.json` | IP serveur, titre, mot de passe |
| `index.html` | Liens Discord, Steam, addons requis |
| `assets/css/style.css` | Couleurs, fonts, design |
| `assets/js/upload.js` | Logique d'upload (connecter un vrai stockage) |

### Changer les liens communautaires

Dans `index.html`, cherche ces IDs et modifie les `href` :
- `#discord-link` → Lien de ton serveur Discord
- `#steam-group` → Lien du groupe Steam

---

## 📁 Structure

```
├── index.html          # Page principale
├── data/
│   └── config.json     # Mot de passe + config serveur
├── assets/
│   ├── css/
│   │   └── style.css   # Styles
│   └── js/
│       ├── auth.js     # Système d'authentification
│       ├── upload.js   # Gestion des uploads
│       └── main.js     # Navigation + utilitaires
└── README.md
```

---

## 💡 Pour un vrai stockage de fichiers

GitHub Pages est statique → les fichiers uploadés ne sont pas sauvegardés sur le serveur.

Options pour un vrai upload :
- **Cloudflare R2** (gratuit jusqu'à 10GB) + Workers
- **Supabase Storage** (gratuit tier généreux)
- **Un VPS** avec PHP ou Node.js

Modifie la fonction `handleUpload()` dans `assets/js/upload.js` pour envoyer les fichiers vers ton API.

---

*Made for Collège Universe GMod Community*
