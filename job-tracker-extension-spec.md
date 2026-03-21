# Job Tracker Chrome Extension — Project Spec
### Version: 0.1 — Architecture Decisions Finalized

---

## Architecture Decision Log

| Topic | Decision |
|---|---|
| **Data Architecture** | BYOK — each user supplies their own Notion token and database ID. No hosted infrastructure, no backend. |
| **Distribution** | Chrome Web Store (primary) + GitHub (source of truth). Notion gallery deferred to v2. |
| **API Cost Model** | BYOK Claude key, optional. Fallback fires if key is present, silently skips if not. DOM parsers are the guaranteed path. |
| **Sustainability** | Buy Me a Coffee. Passive placement — README and options page footer only. |
| **Dashboard Sharing** | Notion template published as a public duplicate link. Template is a first-class v1 deliverable. |
| **Icon Strategy** | Full icon swap per state (Option B) — 5 variants × 3 sizes. No badge text overlay. |
| **Duplicate Check** | On popup open, query Notion for existing page with matching Job URL. Show duplicate state icon if found. |

---

## Overview

A Chrome extension (Manifest V3) that captures job postings from any job board with one click and saves them as pages in a Notion database. Uses ATS-specific DOM parsers for fast extraction on known platforms (Greenhouse, Lever, Workday, LinkedIn) with an optional Claude API fallback for everything else.

Distributed free. No hosted infrastructure. Users bring their own API keys. A companion Notion template provides a pre-built dashboard that populates automatically as jobs are captured.

---

## Target User

Technical users — engineers and developers actively job searching. Comfortable with API keys, README-driven setup, and developer tooling. Installation documentation must be zero-ambiguity, copy-paste-exact, with screenshots of every screen.

---

## User Experience

1. User duplicates the Notion template into their workspace
2. User creates a Notion internal integration and copies their token
3. User installs the extension from the Chrome Web Store
4. User opens Options, pastes Notion token and database ID
5. User optionally pastes Claude API key to enable smarter extraction
6. User navigates to any job posting
7. **Extension popup opens → immediately checks if URL is already in Notion**
   - If already saved: icon shows yellow ring (duplicate state)
   - If not saved: icon shows default state, ready to capture
8. User clicks "Capture Job"
9. Extension scrapes, parses, and silently writes to Notion
10. Icon shows success (green ring) or error (red ring)
11. Chrome notification confirms: "Saved: [Role Title] at [Company]"
12. Dashboard in Notion updates automatically

---

## Icon Variants

Brand colors: Navy (#1e3a6e), Yellow (#f5c800). White background.

Five icon states, each at three sizes (16px, 48px, 128px) = 15 PNG files total.

| State | Filename Pattern | Visual Treatment | Trigger |
|---|---|---|---|
| Idle | `icon_idle_{size}.png` | Logo as-is | Default / after badge clears |
| Capturing | `icon_capturing_{size}.png` | Logo desaturated ~60% | While scraping + writing |
| Success | `icon_success_{size}.png` | Logo + green ring (#22c55e) | Write to Notion succeeded |
| Error | `icon_error_{size}.png` | Logo + red ring (#ef4444) | Any error in the flow |
| Duplicate | `icon_duplicate_{size}.png` | Logo + yellow ring (#eab308) | URL already exists in Notion |

Icon files live in `icons/` directory. All 15 files are pre-generated from the kssoftware logo and committed to the repo.

### Setting Icons in Code

```javascript
// background.js helper
function setIcon(state) {
  chrome.action.setIcon({
    path: {
      16:  `icons/icon_${state}_16.png`,
      48:  `icons/icon_${state}_48.png`,
      128: `icons/icon_${state}_128.png`
    }
  });
}
// Usage: setIcon('idle') | setIcon('capturing') | setIcon('success') | setIcon('error') | setIcon('duplicate')
```

---

## Duplicate Check Flow

Runs in `popup.js` immediately when the popup opens, before the user clicks anything.

```
Popup opens
      │
      ▼
Get current tab URL
      │
      ▼
Read notionToken + notionDatabaseId from storage
      │
      ├── Credentials missing → skip check, show idle icon, enable button
      │
      └── Credentials present → query Notion database
                │
                ├── URL found in database → setIcon('duplicate')
                │     Update button label to "Already Saved — Capture Again?"
                │     Button remains clickable (user may want to save a second time)
                │
                └── URL not found → setIcon('idle'), button label "Capture Job"
                      (also handles network errors — fail silently, show idle)
```

### Notion Duplicate Query

```javascript
// notion.js — exported alongside saveToNotion
async function checkDuplicate(url, token, databaseId) {
  const response = await fetch('https://api.notion.com/v1/databases/' + databaseId + '/query', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + token,
      'Notion-Version': '2022-06-28',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      filter: {
        property: 'Job URL',
        url: { equals: url }
      },
      page_size: 1
    })
  });
  if (!response.ok) return false; // fail silently
  const data = await response.json();
  return data.results.length > 0;
}
```

---

## Notion Template (First-Class Deliverable)

The template is built once in the author's Notion workspace and published as a public duplicate link. Ships as part of v1.

### Template Contents

**Main Database** — job tracking database with all properties pre-configured.

**Dashboard Page** — separate page with linked views:

| View Name | Type | Filter | Purpose |
|---|---|---|---|
| All Jobs | Table | None | Full tracker |
| Bookmarked | Board | Status = Bookmarked | Review saved jobs |
| In Progress | Board | Status = Applying, Applied, Interviewing, Negotiating | Active pipeline |
| Applied This Week | Table | Date Applied = this week | Weekly activity |
| By Status | Chart | Group by Status | Pipeline overview |
| By Company | Table | Sort by Company | Company-level view |

### First-Run Flow
```
Step 1 — Duplicate the Notion template into your workspace
Step 2 — Create a Notion internal integration, copy the token
Step 3 — Share the duplicated database with your integration
Step 4 — Copy the Database ID from the database URL
Step 5 — Install the extension from the Chrome Web Store
Step 6 — Open Options, paste token and Database ID
Step 7 — Navigate to any job posting and click the icon
```

---

## Notion Database Schema

| Property Name | Notion Type | Default on Capture |
|---|---|---|
| Role Title | Title | Extracted |
| Company | Text | Extracted |
| Job URL | URL | Current tab URL |
| Location | Text | Extracted |
| Job Type | Select | Extracted (Remote / Hybrid / Onsite) |
| Salary Range | Text | Extracted if present |
| ATS Source | Text | Auto-detected |
| Status | Select | Bookmarked |
| Date Added | Date | Today (auto) |
| Date Applied | Date | Empty |
| Raw JD | Text | Full job description (truncated to 2000 chars) |
| Notes | Text | Empty |

**Status select options:** Bookmarked, Applying, Applied, Interviewing, Negotiating, Accepted, Withdrew, No Response, Not Selected

---

## File Structure

```
job-tracker-extension/
├── .devcontainer/
│   └── devcontainer.json
├── manifest.json
├── background.js                  # Service worker: orchestration
├── content.js                     # Injected DOM scraper
├── popup.html                     # One-click capture UI
├── popup.js                       # Duplicate check + capture trigger
├── options.html                   # Config: tokens + BMAC footer
├── options.js
├── parsers/
│   ├── index.js
│   ├── greenhouse.js
│   ├── lever.js
│   ├── workday.js
│   ├── linkedin.js
│   └── generic.js
├── claude.js                      # Optional Claude API fallback
├── notion.js                      # Notion REST client (save + duplicate check)
├── icons/
│   ├── icon_idle_16.png
│   ├── icon_idle_48.png
│   ├── icon_idle_128.png
│   ├── icon_capturing_16.png
│   ├── icon_capturing_48.png
│   ├── icon_capturing_128.png
│   ├── icon_success_16.png
│   ├── icon_success_48.png
│   ├── icon_success_128.png
│   ├── icon_error_16.png
│   ├── icon_error_48.png
│   ├── icon_error_128.png
│   ├── icon_duplicate_16.png
│   ├── icon_duplicate_48.png
│   └── icon_duplicate_128.png
└── README.md
```

---

## Dev Container Setup

```json
{
  "name": "Job Tracker Extension",
  "image": "mcr.microsoft.com/devcontainers/javascript-node:20",
  "features": {
    "ghcr.io/devcontainers/features/git:1": {}
  },
  "postCreateCommand": "npm install",
  "customizations": {
    "vscode": {
      "extensions": [
        "dbaeumer.vscode-eslint",
        "esbenp.prettier-vscode",
        "ms-vscode.vscode-json"
      ],
      "settings": {
        "editor.formatOnSave": true,
        "editor.defaultFormatter": "esbenp.prettier-vscode"
      }
    }
  }
}
```

---

## Full Data Flow

```
Tab navigation (passive — no action)

Popup opens
      │
      ▼
popup.js → get current tab URL
      │
      ▼
notion.js.checkDuplicate(url) → Notion query API
      │
      ├── Found     → setIcon('duplicate'), button "Already Saved — Capture Again?"
      └── Not found → setIcon('idle'), button "Capture Job"
           (network error or no credentials → idle, fail silently)

User clicks button
      │
      ▼
popup.js → chrome.runtime.sendMessage({ action: 'capture' }) → window.close()
      │
      ▼
background.js
      │
      ├── Check URL not chrome:// / about: → bail with notification if so
      │
      ▼
setIcon('capturing')
      │
      ▼
chrome.scripting.executeScript → content.js → { url, rawText, title }
      │
      ▼
parsers/index.js → detectATS → run parser → job object
      │
      ├── Complete (title + company + description non-empty) → skip Claude
      │
      └── Incomplete
                ├── claudeApiKey in storage → claude.js → merge
                └── No key → use partial as-is
      │
      ▼
notion.js.saveToNotion(job, url)
      │
      ├── Success → setIcon('success') → notification → reset to idle after 3s
      └── Error   → setIcon('error')   → log to console → reset to idle after 5s
```

---

## ATS Detection

```javascript
function detectATS(url) {
  if (url.includes('greenhouse.io') || url.includes('grnh.se')) return 'greenhouse';
  if (url.includes('lever.co')) return 'lever';
  if (url.includes('myworkdayjobs.com') || url.includes('wd1.myworkday')) return 'workday';
  if (url.includes('linkedin.com/jobs')) return 'linkedin';
  return 'generic';
}
```

---

## Parser Output Shape

```javascript
{
  title: String,        // Required for completeness check
  company: String,      // Required for completeness check
  location: String,
  jobType: String,      // 'Remote' | 'Hybrid' | 'Onsite' | null
  salaryRange: String,
  description: String,  // Required for completeness check
  atsSource: String
}
```

---

## Claude Fallback (claude.js)

**Trigger:** Result incomplete AND `claudeApiKey` in `chrome.storage.sync`
**Skip:** No key stored → write partial result, no error
**Model:** `claude-haiku-4-5-20251001`
**Merge:** Claude fills empty fields; parser wins on populated fields
**Failure:** Any error → catch silently, return partial result unchanged

**Prompt:**
```
Extract structured job information from the following job posting text.
Return ONLY valid JSON with these exact keys:
title, company, location, jobType, salaryRange, description

jobType must be one of: Remote, Hybrid, Onsite, or null if unclear.
salaryRange should be the raw text if present, or null.
description should be the full job description text.

Job posting text:
{rawText}
```

---

## Notion API Integration

### saveToNotion

```javascript
POST https://api.notion.com/v1/pages
Authorization: Bearer {NOTION_TOKEN}
Notion-Version: 2022-06-28

{
  parent: { database_id: DATABASE_ID },
  properties: {
    "Role Title":   { title: [{ text: { content: job.title } }] },
    "Company":      { rich_text: [{ text: { content: job.company || '' } }] },
    "Job URL":      { url: job.url },
    "Location":     { rich_text: [{ text: { content: job.location || '' } }] },
    "Job Type":     job.jobType ? { select: { name: job.jobType } } : { select: null },
    "Salary Range": { rich_text: [{ text: { content: job.salaryRange || '' } }] },
    "ATS Source":   { rich_text: [{ text: { content: job.atsSource } }] },
    "Status":       { select: { name: "Bookmarked" } },
    "Date Added":   { date: { start: new Date().toISOString().split('T')[0] } },
    "Date Applied": { date: null },
    "Raw JD":       { rich_text: [{ text: { content: (job.description || '').slice(0, 2000) } }] },
    "Notes":        { rich_text: [] }
  }
}
```

### checkDuplicate

```javascript
POST https://api.notion.com/v1/databases/{databaseId}/query
{
  filter: { property: 'Job URL', url: { equals: url } },
  page_size: 1
}
// Returns: true if results.length > 0, false otherwise
// Fails silently — never throws
```

---

## Options Page

| Field | Key | Type | Notes |
|---|---|---|---|
| Notion Integration Token | `notionToken` | Password | Required |
| Notion Database ID | `notionDatabaseId` | Text | Required |
| Anthropic API Key | `claudeApiKey` | Password | Optional |

Footer: `☕ If this saves you time during your search, a coffee is appreciated — [Buy Me a Coffee]`
Link placeholder: `https://buymeacoffee.com` — replace with real URL before publishing.

---

## Icon State Reference

| State | File | Trigger | Auto-reset |
|---|---|---|---|
| idle | `icon_idle_{n}.png` | Default, after reset | — |
| capturing | `icon_capturing_{n}.png` | Scrape start | On success or error |
| success | `icon_success_{n}.png` | Notion write OK | Reset to idle after 3s |
| error | `icon_error_{n}.png` | Any error | Reset to idle after 5s |
| duplicate | `icon_duplicate_{n}.png` | Popup open + URL found in Notion | Replaced by capturing on click |

---

## Error Handling

| Scenario | Behavior |
|---|---|
| Options not configured | Error icon + notification: "Configure the extension first — click the icon and go to Options" |
| chrome:// or about: URL | Bail early — notification: "Can't capture browser pages" |
| DOM parse empty | Write URL + page title only, all other fields empty |
| Claude returns bad JSON | Catch silently, use partial DOM result |
| Claude API fails | Catch silently, use partial DOM result |
| Notion API non-200 | Error icon, log full response body to console |
| Duplicate check fails | Fail silently — show idle icon, don't block capture |

---

## Manifest V3 Permissions

```json
{
  "permissions": [
    "activeTab",
    "scripting",
    "storage",
    "notifications"
  ],
  "host_permissions": [
    "https://api.notion.com/*",
    "https://api.anthropic.com/*"
  ]
}
```

---

## Chrome Web Store Listing Guidelines

- **Name:** Job Tracker for Notion — v0.1 Early Release
- **Category:** Productivity
- **Tone:** Developer tool, not consumer app
- **Must include:** Notion token required, Claude key optional, template link, GitHub link
- **No implied support SLA**

---

## Known ATS DOM Selectors

### Greenhouse
- Title: `h1.app-title` or `h1[data-source="greenhouse"]`
- Company: `div.company-name` or parse `<title>`
- Location: `div.location`
- Description: `div#content`

### Lever
- Title: `h2[data-qa="posting-name"]` or `div.posting-headline h2`
- Company: `og:site_name` meta or parse `<title>`
- Location: `div.posting-categories .location`
- Description: `div.section-wrapper`

### Workday
- Title: `h2[data-automation-id="jobPostingHeader"]`
- Company: `og:site_name` or parse URL
- Location: `div[data-automation-id="locations"]`
- Description: `div[data-automation-id="jobPostingDescription"]`

### LinkedIn
- Title: `h1.top-card-layout__title` or `h1.job-details-jobs-unified-top-card__job-title`
- Company: `a.topcard__org-name-link`
- Location: `span.topcard__flavor--bullet`
- Description: `div.show-more-less-html__markup`

---

## README Requirements

1. One-line description
2. Notion template link — first thing after description
3. Step-by-step setup with screenshots
4. Supported job boards
5. How the duplicate detection works
6. How the Claude fallback works — one honest paragraph
7. Troubleshooting
8. Buy Me a Coffee link with copy: *"This tool is free and always will be. If it saves you time during your job search, a coffee is appreciated but never expected."*
9. Contributing / issues link

---

## Testing Checklist

### Extension
- [ ] Greenhouse: `https://www.everlaw.com/careers/4615567006/`
- [ ] Lever: any `jobs.lever.co/...` posting
- [ ] Workday: any `myworkdayjobs.com` posting
- [ ] LinkedIn: any `linkedin.com/jobs/view/...`
- [ ] Generic fallback on unknown ATS
- [ ] Claude fallback triggers when key present + result incomplete
- [ ] Claude fallback skips silently when no key
- [ ] Partial result writes cleanly to Notion
- [ ] Duplicate check shows yellow ring on already-saved URL
- [ ] Duplicate check shows idle on unsaved URL
- [ ] Duplicate check fails silently if credentials missing
- [ ] All 5 icon states render correctly at all 3 sizes
- [ ] Success resets to idle after 3s
- [ ] Error resets to idle after 5s
- [ ] Options saves and loads all three fields
- [ ] chrome:// page bails cleanly

### Notion Template
- [ ] Duplicates cleanly into new workspace
- [ ] All property types match schema
- [ ] All Status select options present
- [ ] Dashboard views load on empty database
- [ ] Dashboard populates after first capture
- [ ] Applied This Week filter works correctly

---

## v2 Considerations (Out of Scope for v1)

- Public OAuth → Notion gallery eligibility
- Hosted backend → removes BYOK requirement
- Airtable backend option
- Bulk import from CSV / LinkedIn saved jobs
- Auto-update notification
