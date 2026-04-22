const KEYS = ['notionToken', 'notionDatabaseId', 'claudeApiKey'];

// Populate fields from storage on load
chrome.storage.sync.get(KEYS, (stored) => {
  KEYS.forEach((key) => {
    const el = document.getElementById(key);
    if (el && stored[key]) el.value = stored[key];
  });
});

// Save on button click
document.getElementById('saveBtn').addEventListener('click', () => {
  const values = {};
  KEYS.forEach((key) => {
    const el = document.getElementById(key);
    if (el) values[key] = el.value.trim();
  });

  chrome.storage.sync.set(values, () => {
    const status = document.getElementById('status');
    status.classList.add('visible');
    setTimeout(() => status.classList.remove('visible'), 2000);
  });
});

// Test Notion connection
document.getElementById('testBtn').addEventListener('click', async () => {
  const btn = document.getElementById('testBtn');
  const testStatus = document.getElementById('testStatus');

  const token = document.getElementById('notionToken').value.trim();
  const dbId = document.getElementById('notionDatabaseId').value.trim();

  testStatus.className = '';
  testStatus.textContent = '';

  if (!token) {
    testStatus.className = 'err';
    testStatus.textContent = 'Enter a Notion token first.';
    return;
  }
  if (!dbId) {
    testStatus.className = 'err';
    testStatus.textContent =
      'Database ID required. Get yours by duplicating the CareerPilot template: kssoftware.net/job-search-ai';
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Testing...';

  try {
    const res = await fetch(`https://api.notion.com/v1/databases/${dbId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Notion-Version': '2022-06-28',
      },
    });

    const data = await res.json();

    if (res.ok) {
      const dbName = data.title?.[0]?.plain_text || 'Untitled';
      testStatus.className = 'ok';
      testStatus.textContent = `Connected — "${dbName}"`;
    } else if (res.status === 401) {
      testStatus.className = 'err';
      testStatus.textContent = 'Invalid token.';
    } else if (res.status === 404) {
      testStatus.className = 'err';
      testStatus.textContent =
        'Database not found — check the ID and make sure the integration is connected to it.';
    } else {
      testStatus.className = 'err';
      testStatus.textContent = `Error ${res.status}: ${data.message || 'Unknown error'}`;
    }
  } catch (err) {
    testStatus.className = 'err';
    testStatus.textContent = `Request failed: ${err.message}`;
  } finally {
    btn.disabled = false;
    btn.textContent = 'Test Notion Connection';
  }
});
