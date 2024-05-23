const express = require('express');
const mineflayer = require('mineflayer');
const path = require('path');
const bodyParser = require('body-parser');
const WebSocket = require('ws');

const app = express();
const port = 3000;
const wsPort = 3001;
const wss = new WebSocket.Server({ port: wsPort });

let bots = [];
let currentProxy = null;
let proxyErrorReported = false; // Flag to track if proxy error has been reported

// Middleware to parse JSON bodies
app.use(bodyParser.json());

// Serve the index.html file and other static files (like styles.css)
app.use(express.static(path.join(__dirname)));

// Function to broadcast a message to all WebSocket clients
function broadcast(message) {
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

// Function to start a single bot with a delay and an optional proxy IP
function startBot(host, port, proxyHost, proxyPort, botCount, delay) {
  for (let i = 0; i < botCount; i++) {
    setTimeout(() => {
      const random_number = Math.floor(Math.random() * 1000);
      const BOT_USERNAME = `colab_${random_number}_${i}`;

      let botOptions = {
        host: host,
        port: port ? parseInt(port) : 25565, // Default port is 25565
        username: BOT_USERNAME,
        hideErrors: false
      };

      // Add proxy if provided
      if (proxyHost && proxyPort) {
        // Set proxy IP and port for bot connection
        botOptions.host = proxyHost;
        botOptions.port = proxyPort;
      }

      console.log('Bot Options:', botOptions); // Log bot options

      const bot = mineflayer.createBot(botOptions);

      bot.once('login', () => {
        const message = `Bot ${BOT_USERNAME} spawned and logged in.`;
        console.log(message);
        broadcast(message);
        proxyErrorReported = false; // Reset the proxy error flag upon successful login
      });

      bot.on('error', (err) => {
        if (!proxyErrorReported) {
          const errorMessage = `[ProxyError] [] [${proxyHost}:${proxyPort}] Error: ${err.message}`;
          console.log(errorMessage);
          broadcast(errorMessage);

          if (err.message.includes('ETIMEDOUT')) {
            // Stop further attempts with this proxy
            currentProxy = null;
            broadcast(`Błąd - Timeout Proxy (${proxyHost}:${proxyPort})`); // Report proxy timeout error
          }

          proxyErrorReported = true; // Set the flag to true after reporting the error
        }
      });

      bot.on('end', () => {
        const message = `Bot ${BOT_USERNAME} has ended.`;
        console.log(message);
        broadcast(message);
        bots = bots.filter(b => b !== bot); // Remove bot from the array when it ends
      });

      bots.push(bot);
    }, i * delay); // Delay each bot spawn
  }
}

// Endpoint to start the bot(s) with optional proxy IP
app.post('/start-bot', (req, res) => {
  const { host, port, botCount, proxy } = req.body;
  const delay = 1000; // 1 second delay between bot spawns

  if (bots.length > 0) {
    res.send('Bots are already running.');
    return;
  }

  let proxyHost = null;
  let proxyPort = null;

  if (proxy) {
    const [ip, port] = proxy.split(':');
    if (ip && port) {
      proxyHost = ip.trim();
      proxyPort = parseInt(port.trim());
    }
  }

  startBot(host, port, proxyHost, proxyPort, botCount, delay);
  res.send(`${botCount} bot(s) starting.`);
});

// Endpoint to stop the bot(s)
app.post('/stop-bot', (req, res) => {
  if (bots.length === 0) {
    res.send('No bots are running.');
    return;
  }

  bots.forEach(bot => {
    bot.quit('Bot stopped by user');
    proxyErrorReported = false; // Reset proxy error flag when stopping bots
  });
  bots = [];
  currentProxy = null; // Reset current proxy
  res.send('All bots stopped successfully');
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});

wss.on('connection', (ws) => {
  ws.send('WebSocket connection established.');
});
