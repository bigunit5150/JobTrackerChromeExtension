# Claude Code Prompt — Job Tracker Chrome Extension
### Reflects all architecture decisions including icon variants and duplicate check

Paste this as your first message to Claude Code after opening the project in your Dev Container.

---

## Prompt

I'm building a Chrome extension (Manifest V3) called **Job Tracker for Notion**. It captures job postings from any job board with one click and saves them as pages in a user's own Notion database. The full project spec is in `job-tracker-extension-spec.md` — read it completely before writing any code.

Key architecture decisions already made:
- No hosted backend — BYOK (users supply their own Notion token, database ID, optional Claude key)
- One-click silent capture — popup closes immediately after click
- Full icon swap per state — 5 variants × 3 sizes, no badge text overlay
- Duplicate check runs when popup opens — queries Notion for existing URL before user clicks
- Claude API key optional — fallback fires if present, skips silently if absent

The 15 icon PNG files are already generated and sitting in the `icons/` directory. Do not recreate them.

Build the project in the following order. Complete each step fully before moving to the next.

---

### Step 1: Project Scaffold

Create the complete file and folder structure from the spec. For `package.json`, include eslint and prettier as dev dependencies. Do NOT touch anything in the `icons/` directory — those files already exist.

---

### Step 2: manifest.json

Manifest V3 with:
- `activeTab`, `scripting`, `storage`, `notifications` permissions
- Host permissions for `https://api.notion.com/*` and `https://api.anthropic.com/*`
- Background service worker pointing to `background.js`
- Popup pointing to `popup.html`
- Options page pointing to `options.html`
- Content script NOT pre-declared — injected on demand
- Default icon pointing to `icons/icon_idle_128.png`
- Icons object referencing `icon_idle_16.png`, `icon_idle_48.png`, `icon_idle_128.png`
- Name: "Job Tracker for Notion"
- Version: "0.1.0"
- Description: "Capture job postings to your Notion database in one click. Requires your own Notion integration token."

---

### Step 3: content.js

Injected into the active tab on demand. Structured as an IIFE that returns a value.

Returns:
```javascript
{
  url: window.location.href,
  title: document.title,
  rawText: // visible body text, scripts/styles/nav/header/footer stripped, max 8000 chars
}
```

Never throws — if any DOM access fails, return best partial data available.

---

### Step 4: ATS Parsers

Build all parsers in `parsers/`. Each:
- Takes `{ url, rawText, title }` as input
- Returns the normalized job object from the spec
- Uses DOM selectors as primary, rawText regex as fallback
- Never throws — always returns best partial result

`parsers/index.js` exports a single `parse(data)` function using `detectATS` logic from the spec.

A result is **complete** if `title`, `company`, and `description` are all non-empty after `.trim()`.

---

### Step 5: notion.js

Exports two async functions:

**`saveToNotion(job, url)`**
1. Read `notionToken` and `notionDatabaseId` from `chrome.storage.sync`
2. If either missing, throw `Error('Notion credentials not configured')`
3. Build and POST the request body from the spec
4. Handle null/empty on every field
5. Throw with status + body text on non-200
6. Return created page ID on success

**`checkDuplicate(url, token, databaseId)`**
1. POST to `https://api.notion.com/v1/databases/{databaseId}/query`
2. Filter: `{ property: 'Job URL', url: { equals: url } }`, page_size: 1
3. Return `true` if `results.length > 0`, `false` otherwise
4. Never throws — catch all errors and return `false`

---

### Step 6: claude.js

Exports a single async function `enrichWithClaude(partialJob, rawText, apiKey)`.

1. Call Anthropic API with model `claude-haiku-4-5-20251001`, max_tokens 1000
2. Use extraction prompt from spec
3. Parse JSON response
4. Merge: Claude fills empty fields, partialJob wins on populated fields
5. Never throws — any error returns `partialJob` unchanged

---

### Step 7: background.js

Exports a `setIcon(state)` helper:
```javascript
function setIcon(state) {
  chrome.action.setIcon({
    path: {
      16:  `icons/icon_${state}_16.png`,
      48:  `icons/icon_${state}_48.png`,
      128: `icons/icon_${state}_128.png`
    }
  });
}
```

Listens for `{ action: 'capture' }` message and orchestrates the full capture flow:

1. Get active tab URL
2. Check not `chrome://`, `about:`, `chrome-extension://` — if so, show notification "Can't capture browser pages" and return
3. `setIcon('capturing')`
4. Execute content.js via `chrome.scripting.executeScript`
5. Run parsers
6. If incomplete + Claude key present: enrich with Claude
7. `saveToNotion(job, url)`
8. Success:
   - `setIcon('success')`
   - Chrome notification: "Saved: [job.title] at [job.company]"
   - After 3000ms: `setIcon('idle')`
9. Error:
   - `setIcon('error')`
   - Log full error to console
   - If error message includes 'not configured': notification "Configure the extension first — click the icon and go to Options"
   - After 5000ms: `setIcon('idle')`

Everything in a try/catch.

---

### Step 8: popup.html + popup.js

**popup.html:**
- Width 240px, clean layout
- Dark header bar (#1e293b) with extension name in white
- White body with centered "Capture Job" button (navy #1e3a6e background, white text)
- Status area below button — small text for duplicate state message
- Small "Settings" link at bottom
- No external dependencies

**popup.js — on DOM load:**

1. Get current tab URL via `chrome.tabs.query`
2. Read `notionToken` and `notionDatabaseId` from `chrome.storage.sync`
3. If credentials present: call `notion.js.checkDuplicate(url, token, databaseId)`
   - If duplicate found:
     - Send message `{ action: 'setIcon', state: 'duplicate' }` to background
     - Update button label to "Already Saved — Capture Again?"
     - Show status text: "This job is already in your Notion database"
   - If not found: button label stays "Capture Job"
   - If check fails: fail silently, button label stays "Capture Job"
4. If credentials missing: show status text "⚠ Configure your Notion token in Settings"

**On button click:**
- Send `{ action: 'capture' }` to background.js
- `window.close()`

**On Settings click:**
- `chrome.runtime.openOptionsPage()`

Note: `popup.js` needs direct access to `notion.js` for the duplicate check. Import it as a module or inline the `checkDuplicate` function — whichever approach works cleanly with MV3.

---

### Step 9: options.html + options.js

**options.html:**
- Dark header bar (#1e293b) with "Job Tracker for Notion — Settings" title in white
- White form body, clean spacing
- Three fields per spec with correct input types and labels
- Claude API key field explicitly labeled "Optional — enables smarter extraction on unknown job boards"
- Save button — shows "Settings saved ✓" for 2 seconds on success
- Footer: small muted text — `☕ If this saves you time during your search, a coffee is appreciated — ` followed by link text "Buy Me a Coffee" pointing to `https://buymeacoffee.com` (placeholder)

**options.js:**
- On load: populate all three inputs from `chrome.storage.sync`
- On save: trim all values, write to `chrome.storage.sync`, show confirmation

---

### Step 10: README.md

Full README per the spec requirements. Structure:

```markdown
# Job Tracker for Notion

One-click Chrome extension that saves job postings to your Notion database.

## Quick Start
1. [Duplicate the Notion template](#) ← placeholder
2. Create your Notion integration token
3. [Install from Chrome Web Store](#) ← placeholder
4. Configure the extension

## Notion Setup
...zero-ambiguity steps...

## Configuration
...options page walkthrough...

## Supported Job Boards
Greenhouse, Lever, Workday, LinkedIn Jobs, and any other board via generic fallback.

## Duplicate Detection
When you open the extension on a job posting you've already saved, the icon shows
a yellow ring to let you know. You can still capture it again if you want.

## Claude API (Optional)
...one honest paragraph...

## Troubleshooting
...common mistakes...

---
This tool is free and always will be. If it saves you time during your job search,
a coffee is appreciated but never expected. ☕ [Buy Me a Coffee](https://buymeacoffee.com)
```

---

### Step 11: background.js — setIcon message handler

Add a listener for `{ action: 'setIcon', state: '...' }` messages from popup.js so popup can trigger the duplicate icon state:

```javascript
chrome.runtime.onMessage.addListener((message) => {
  if (message.action === 'setIcon') {
    setIcon(message.state);
  }
  if (message.action === 'capture') {
    handleCapture();
  }
});
```

---

### Step 12: Error Handling Audit

Review every file and verify:
- All `chrome.storage.sync.get` calls handle missing keys gracefully
- All async functions in background.js wrapped in try/catch
- content.js IIFE never throws
- notion.js handles null/undefined on every field before building request
- claude.js never throws under any circumstance
- checkDuplicate never throws under any circumstance
- popup.js duplicate check failure is silent — user never sees an error from it

---

### After Building

Give me:
1. Any deviations from the spec and why
2. Exact steps to load and test in Chrome
3. First test URL: `https://www.everlaw.com/careers/4615567006/`
4. Any Notion API gotchas encountered in the request body or query implementation
5. How you handled the MV3 module import between popup.js and notion.js
