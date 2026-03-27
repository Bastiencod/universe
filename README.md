# College Universe - Site GMod

Site web statique pour le serveur GMod College Universe, avec acces protege par mot de passe.

---

## Deploiement sur GitHub Pages

1. Cree un nouveau repository sur GitHub.
2. Upload tous les fichiers ou clone + push.
3. Va dans `Settings -> Pages`.
4. Source : `Deploy from a branch`.
5. Branch : `main` / `(root)`.

---

## Changer le mot de passe

Le mot de passe par defaut est `Universe2026!`.

Pour le changer :

1. Va sur [ce generateur SHA-256](https://emn178.github.io/online-tools/sha256.html).
2. Entre ton nouveau mot de passe et copie le hash.
3. Ouvre `data/config.json`.
4. Remplace la valeur de `password_hash` par ton nouveau hash.

```json
{
  "password_hash": "TON_HASH_SHA256_ICI"
}
```

Note de securite : la protection est client-side (JavaScript). Elle empeche l'acces casual mais un utilisateur avance peut contourner via les DevTools.

---

## Configuration

Ouvre `data/config.json` pour personnaliser :

```json
{
  "password_hash": "...",
  "site_title": "College Universe - GMod Server",
  "server_ip": "node01.universe-gmod.fr",
  "server_port": "25000"
}
```

---

## Personnalisation

| Fichier | Ce que tu peux changer |
|---------|------------------------|
| `data/config.json` | IP serveur, titre, mot de passe |
| `index.html` | Liens Discord, Steam, addons requis |
| `assets/css/style.css` | Couleurs, polices, design |
| `assets/js/upload.js` | Logique d'upload |

---

## Structure

```text
|- index.html
|- data/
|  \- config.json
|- assets/
|  |- css/
|  |  \- style.css
|  \- js/
|     |- auth.js
|     |- upload.js
|     \- main.js
\- README.md
```
