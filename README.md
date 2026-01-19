# Sofa Visualizer - Backend

Backend API per il cambio tessuto/colore divani usando Google Gemini AI.

## Deploy su Railway

1. Crea nuovo progetto su Railway
2. Connetti questo repository o fai deploy da GitHub
3. Aggiungi le variabili d'ambiente:
   - `GOOGLE_API_KEY` = La tua API key di Google AI Studio
   - `PORT` = 3001 (Railway lo imposta automaticamente)

## Sviluppo Locale

```bash
npm install
npm start
```

## Endpoint API

- `POST /api/gemini/edit` - Modifica immagine divano con Gemini
  - Body: `{ imageBase64, prompt }`
  - Returns: `{ success, image }`
