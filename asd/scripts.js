const log = document.getElementById('log');

document.getElementById('startBot').addEventListener('click', () => {
  const host = document.getElementById('host').value;
  const port = document.getElementById('port').value || null;
  const proxy = document.getElementById('proxy').value || null;
  const botCount = document.getElementById('botCount').value;

  let proxyList = [];
  const proxyFile = document.getElementById('proxyFile').files[0];

  if (proxyFile) {
    const reader = new FileReader();
    reader.onload = function(event) {
      proxyList = event.target.result.split(/\r?\n/);
      startBots(host, port, proxy, botCount, proxyList);
    };
    reader.readAsText(proxyFile);
  } else {
    startBots(host, port, proxy, botCount, proxyList);
  }
});

document.getElementById('stopBot').addEventListener('click', () => {
  fetch('/stop-bot', { method: 'POST' })
    .then(response => response.text())
    .then(data => log.value += data + '\n')
    .catch(error => log.value += 'Error: ' + error + '\n');
});

const ws = new WebSocket('ws://localhost:3001');
ws.onmessage = (event) => {
  log.value += event.data + '\n';
};

function startBots(host, port, proxy, botCount, proxyList) {
  fetch('/start-bot', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ host, port, proxy, botCount, proxyList })
  })
  .then(response => response.text())
  .then(data => log.value += data + '\n')
  .catch(error => log.value += 'Error: ' + error + '\n');
}
