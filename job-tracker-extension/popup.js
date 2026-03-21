import { checkDuplicateByUrl } from './notion.js';

const captureBtn = document.getElementById('captureBtn');
const statusText = document.getElementById('statusText');
const settingsLink = document.getElementById('settingsLink');

// --- On popup open: check for duplicates ---

async function init() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const url = tab?.url || '';

  const { notionToken, notionDatabaseId } = await chrome.storage.sync.get([
    'notionToken',
    'notionDatabaseId'
  ]);

  if (!notionToken || !notionDatabaseId) {
    statusText.textContent = 'Configure your Notion token in Settings';
    statusText.className = 'warning';
    return;
  }

  const isDuplicate = await checkDuplicateByUrl(url, notionToken, notionDatabaseId);
  if (isDuplicate) {
    captureBtn.textContent = 'Already Saved \u2014 Capture Again?';
    statusText.textContent = 'This job is already in your Notion database';
    statusText.className = 'duplicate';
    chrome.runtime.sendMessage({ action: 'setIcon', state: 'duplicate' });
  }
}

init();

// --- Capture button ---

captureBtn.addEventListener('click', () => {
  chrome.runtime.sendMessage({ action: 'capture' });
  window.close();
});

// --- Settings link ---

settingsLink.addEventListener('click', (e) => {
  e.preventDefault();
  chrome.runtime.openOptionsPage();
});
