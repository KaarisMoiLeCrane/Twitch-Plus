let data = '';

document.addEventListener('DOMContentLoaded', async function () {
  await chrome.storage.sync.get({debug: false}, (data) => {
    const debugValue = data.debug;
    document.getElementById('activateDebug').textContent = debugValue
      ? 'Disable debug'
      : 'Enable debug';
  });

  // Fetch all keys from chrome.storage.sync
  let allSyncDatas = await chrome.storage.sync.get(null);
  allSyncDatas = Object.keys(allSyncDatas);

  // Select the <select> element and populate options
  const selectElement = document.getElementById('selectData');
  addOption(selectElement, 'All Datas', null);

  allSyncDatas.forEach((key) => {
    addOption(selectElement, key, key);
  });

  // Event listener for Log Data button
  document.getElementById('logData').addEventListener('click', async function () {
    const selectedKey = selectElement.value;

    if (selectedKey === 'null') {
      const payload = await new Promise((resolve) => {
        chrome.storage.sync.get(null, (data) => resolve(data));
      });

      console.log('[Popup Script] Data in chrome.storage.sync:', payload);
      sendMessage({
        message: 'Data in chrome.storage.sync',
        payload,
        fromPopup: true,
        toContent: true
      });

      document.querySelector('#messageContainer').innerHTML = syntaxHighlight(
        JSON.stringify(payload, undefined, 2)
      );

      data = payload;
    } else {
      const payload = await new Promise((resolve) => {
        chrome.storage.sync.get(selectedKey, (data) => resolve(data));
      });

      console.log('[Popup Script] Data for key ' + selectedKey + ':', payload);
      sendMessage({
        message: 'Data for key ' + selectedKey,
        payload,
        fromPopup: true,
        toContent: true
      });

      document.querySelector('#messageContainer').innerHTML = syntaxHighlight(
        JSON.stringify(payload, undefined, 2)
      );

      data = payload;
    }
  });

  // Event listener for Clear Data button
  document.getElementById('clearData').addEventListener('click', async function () {
    const selectedKey = selectElement.value;

    if (selectedKey === 'null') {
      await new Promise((resolve) => {
        chrome.storage.sync.clear(() => resolve());
      });
      console.log('[Popup Script] Data cleared: All Keys');
      sendMessage({
        message: 'Data cleared: All Keys',
        fromPopup: true,
        toContent: true
      });

      await new Promise((resolve, reject) => {
        const data = {debug: true};
        chrome.storage.sync.set(data, function () {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            console.log('[DEBUG]', 'data reseted', {debug: true});
            resolve();
          }
        });
      });
    } else {
      await new Promise((resolve) => {
        chrome.storage.sync.remove(selectedKey, () => resolve());
      });

      console.log('[Popup Script] Data cleared: ' + selectedKey);
      sendMessage({
        message: 'Data cleared: ' + selectedKey,
        fromPopup: true,
        toContent: true
      });

      await new Promise((resolve, reject) => {
        const data = {debug: true};
        chrome.storage.sync.set(data, function () {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            console.log('[DEBUG]', 'data reseted', {debug: true});
            resolve();
          }
        });
      });
    }
  });

  // Event listener for Reload Extension button
  document.getElementById('reloadExtension').addEventListener('click', async function () {
    await chrome.runtime.reload();
  });

  // Event listener for Send General Message button
  document.getElementById('sendMessage').addEventListener('click', async function () {
    const message = 'Hello from the popup!';
    console.log('[Popup Script] ' + message);
    sendMessage({message, fromPopup: true, toEveryone: true});
  });

  // Event listener for Send to Content Script button
  document
    .getElementById('sendMessageToContentScript')
    .addEventListener('click', async function () {
      const message = document.getElementById('messageInput').value;
      sendMessage({message, fromPopup: true, toContent: true});
    });

  // Event listener for Send to Background Script button
  document
    .getElementById('sendMessageToBackgroundScript')
    .addEventListener('click', async function () {
      const message = document.getElementById('messageInput').value;
      sendMessage({message, fromPopup: true, toBackground: true});
    });

  // Event listener for Copy button
  document
    .querySelector('[class = "copy-button"]')
    .addEventListener('click', copyToClipboard);

  // Event listener for Debug button
  document.getElementById('activateDebug').addEventListener('click', async function () {
    if (this.textContent.includes('Enable')) {
      this.textContent = 'Disable debug';
      await new Promise((resolve, reject) => {
        const data = {debug: true};
        chrome.storage.sync.set(data, function () {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            console.log('[DEBUG]', 'Debug set', {debug: true});
            resolve();
          }
        });
      });
    } else if (this.textContent.includes('Disable')) {
      this.textContent = 'Enable debug';
      await new Promise((resolve, reject) => {
        const data = {debug: false};
        chrome.storage.sync.set(data, function () {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            console.log('[DEBUG]', 'Debug set', {debug: false});
            resolve();
          }
        });
      });
    }
  });

  // Function to add an option to a <select> element
  function addOption(selectElement, text, value) {
    const option = document.createElement('option');
    option.textContent = text;
    option.value = value;
    selectElement.appendChild(option);
  }

  // Function to send message
  function sendMessage(message) {
    chrome.runtime.sendMessage({
      ...message,
      fromPopup: true
    });
  }
});

// Listener for messages from other parts of the extension
chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
  console.log('[Popup Script] Message received:', message);
  // Handle the received message as needed
  // For example, update UI or perform actions based on the message
});

function syntaxHighlight(json) {
  json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return json.replace(
    /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
    function (match) {
      var cls = 'number';
      if (/^"/.test(match)) {
        if (/:$/.test(match)) {
          cls = 'key';
        } else {
          cls = 'string';
        }
      } else if (/true|false/.test(match)) {
        cls = 'boolean';
      } else if (/null/.test(match)) {
        cls = 'null';
      }
      return '<span class="' + cls + '">' + match + '</span>';
    }
  );
}

function copyToClipboard() {
  const el = document.createElement('textarea');
  el.value = JSON.stringify(data, null, 2);
  document.body.appendChild(el);
  el.select();
  document.execCommand('copy');
  document.body.removeChild(el);
}
