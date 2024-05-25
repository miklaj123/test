const express = require('express');
const mineflayer = require('mineflayer');
const path = require('path');
const bodyParser = require('body-parser');
const WebSocket = require('ws');
const { SocksProxyAgent } = require('socks-proxy-agent');

const app = express();
const port = 3000;
const wsPort = 3001;
const wss = new WebSocket.Server({ port: wsPort });

let bots = [];
let currentProxyIndex = -1;
let currentProxy = null;

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

// Function to start multiple bots with a delay and an optional proxy IP
function startBot(host, port, proxyList, botCount, delay) {
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

      // Add proxy if proxyList is provided
      if (proxyList && proxyList.length > 0) {
        const proxy = proxyList[i % proxyList.length];
        const [proxyIP, proxyPort] = proxy.split(':');
        const proxyUrl = `socks5://${proxy}`;
        const agent = new SocksProxyAgent(proxyUrl, {
          timeout: 1000 // Global timeout set to 1000ms
        });
        botOptions.agent = agent;

        // Override host and port with proxy settings
        botOptions.host = proxyIP;
        botOptions.port = parseInt(proxyPort);
      }

      console.log('Bot Options:', botOptions); // Log bot options

      const bot = mineflayer.createBot(botOptions);

      bot.once('login', () => {
        const message = `Bot ${BOT_USERNAME} spawned and logged in.`;
        console.log(message);
        broadcast(message);
      });

      bot.on('error', (err) => {
        if (err.message.includes('ETIMEDOUT')) {
          // Stop this bot attempt
          bot.end('Bot stopped due to timeout');
          // Try next proxy if available
          if (proxyList && proxyList.length > 0) {
            const nextProxy = proxyList[(i + 1) % proxyList.length];
            startBot(host, port, proxyList, 1, 0); // Start a new bot with the next proxy
          } else if (botOptions.agent) {
            const proxy = botOptions.agent.proxy.href;
            broadcast(`TimeOut - ${proxy}`); // Send TimeOut message with proxy to WebSocket clients
          }
        } else {
          // For other errors, send the error message to WebSocket clients
          broadcast(`Error: ${err.message}`);
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
  const { host, port, proxyList, botCount } = req.body;
  const delay = 1000; // 1 second delay between bot spawns

  if (bots.length > 0) {
    res.send('Bots are already running.');
    return;
  }

  // If proxy is provided, use it directly
  if (proxyList && proxyList.length > 0) {
    startBot(host, port, proxyList, botCount, delay);
    res.send(`Trying to connect bots with proxy list.`);
    return;
  }

  res.send('No proxies provided. Cannot start bots.');
});

// Endpoint to stop the bot(s)
app.post('/stop-bot', (req, res) => {
  if (bots.length === 0) {
    res.send('No bots are running.');
    return;
  }

  bots.forEach(bot => {
    if (bot && typeof bot.end === 'function') {
      bot.end('Bot stopped by user');
    }
  });

  bots = [];
  currentProxyIndex = -1;
  currentProxy = null; // Reset current proxy
  res.send('All bots stopped successfully');
  broadcast('All bots stopped successfully'); // Broadcast to WebSocket clients
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});

wss.on('connection', (ws) => {
  ws.send('WebSocket connection established.');
});
