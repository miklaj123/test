document.getElementById('startBot').addEventListener('click', () => {
  const host = document.getElementById('host').value;
  const port = document.getElementById('port').value;
  const proxyFile = document.getElementById('proxyFile').files[0];
  const botCount = document.getElementById('botCount').value;

  let proxyList = null;

  // Sprawdź, czy plik proxy został dostarczony
  if (proxyFile) {
    const reader = new FileReader();

    reader.onload = () => {
      proxyList = reader.result.split('\n').map(line => line.trim());
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
    .catch(error => console.error('Błąd podczas zatrzymywania botów:', error));
});

const ws = new WebSocket(`ws://localhost:${wsPort}`);

ws.onopen = () => {
  console.log('Nawiązano połączenie przez WebSocket.');
};

ws.onmessage = (event) => {
  const message = event.data;
  console.log('Otrzymano wiadomość od serwera:', message);
  document.getElementById('log').value += message + '\n';
};
