document.getElementById('startBot').addEventListener('click', () => {
  const host = document.getElementById('host').value;
  const port = document.getElementById('port').value;
  const proxyFile = document.getElementById('proxyFile').files[0];
  const botCount = document.getElementById('botCount').value;

  // Read the proxy file if provided
  if (proxyFile) {
    const reader = new FileReader();

    reader.onload = () => {
      const proxyList = reader.result.split('\n').map(line => line.trim());
      startBot(host, port, proxyList, botCount);
    };

    reader.readAsText(proxyFile);
  } else {
    startBot(host, port, null, botCount);
  }
});

document.getElementById('stopBot').addEventListener('click', () => {
  fetch('/stop-bot', { method: 'POST' })
    .then(response => response.text())
    .then(message => {
      console.log(message);
      document.getElementById('log').value += message + '\n';
    })
    .catch(error => console.error('Error stopping bots:', error));
});

const ws = new WebSocket(`ws://localhost:${wsPort}`);

ws.onopen = () => {
  console.log('WebSocket connection established.');
};

ws.onmessage = (event) => {
  const message = event.data;
  console.log('Received message from server:', message);
  document.getElementById('log').value += message + '\n';
};
