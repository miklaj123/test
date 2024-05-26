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
    });
  }
});

document.getElementById('stopBot').addEventListener('click', () => {
  fetch('/stop-bot', {
    method: 'POST',
  }).then(response => response.text()).then(data => {
    console.log(data);
  });
});
