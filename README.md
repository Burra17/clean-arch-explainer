# Clean Architecture & CQRS — Interaktiv förklaring

En interaktiv, visuell steg-för-steg-guide som visar hur en GET-förfrågan flödar genom en .NET-applikation med Clean Architecture och CQRS (MediatR).

## Snabbstart lokalt

```bash
npm install
npm run dev
```

## Deploya till GitHub Pages

### 1. Skapa repo på GitHub
Gå till https://github.com/new och skapa ett nytt **publikt** repo.

### 2. Uppdatera base-path
Öppna `vite.config.js` och ändra `base` till ditt repo-namn:
```js
base: '/DITT-REPO-NAMN/',
```

### 3. Pusha koden
```bash
git init
git add .
git commit -m "initial commit"
git branch -M main
git remote add origin https://github.com/DITT-ANVÄNDARNAMN/DITT-REPO-NAMN.git
git push -u origin main
```

### 4. Aktivera GitHub Pages
1. Gå till ditt repo på GitHub
2. **Settings** → **Pages**
3. Under **Source** välj **GitHub Actions**
4. Klart! Deployen körs automatiskt

### 5. Dela länken
Efter ca 1–2 minuter är sidan live på:
```
https://DITT-ANVÄNDARNAMN.github.io/DITT-REPO-NAMN/
```

Skicka den länken till dina vänner! 🎉
