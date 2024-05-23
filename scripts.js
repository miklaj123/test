document.addEventListener("DOMContentLoaded", function () {
    const log = document.getElementById('log');
    const startBotButton = document.getElementById('startBot');
    const stopBotButton = document.getElementById('stopBot');
    const proxyTypeSelect = document.getElementById('proxyType');
    const manualProxy = document.getElementById('manualProxy');
    const fileProxy = document.getElementById('fileProxy');
    const proxyInput = document.getElementById('proxy');
    const proxyFileInput = document.getElementById('proxyFile');

    proxyTypeSelect.addEventListener('change', () => {
        if (proxyTypeSelect.value === 'manual') {
            manualProxy.style.display = 'block';
            fileProxy.style.display = 'none';
        } else if (proxyTypeSelect.value === 'file') {
            manualProxy.style.display = 'none';
            fileProxy.style.display = 'block';
        }
    });

    startBotButton.addEventListener('click', () => {
        const host = document.getElementById('host').value;
        const port = document.getElementById('port').value || null;
        const botCount = document.getElementById('botCount').value;
        const proxyType = proxyTypeSelect.value;

        let proxy = null;
        let proxyList = null;
        if (proxyType === 'manual') {
            proxy = proxyInput.value || null;
        } else if (proxyType === 'file') {
            const proxyFile = proxyFileInput.files[0];
            if (proxyFile) {
                const reader = new FileReader();
                reader.onload = function (event) {
                    proxyList = event.target.result.split(/\r?\n/);
                    startBots(host, port, null, botCount, proxyList);
                };
                reader.readAsText(proxyFile);
                return; // Return to prevent further execution until file is read
            }
        }

        startBots(host, port, proxy, botCount, null); // Pass null as proxy if proxyType is 'file'
    });

    stopBotButton.addEventListener('click', () => {
        fetch('/stop-bot', { method: 'POST' })
            .then(response => response.text())
            .then(data => log.value += data + '\n')
            .catch(error => log.value += 'Error: ' + error + '\n');
    });

    const ws = new WebSocket('ws://localhost:3001');
    ws.onmessage = (event) => {
        log.value += event.data + '\n';
    };

            // Function to start a single bot with a delay and an optional proxy IP
            function startBot(host, port, proxy) {
                const BOT_USERNAME = generateUsername();
    
                let botOptions = {
                    host: host,
                    port: port ? parseInt(port) : 25565, // Default port is 25565
                    username: BOT_USERNAME,
                    hideErrors: false
                };
    
                // Add proxy if provided
                if (proxy) {
                    botOptions = {
                        ...botOptions,
                        socksPort: proxy.split(':')[1], // assuming proxy format is IP:Port
                        proxy: proxy.split(':')[0] // assuming proxy format is IP:Port
                    };
                }
    
                console.log('Bot Options:', botOptions); // Log bot options
    
                const bot = mineflayer.createBot(botOptions);
    
                bot.once('login', () => {
                    const message = `Bot ${BOT_USERNAME} spawned and logged in.`;
                    console.log(message);
                    broadcast(message);
                });
    
                bot.on('error', (err) => {
                    const errorMessage = `[ProxyError] [] [${proxy}] Error: ${err.message}`;
                    console.log(errorMessage);
                    broadcast(errorMessage);
    
                    if (err.message.includes('ETIMEDOUT')) {
                        // Stop further attempts with this proxy
                        currentProxy = null;
                    }
                });
    
                bot.on('end', () => {
                    const message = `Bot ${BOT_USERNAME} has ended.`;
                    console.log(message);
                    broadcast(message);
                    bots = bots.filter(b => b !== bot); // Remove bot from the array when it ends
                });
    
                bots.push(bot);
            }
    
            // Start the specified number of bots
            for (let i = 0; i < botCount; i++) {
                startBot(host, port, proxy);
            }
        }
    
        function generateUsername() {
            // Function to generate a random username for the bot
            return 'Bot_' + Math.random().toString(36).substr(2, 5);
        }
    });
