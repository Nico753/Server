const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const bodyParser = require('body-parser');
const cors = require('cors');  // Importa il pacchetto cors

const app = express();
const port = 3000;

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

// PUT route: sostituisce tutti i campi di un utente specificato
app.put('/update-user', async (req, res) => {
  const username = req.query.username; // Otteniamo lo username dai parametri di query
  const updatedUser = req.body;        // I nuovi dati dell'utente sono passati nel body della richiesta

  // Controllo se lo username è presente
  if (!username) {
    return res.status(400).json({ error: 'Lo username è obbligatorio' });
  }

  // Controllo che i nuovi dati dell'utente siano presenti
  if (!updatedUser || typeof updatedUser !== 'object' || Array.isArray(updatedUser)) {
    return res.status(400).json({ error: 'Dati utente mancanti o formato non valido' });
  }

  try {
    // Leggi i dati dal file JSON
    const data = await fs.readFile(jsonFilePath, 'utf8');
    const currentData = JSON.parse(data);

    // Trova l'utente con lo username fornito
    const userIndex = currentData.Users.findIndex(u => u.username === username);

    if (userIndex === -1) {
      return res.status(404).json({ error: 'Utente non trovato' });
    }

    // Sostituisci i dati dell'utente
    currentData.Users[userIndex] = { ...updatedUser, username }; // Mantiene lo username invariato

    // Scrivi i dati aggiornati nel file JSON
    await fs.writeFile(jsonFilePath, JSON.stringify(currentData, null, 2));

    res.status(200).json({ message: 'Dati utente aggiornati con successo', updatedUser });
  } catch (err) {
    res.status(500).json({ error: 'Errore nell\'aggiornare i dati utente', details: err.message });
  }
});

// PUT route: sostituisce l'immagine dello user
app.put('/change-image', async (req, res) => {
  const username = req.query.username; // Otteniamo lo username dai parametri di query
  const { image } = req.body;          // Otteniamo la nuova immagine in formato Base64 dal body della richiesta

  // Controllo se lo username è presente
  if (!username) {
    return res.status(400).json({ error: 'Lo username è obbligatorio' });
  }

  // Controllo se l'immagine è presente
  if (!image || typeof image !== 'string') {
    return res.status(400).json({ error: 'Immagine mancante o formato non valido' });
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

    // Aggiorna l'immagine dell'utente
    user.image = image;

    // Scrivi i dati aggiornati nel file JSON
    await fs.writeFile(jsonFilePath, JSON.stringify(currentData, null, 2));

    res.status(200).json({ message: 'Immagine aggiornata con successo', user });
  } catch (err) {
    console.error('Errore nel cambiare l\'immagine:', err); // Log dell'errore
    res.status(500).json({ error: 'Errore nel cambiare l\'immagine', details: err.message });
  }
});

// Avvia il server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server in esecuzione su http://localhost:${PORT}`);
});
