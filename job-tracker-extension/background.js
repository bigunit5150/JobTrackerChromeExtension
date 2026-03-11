import { parse, isComplete } from './parsers/index.js';
import claudeFallback from './claude.js';
import saveToNotion from './notion.js';

// --- Badge helpers ---

function setBadge(text, color) {
  chrome.action.setBadgeText({ text });
  if (color) chrome.action.setBadgeBackgroundColor({ color });
}

function clearBadge() {
  chrome.action.setBadgeText({ text: '' });
}

// --- Notification helper ---

function notify(title, message) {
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icons/icon48.png',
    title,
    message
  });
}

// --- Main capture flow ---

async function captureJob(tab) {
  const url = tab.url || '';

  // Bail on browser-internal pages
  if (url.startsWith('chrome://') || url.startsWith('about:') || url.startsWith('chrome-extension://')) {
    notify('Job Tracker', "Can't capture this page");
    return;
  }

  setBadge('...', '#888888');

  try {
    // Inject and execute content script
    const [frameResult] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['content.js']
    });

    let contentData = frameResult?.result;

    // Fallback if content script returned nothing meaningful
    if (!contentData || !contentData.rawText) {
      contentData = {
        url,
        rawText: '',
        domData: { title: tab.title || '' }
      };
    }

    // Use URL and title if body was empty
    if (!contentData.rawText.trim()) {
      contentData.rawText = `${contentData.domData.title}\n${url}`;
    }

    contentData.url = url; // ensure URL is always the tab URL

    // Parse
    const { result: parsedJob, isComplete: complete } = parse(contentData);

    // Claude fallback if incomplete
    let finalJob = parsedJob;
    if (!complete) {
      console.log('[JobTracker] Parse incomplete, trying Claude fallback...');
      finalJob = await claudeFallback(contentData.rawText, parsedJob);
    }

    // Save to Notion
    const pageId = await saveToNotion(finalJob, url);
    console.log('[JobTracker] Saved to Notion, page ID:', pageId);

    // Success
    setBadge('✓', '#1a9e3f');
    notify('Job Tracker', `Saved: ${finalJob.title || 'Job'} at ${finalJob.company || 'Unknown'}`);
    setTimeout(clearBadge, 3000);

  } catch (err) {
    console.error('[JobTracker] Error:', err);
    setBadge('✗', '#cc0000');
    notify('Job Tracker', `Error: ${err.message}`);
    setTimeout(clearBadge, 5000);
  }
}

// --- Message listener ---

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'capture') {
    chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
      if (tab) {
        captureJob(tab);
      }
    });
    // Return true to keep the message channel open (not strictly needed here
    // since we don't sendResponse, but keeps things clean)
    return true;
  }
});
