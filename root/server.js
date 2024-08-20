// server.js

const express = require('express');
const mineflayer = require('mineflayer');
const path = require('path');
const bodyParser = require('body-parser');
const http = require('http');
const WebSocket = require('ws');
const { SocksProxyAgent } = require('socks-proxy-agent'); // Import SocksProxyAgent correctly
const net = require('net');

const app = express();
const port = process.env.PORT || 3000;
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

let bots = [];

app.use(bodyParser.json({ limit: '500mb' }));
app.use(express.static(path.join(__dirname)));

function broadcastToClients(message) {
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

// Function to ping proxy
function pingProxy(proxy, callback) {
  const [host, port] = proxy.split(':');
  const socket = new net.Socket();

  socket.setTimeout(3000); // 3-second timeout

  socket.on('connect', () => {
    socket.destroy();
    callback(true);
  }).on('error', () => {
    socket.destroy();
    callback(false);
  }).on('timeout', () => {
    socket.destroy();
    callback(false);
  }).connect(parseInt(port), host);
}

function startBot(host, port, proxyList, botCount, delay) {
  for (let i = 0; i < botCount; i++) {
    setTimeout(() => {
      const random_number = Math.floor(Math.random() * 1000);
      const BOT_USERNAME = `${random_number}_${i}`;

      let botOptions = {
        host: host,
        port: port ? parseInt(port) : 25565,
        username: BOT_USERNAME,
        hideErrors: false,
        version: '1.20.1' // Set Minecraft version
      };

      if (proxyList && proxyList.length > 0) {
        const proxy = proxyList[i % proxyList.length];
        pingProxy(proxy, (isAlive) => {
          if (isAlive) {
            const proxyUrl = `socks5://${proxy}`;
            try {
              const agent = new SocksProxyAgent(proxyUrl); // Correct usage of SocksProxyAgent
              botOptions.agent = agent;
              botOptions.proxyAddress = proxy; // Save proxy address
              console.log(`→ Bot ${BOT_USERNAME} will try to connect through proxy ${proxy}`);
              connectBot(botOptions, BOT_USERNAME);
            } catch (error) {
              console.error(`Error creating SocksProxyAgent: ${error.message}`);
              broadcastToClients(`✉︎ Error creating SocksProxyAgent: ${error.message}`);
            }
          } else {
            const message = `✉︎ Proxy ${proxy} is not responding. Skipping bot ${BOT_USERNAME}.`;
            console.log(message);
            broadcastToClients(message);
          }
        });
      } else {
        console.log(`→ Bot ${BOT_USERNAME} will try to connect without proxy`);
        connectBot(botOptions, BOT_USERNAME);
      }
    }, i * delay);
  }
}

function connectBot(botOptions, BOT_USERNAME) {
  try {
    const bot = mineflayer.createBot(botOptions);

    bot.once('login', () => {
      const message = `→ Bot ${BOT_USERNAME} Connected through proxy ${botOptions.proxyAddress || 'No proxy'}`;
      console.log(message);
      broadcastToClients(message);
    });

    bot.once('error', (err) => {
      const message = `✉︎ Error: Bot ${BOT_USERNAME} - ${err.message}`;
      console.log(message);
      broadcastToClients(message);
    });

    bot.on('error', (err) => {
      const message = `✉︎ Error: ${err.message}`;
      console.log(message);
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
  } catch (error) {
    console.error(`Error creating bot: ${error.message}`);
    broadcastToClients(`✉︎ Error creating bot: ${error.message}`);
  }
}

// Endpoint to start bots
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

// Endpoint to stop bots
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

// HTTP server listening on the appropriate port
server.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});

// WebSocket server listening on the appropriate port
wss.on('connection', (ws) => {
  ws.send('✉︎ You are connected to bot sender');
});
