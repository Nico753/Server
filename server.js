const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const bodyParser = require('body-parser');
const cors = require('cors');  // Importa il pacchetto cors

const app = express();
const port = 3000;

app.use(express.json({ limit: '10mb' }));  // Aumenta il limite della dimensione
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Usa il middleware cors per abilitare CORS
app.use(cors({
  origin: '*', // Permette tutte le origini
  methods: ['GET', 'POST', 'DELETE', 'PUT'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
// Usa il middleware body-parser per parsare il body delle richieste POST
app.use(bodyParser.json());

// Percorso al file data.json
const jsonFilePath = path.join(__dirname, 'data.json');

// GET route: restituisce il contenuto di data.json
app.get('/data', async (req, res) => {
  try {
    const data = await fs.readFile(jsonFilePath, 'utf8');
    res.status(200).json(JSON.parse(data));
  } catch (err) {
    res.status(500).json({ error: 'Errore nella lettura del file', details: err.message });
  }
});

// POST route: aggiungi un nuovo utente
app.post('/add-user', async (req, res) => {
  const newUser = req.body; // Il nuovo utente è passato nel body della richiesta

  try {
    const data = await fs.readFile(jsonFilePath, 'utf8');
    const currentData = JSON.parse(data);

    // Aggiungi il nuovo utente
    currentData.Users.push(newUser);

    // Scrivi il contenuto aggiornato nel file data.json
    await fs.writeFile(jsonFilePath, JSON.stringify(currentData, null, 2));

    res.status(200).json({ message: 'Nuovo utente aggiunto', newUser });
  } catch (err) {
    res.status(500).json({ error: 'Errore nella scrittura del file', details: err.message });
  }
});

app.post('/add-cart', async (req, res) => {
  const username = req.query.username;  // Otteniamo lo username dai parametri di query
  const { product } = req.body;         // Otteniamo il prodotto da aggiungere al carrello

  // Controllo se lo username è presente
  if (!username) {
    return res.status(400).json({ error: 'Lo username è obbligatorio' });
  }

  // Controllo che il prodotto sia presente
  if (!product) {
    return res.status(400).json({ error: 'Prodotto mancante nel corpo della richiesta' });
  }

  try {
    // Leggi i dati dal file JSON
    const data = await fs.readFile(jsonFilePath, 'utf8');
    const currentData = JSON.parse(data);

    // Trova l'utente con lo username fornito
    const user = currentData.Users.find(u => u.username === username);

    if (!user) {
      return res.status(404).json({ error: 'Utente non trovato' });
    }

    // Aggiungi il prodotto al carrello dell'utente
    user.shoppingCart.push(product);

    // Scrivi i dati aggiornati nel file JSON
    await fs.writeFile(jsonFilePath, JSON.stringify(currentData, null, 2));

    res.status(200).json({ message: 'Prodotto aggiunto al carrello', user });
  } catch (err) {
    res.status(500).json({ error: 'Errore nel modificare il carrello', details: err.message });
  }
});

app.delete('/remove-cart', async (req, res) => {
  const username = req.query.username;  // Otteniamo lo username dai parametri di query
  const { product } = req.body;         // Il prodotto da rimuovere è passato nel corpo della richiesta

  // Debug: log per verificare che la richiesta sia corretta
  console.log("Received DELETE request with:", { username, product });

  // Controllo se lo username è presente
  if (!username) {
    return res.status(400).json({ error: 'Lo username è obbligatorio' });
  }

  // Controllo che il prodotto sia presente nel corpo della richiesta
  if (!product || !product.id || !product.size) {
    return res.status(400).json({ error: 'ID del prodotto e taglia obbligatori' });
  }

  try {
    // Leggi i dati dal file JSON
    const data = await fs.readFile(jsonFilePath, 'utf8');
    const currentData = JSON.parse(data);

    // Trova l'utente con lo username fornito
    const user = currentData.Users.find(u => u.username === username);

    if (!user) {
      return res.status(404).json({ error: 'Utente non trovato' });
    }

    // Trova il prodotto nel carrello
    const productIndex = user.shoppingCart.findIndex(p => p.id === product.id && p.size === product.size);

    if (productIndex === -1) {
      return res.status(404).json({ error: 'Prodotto non trovato nel carrello' });
    }

    // Rimuovi il prodotto dal carrello
    user.shoppingCart.splice(productIndex, 1);

    // Scrivi i dati aggiornati nel file JSON
    await fs.writeFile(jsonFilePath, JSON.stringify(currentData, null, 2));

    // Risposta con successo
    res.status(200).json({ message: 'Prodotto rimosso dal carrello', user });
  } catch (err) {
    console.error('Errore nel rimuovere il prodotto:', err); // Log dell'errore
    res.status(500).json({ error: 'Errore nel rimuovere il prodotto dal carrello', details: err.message });
  }
});

app.delete('/clear-cart', async (req, res) => {
  const username = req.query.username; // Otteniamo lo username dai parametri di query
  // Controllo se lo username è presente
  if (!username) {
    return res.status(400).json({ error: 'Lo username è obbligatorio' });
  }
  try {
    // Leggi i dati dal file JSON
    const data = await fs.readFile(jsonFilePath, 'utf8');
    const currentData = JSON.parse(data);
    // Trova l'utente con lo username fornito
    const user = currentData.Users.find(u => u.username === username);
    if (!user) {
      return res.status(404).json({ error: 'Utente non trovato' });
    }
    // Svuota il carrello dell'utente
    user.shoppingCart = [];
    // Scrivi i dati aggiornati nel file JSON
    await fs.writeFile(jsonFilePath, JSON.stringify(currentData, null, 2));
    // Risposta con successo
    res.status(200).json({ message: 'Carrello svuotato con successo', user });
  } catch (err) {
    console.error('Errore nello svuotare il carrello:', err); // Log dell'errore
    res.status(500).json({ error: 'Errore nello svuotare il carrello', details: err.message });
  }
});

// POST route: aggiungi un prodotto o più prodotti alla cronologia degli acquisti dell'utente
app.post('/add-purchase', async (req, res) => {
  const username = req.query.username; // Otteniamo lo username dai parametri di query
  const { products } = req.body;       // Otteniamo l'array di prodotti da aggiungere alla cronologia degli acquisti

  // Controllo se lo username è presente
  if (!username) {
    return res.status(400).json({ error: 'Lo username è obbligatorio' });
  }

  // Controllo che i prodotti siano presenti
  if (!products || !Array.isArray(products) || products.length === 0) {
    return res.status(400).json({ error: 'Prodotti mancanti o formato non valido' });
  }

  try {
    // Leggi i dati dal file JSON
    const data = await fs.readFile(jsonFilePath, 'utf8');
    const currentData = JSON.parse(data);

    // Trova l'utente con lo username fornito
    const user = currentData.Users.find(u => u.username === username);

    if (!user) {
      return res.status(404).json({ error: 'Utente non trovato' });
    }

    // Inizializza la cronologia acquisti se non esiste
    user.purchaseHistory = user.purchaseHistory || [];

    // Aggiungi i prodotti alla cronologia degli acquisti dell'utente
    user.purchaseHistory.push(...products); // Usa spread operator per aggiungere i prodotti

    // Scrivi i dati aggiornati nel file JSON
    await fs.writeFile(jsonFilePath, JSON.stringify(currentData, null, 2));

    res.status(200).json({ message: 'Prodotti aggiunti alla cronologia degli acquisti', user });
  } catch (err) {
    res.status(500).json({ error: 'Errore nell\'aggiungere i prodotti alla cronologia degli acquisti', details: err.message });
  }
});

// POST route: aggiorna l'immagine del profilo di un utente
app.post('/update-profile-image', async (req, res) => {
  const username = req.query.username;   // Otteniamo lo username dai parametri di query
  const { imageSrc } = req.body;         // Otteniamo il nuovo src dell'immagine dal body della richiesta

  // Controllo che lo username e l'immagine siano presenti
  if (!username) {
    return res.status(400).json({ error: 'Lo username è obbligatorio' });
  }

  if (!imageSrc) {
    return res.status(400).json({ error: 'L\'immagine è obbligatoria' });
  }

  try {
    // Leggi i dati dal file JSON
    const data = await fs.readFile(jsonFilePath, 'utf8');
    const currentData = JSON.parse(data);

    // Trova l'utente con lo username fornito
    const user = currentData.Users.find(u => u.username === username);

    if (!user) {
      return res.status(404).json({ error: 'Utente non trovato' });
    }

    // Aggiorna il campo dell'immagine del profilo dell'utente
    user.profileImg = imageSrc; // Impostiamo il nuovo percorso dell'immagine

    // Scrivi i dati aggiornati nel file JSON
    await fs.writeFile(jsonFilePath, JSON.stringify(currentData, null, 2));

    // Risposta con successo
    res.status(200).json({ message: 'Immagine del profilo aggiornata con successo', user });
  } catch (err) {
    console.error('Errore nell\'aggiornare l\'immagine del profilo:', err);
    res.status(500).json({ error: 'Errore nell\'aggiornare l\'immagine del profilo', details: err.message });
  }
});

// Avvia il server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server in esecuzione su http://localhost:${PORT}`);
});
