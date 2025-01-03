const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const bodyParser = require('body-parser');
const cors = require('cors');  // Importa il pacchetto cors

const app = express();
const port = 3000;

// Usa il middleware cors per abilitare CORS
app.use(cors()); // Permette richieste da tutte le origini

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

// Avvia il server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server in esecuzione su http://localhost:${PORT}`);
});
