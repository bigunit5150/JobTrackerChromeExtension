const KEYS = ['notionToken', 'notionDatabaseId', 'claudeApiKey'];

// Populate fields from storage on load
chrome.storage.sync.get(KEYS, (stored) => {
  KEYS.forEach(key => {
    const el = document.getElementById(key);
    if (el && stored[key]) el.value = stored[key];
  });
});

// Save on button click
document.getElementById('saveBtn').addEventListener('click', () => {
  const values = {};
  KEYS.forEach(key => {
    const el = document.getElementById(key);
    if (el) values[key] = el.value.trim();
  });

  chrome.storage.sync.set(values, () => {
    const status = document.getElementById('status');
    status.classList.add('visible');
    setTimeout(() => status.classList.remove('visible'), 2500);
  });
});
