document.getElementById('startBot').addEventListener('click', () => {
    const host = document.getElementById('host').value;
    const port = document.getElementById('port').value;
    const proxyFile = document.getElementById('proxyFile').files[0];
    const botCount = document.getElementById('botCount').value;

    // Read the proxy file if provided
    if (proxyFile) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const proxyList = e.target.result.split('\n').map(line => line.trim()).filter(line => line.length > 0);
            fetch('/start-bot', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    host,
                    port,
                    proxyList,
                    botCount: parseInt(botCount),
                }),
            }).then(response => response.text()).then(data => {
                console.log(data);
                logMessage(data);
            });
        };
        reader.readAsText(proxyFile);
    } else {
        fetch('/start-bot', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                host,
                port,
                botCount: parseInt(botCount),
            }),
        }).then(response => response.text()).then(data => {
            console.log(data);
            logMessage(data);
        });
    }
});

document.getElementById('stopBot').addEventListener('click', () => {
    fetch('/stop-bot', {
        method: 'POST',
    }).then(response => response.text()).then(data => {
        console.log(data);
        logMessage(data);
    });
});

// Function to log messages to the textarea
function logMessage(message) {
    const log = document.getElementById('log');
    log.value += message + '\n';
    log.scrollTop = log.scrollHeight;
}

// Function to log proxy information to the proxy log field
function logProxyMessage(message) {
    const proxyLog = document.getElementById('proxyLog');
    proxyLog.textContent = message;
}

// Setup WebSocket to receive real-time messages
const ws = new WebSocket(`ws://${window.location.hostname}:3001`);
ws.onmessage = (event) => {
    const message = event.data;

    // Check if message contains proxy information
    if (message.includes(': Proxy - ')) {
        // Split message into username and proxy
        const [username, proxy] = message.split(': Proxy - ');
        // Call function to log proxy message
        logProxyMessage(`${username}: Proxy - ${proxy}`);
    } else {
        // If no proxy information, simply log the message
        logMessage(message);
    }
};
