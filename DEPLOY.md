# Sofa Visualizer - Istruzioni Deploy

## 1. Deploy Backend su Railway

### Opzione A: Deploy da GitHub

1. Vai su [railway.app](https://railway.app) e accedi
2. Clicca "New Project" → "Deploy from GitHub repo"
3. Collega il repository `sofa-visualizer`
4. Railway detecterà automaticamente Node.js

### Opzione B: Deploy manuale con Railway CLI

```bash
# Installa Railway CLI (se non l'hai)
npm install -g @railway/cli

# Login
railway login

# Crea nuovo progetto
railway init

# Deploy
railway up
```

### Configura Variabili d'Ambiente

Su Railway Dashboard → Settings → Variables:
- `GOOGLE_API_KEY` = `LA_TUA_API_KEY_QUI` (ottienila da Google AI Studio)

Railway assegnerà automaticamente `PORT`.

### Ottieni l'URL del Backend

Dopo il deploy, vai su Settings → Domains e copia l'URL (es: `sofa-visualizer-production.up.railway.app`)

---

## 2. Deploy Frontend su Vercel

1. Vai su [vercel.com](https://vercel.com) e accedi
2. "Add New Project" → Importa repository
3. **Prima del deploy**, modifica `index.html` per aggiungere l'URL backend:

```html
<script>
  window.BACKEND_URL = 'https://TUO-BACKEND.up.railway.app';
</script>
```

4. Deploy!

---

## 3. Test Finale

1. Apri l'URL Vercel del frontend
2. Inserisci la Google API key
3. Carica foto divano
4. Seleziona tessuto/colore
5. Genera!

**L'app è ora accessibile da qualsiasi dispositivo!** 🎉
