// server.js

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

// Middleware to parse JSON bodies
app.use(bodyParser.json({ limit: '500mb' }));

// Serve the index.html file and other static files (like styles.css)
app.use(express.static(path.join(__dirname)));

// Function to broadcast a message to all WebSocket clients
function broadcastToClients(message) {
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
      const BOT_USERNAME = `${random_number}_${i}`;

      let botOptions = {
        host: host,
        port: port ? parseInt(port) : 25565, // Default port is 25565
        username: BOT_USERNAME,
        hideErrors: false
      };

      let proxy = null;

      // Add proxy if proxyList is provided
      if (proxyList && proxyList.length > 0) {
        proxy = proxyList[i % proxyList.length];
        const proxyUrl = `socks5://${proxy}`;
        const agent = new SocksProxyAgent(proxyUrl, {
          timeout: 1000 // Global timeout set to 1000ms
        });
        botOptions.agent = agent;
      }

      console.log('Bot Options:', botOptions); // Log bot options

      const bot = mineflayer.createBot(botOptions);

      bot.once('login', () => {
        const message = ``;
    broadcastToClients(message);
      });
	  bot.once('login', () => {
		const message = `→ Connect ${BOT_USERNAME} Proxy - ${proxy}`;
			broadcastToClients(message);
	  });
	  bot.once('error', () => {
        const message = ``;
    broadcastToClients(message);
      });
      bot.on('error', (err) => {
        broadcastToClients(`✉︎ Error: ${err.message}`);
      });
	  bot.once('end', () => {
        const message = ``;
    broadcastToClients(message);
	  });

      bot.on('end', () => {
        const message = `← Disconnect ${BOT_USERNAME} Proxy - ${proxy}`;
        console.log(message);
        broadcastToClients(message);
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
	  res.send('');
    res.send('✉︎ Bots Is Runing');
    return;
  }

  // If proxy is provided, use it directly
  if (proxyList && proxyList.length > 0) {
    startBot(host, port, proxyList, botCount, delay);
	broadcastToClients(``);
    broadcastToClients(`✉︎ Bots Trying To Connect.`);
    return;
  }
  res.send(``);
  res.send('✉︎ Add Proxy To Start.');
});

// Endpoint to stop the bot(s)
app.post('/stop-bot', (req, res) => {
  if (bots.length === 0) {
	res.send(``);
    res.send('✉︎ No Bot Is Runing.');
    return;
  }

  bots.forEach(bot => {
    if (bot && typeof bot.end === 'function') {
	  bot.end(``);
      bot.end('✉︎ Bots Stoped');
    }
  });

  bots = [];
  broadcastToClients('');
  broadcastToClients('✉︎ All Bots Has Stoped'); // Broadcast to WebSocket clients
});

app.listen(port, () => {
  console.log(`✉︎ Server is running on http://localhost:${port}`);
});

wss.on('connection', (ws) => {
  ws.send('✉︎ You Connect To Bot Sender');
});
