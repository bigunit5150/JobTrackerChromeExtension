import { parse, isComplete } from './parsers/index.js';
import claudeFallback from './claude.js';
import saveToNotion from './notion.js';

console.log('[JobTracker] background.js loaded');

// --- Icon helpers ---

function setIcon(state) {
  chrome.action.setIcon({
    path: {
      16:  `icons/icon_${state}_16.png`,
      48:  `icons/icon_${state}_48.png`,
      128: `icons/icon_${state}_128.png`
    }
  });
}

function resetIcon() {
  setIcon('idle');
}

// --- Notification helper ---

function notify(title, message) {
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icons/icon_idle_128.png',
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

  setIcon('capturing');

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
    setIcon('success');
    notify('Job Tracker', `Saved: ${finalJob.title || 'Job'} at ${finalJob.company || 'Unknown'}`);
    setTimeout(resetIcon, 3000);

  } catch (err) {
    console.error('[JobTracker] Error:', err);
    if (err.message?.startsWith('Duplicate:')) {
      setIcon('duplicate');
    } else {
      setIcon('error');
    }
    notify('Job Tracker', `Error: ${err.message}`);
    setTimeout(resetIcon, 5000);
  }
}

// --- Message listener ---

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'setIcon') {
    setIcon(message.state);
  }
  if (message.action === 'capture') {
    chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
      if (tab) {
        captureJob(tab);
      }
    });
    return true;
  }
});
