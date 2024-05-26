// server.js

const express = require('express');
const mineflayer = require('mineflayer');
const path = require('path');
const bodyParser = require('body-parser');
const http = require('http');
const WebSocket = require('ws');
const { SocksProxyAgent } = require('socks-proxy-agent');

const app = express();
const port = process.env.PORT || 3000; // Ustawia port na zmiennej środowiskowej PORT lub 3000
const wsPort = process.env.WS_PORT || 3001; // Ustawia port WebSocket na zmiennej środowiskowej WS_PORT lub 3001
const server = http.createServer(app); // Tworzy serwer HTTP z aplikacją Express
const wss = new WebSocket.Server({ server }); // Korzysta z serwera HTTP do obsługi WebSocket

let bots = [];

// Middleware do parsowania JSON
app.use(bodyParser.json({ limit: '500mb' }));
// Serwuje pliki statyczne, w tym index.html, styles.css i scripts.js
app.use(express.static(path.join(__dirname)));

// Funkcja do rozgłaszania wiadomości do wszystkich klientów WebSocket
function broadcastToClients(message) {
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

// Funkcja do uruchamiania wielu botów z opóźnieniem i opcjonalnym adresem proxy
function startBot(host, port, proxyList, botCount, delay) {
  for (let i = 0; i < botCount; i++) {
    setTimeout(() => {
      const random_number = Math.floor(Math.random() * 1000);
      const BOT_USERNAME = `${random_number}_${i}`;

      let botOptions = {
        host: host,
        port: port ? parseInt(port) : 25565,
        username: BOT_USERNAME,
        hideErrors: false
      };

      let proxy = null;

      if (proxyList && proxyList.length > 0) {
        proxy = proxyList[i % proxyList.length];
        const proxyUrl = `socks5://${proxy}`;
        const agent = new SocksProxyAgent(proxyUrl, {
          timeout: 1000
        });
        botOptions.agent = agent;
      }

      const bot = mineflayer.createBot(botOptions);

      bot.once('login', () => {
        const message = `→ Bot ${BOT_USERNAME} Connected`;
        broadcastToClients(message);
      });

      bot.once('error', () => {
        const message = `✉︎ Error: Bot ${BOT_USERNAME}`;
        broadcastToClients(message);
      });

      bot.on('error', (err) => {
        const message = `✉︎ Error: ${err.message}`;
        broadcastToClients(message);
      });

      bot.once('end', () => {
        const message = `← Bot ${BOT_USERNAME} Disconnected`;
        console.log(message);
        broadcastToClients(message);
        bots = bots.filter(b => b !== bot);
      });

      bot.on('end', () => {
        const message = `← Bot ${BOT_USERNAME} Disconnected`;
        console.log(message);
        broadcastToClients(message);
        bots = bots.filter(b => b !== bot);
      });

      bots.push(bot);
    }, i * delay);
  }
}

// Endpoint do uruchamiania botów
app.post('/start-bot', (req, res) => {
  const { host, port, proxyList, botCount } = req.body;
  const delay = 1000;

  if (bots.length > 0) {
    res.send('✉︎ Bots are already running');
    return;
  }

  if (proxyList && proxyList.length > 0) {
    startBot(host, port, proxyList, botCount, delay);
    broadcastToClients('✉︎ Bots trying to connect...');
    res.send('');
    return;
  }

  res.send('✉︎ Add proxy to start');
});

// Endpoint do zatrzymywania botów
app.post('/stop-bot', (req, res) => {
  if (bots.length === 0) {
    res.send('✉︎ No bot is running');
    return;
  }

  bots.forEach(bot => {
    if (bot && typeof bot.end === 'function') {
      bot.end('✉︎ Bots stopped');
    }
  });

  bots = [];
  broadcastToClients('✉︎ All bots have stopped');
  res.send('');
});

// Serwer HTTP nasłuchuje na odpowiednim porcie
server.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});

// Serwer WebSocket nasłuchuje na odpowiednim porcie
wss.on('connection', (ws) => {
  ws.send('✉︎ You are connected to bot sender');
});
