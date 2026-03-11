# Job Tracker Chrome Extension — Project Spec

## Overview

A Chrome extension (Manifest V3) that captures job postings from any job board with one click and saves them as pages in a Notion database. Uses ATS-specific DOM parsers for fast extraction on known platforms (Greenhouse, Lever, Workday, LinkedIn) with a Claude API fallback for everything else.

---

## User Experience

1. User navigates to a job posting URL
2. Clicks the extension icon in the Chrome toolbar
3. Extension scrapes the page, parses the data, and silently writes a new page to Notion
4. Extension icon briefly shows ✓ (success) or ✗ (error) — no popup UI required
5. Chrome notification confirms: "Saved: [Role Title] at [Company]"

---

## Notion Database Schema

Create a Notion database (full-page, not inline) with these exact property names and types:

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
| Date Added | Date | Today |
| Date Applied | Date | Empty |
| Raw JD | Text | Full job description text |
| Notes | Text | Empty |

**Status select options:** Bookmarked, Applying, Applied, Interviewing, Negotiating, Accepted, Withdrew, No Response, Not Selected

---

## Architecture

```
job-tracker-extension/
├── .devcontainer/
│   └── devcontainer.json          # VS Code Dev Container config
├── manifest.json                  # MV3 manifest
├── background.js                  # Service worker: orchestrates parsing + Notion write
├── content.js                     # Injected into pages: DOM scraping
├── popup.html                     # Minimal popup (just triggers capture)
├── popup.js                       # One-click handler
├── options.html                   # Config: Notion token, Database ID, Claude API key
├── options.js
├── parsers/
│   ├── index.js                   # Parser selector — detects ATS from URL/DOM
│   ├── greenhouse.js              # Greenhouse-specific extractor
│   ├── lever.js                   # Lever-specific extractor
│   ├── workday.js                 # Workday-specific extractor
│   ├── linkedin.js                # LinkedIn Jobs extractor
│   └── generic.js                 # Generic fallback (h1 + largest text block)
├── claude.js                      # Claude API fallback parser
├── notion.js                      # Notion REST API client
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

---

## Dev Container Setup

### `.devcontainer/devcontainer.json`

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

No server process needed — Chrome loads the extension directly from the source folder. Node is used only for linting and any build steps.

---

## Data Flow

```
User clicks icon
      │
      ▼
popup.js → sends message to background.js
      │
      ▼
background.js → executes content.js in active tab
      │
      ▼
content.js → returns { url, rawText, domData }
      │
      ▼
parsers/index.js → detects ATS → runs specific parser
      │
      ├── If fields complete → skip Claude
      │
      └── If fields incomplete → claude.js (fallback)
                │
                ▼
            Structured { title, company, location, ... }
      │
      ▼
notion.js → POST /v1/pages → Notion Database
      │
      ▼
background.js → updates icon + fires Chrome notification
```

---

## ATS Detection Logic

```javascript
// parsers/index.js
function detectATS(url) {
  if (url.includes('greenhouse.io') || url.includes('grnh.se')) return 'greenhouse';
  if (url.includes('lever.co')) return 'lever';
  if (url.includes('myworkdayjobs.com') || url.includes('wd1.myworkday')) return 'workday';
  if (url.includes('linkedin.com/jobs')) return 'linkedin';
  return 'generic';
}
```

---

## Parser Interface (All parsers must return this shape)

```javascript
// Normalized job object — all fields optional except title
{
  title: String,           // Role title
  company: String,         // Company name
  location: String,        // Location text
  jobType: String,         // 'Remote' | 'Hybrid' | 'Onsite' | null
  salaryRange: String,     // e.g. '$150K – $200K' or null
  description: String,     // Full job description text
  atsSource: String        // 'greenhouse' | 'lever' | 'workday' | 'linkedin' | 'generic'
}
```

A parsed result is considered **complete** if `title`, `company`, and `description` are all non-empty. Otherwise, Claude fallback is triggered.

---

## Claude Fallback

**Model:** `claude-haiku-4-5-20251001` (fast + cheap for extraction tasks)

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

**Error handling:** If Claude call fails or returns unparseable JSON, fall back to the generic DOM parser result (partial data is better than no save).

---

## Notion API Integration

### Auth
- Header: `Authorization: Bearer {NOTION_TOKEN}`
- Header: `Notion-Version: 2022-06-28`
- Endpoint: `POST https://api.notion.com/v1/pages`

### Request Body Shape
```javascript
{
  parent: { database_id: DATABASE_ID },
  properties: {
    "Role Title":   { title: [{ text: { content: job.title } }] },
    "Company":      { rich_text: [{ text: { content: job.company } }] },
    "Job URL":      { url: job.url },
    "Location":     { rich_text: [{ text: { content: job.location } }] },
    "Job Type":     { select: { name: job.jobType } },
    "Salary Range": { rich_text: [{ text: { content: job.salaryRange } }] },
    "ATS Source":   { rich_text: [{ text: { content: job.atsSource } }] },
    "Status":       { select: { name: "Bookmarked" } },
    "Date Added":   { date: { start: new Date().toISOString().split('T')[0] } },
    "Date Applied": { date: null },
    "Raw JD":       { rich_text: [{ text: { content: job.description?.slice(0, 2000) } }] },
    "Notes":        { rich_text: [] }
  }
}
```

> Note: Notion rich_text fields have a 2000 character limit per block. Truncate Raw JD at 2000 chars for now.

---

## Options Page (Config)

Users enter these three values once via `options.html`:

| Field | Stored As | Description |
|---|---|---|
| Notion Integration Token | `notionToken` | From notion.so/my-integrations |
| Notion Database ID | `notionDatabaseId` | 32-char ID from database URL |
| Claude API Key | `claudeApiKey` | For fallback parsing (optional) |

Stored via `chrome.storage.sync` so settings persist across devices.

---

## Icon State Feedback

| State | Icon Badge | Duration |
|---|---|---|
| Idle | None | — |
| Capturing | "..." gray | Until complete |
| Success | "✓" green | 3 seconds |
| Error | "✗" red | 5 seconds |

---

## Manifest V3 Permissions Required

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

## Known ATS DOM Selectors (Reference)

### Greenhouse
- Title: `h1.app-title` or `h1[data-source="greenhouse"]`
- Company: `div.company-name` or page `<title>` parsing
- Location: `div.location`
- Description: `div#content`

### Lever
- Title: `h2[data-qa="posting-name"]` or `div.posting-headline h2`
- Company: Parse from `<title>` or `og:site_name` meta
- Location: `div.posting-categories .location`
- Description: `div.section-wrapper`

### Workday
- Title: `h2[data-automation-id="jobPostingHeader"]`
- Company: Parse from URL or `og:site_name`
- Location: `div[data-automation-id="locations"]`
- Description: `div[data-automation-id="jobPostingDescription"]`

### LinkedIn
- Title: `h1.top-card-layout__title` or `h1.job-details-jobs-unified-top-card__job-title`
- Company: `a.topcard__org-name-link`
- Location: `span.topcard__flavor--bullet`
- Description: `div.show-more-less-html__markup`

---

## Testing Checklist

- [ ] Greenhouse URL: `https://www.everlaw.com/careers/4615567006/`
- [ ] Lever URL: any `jobs.lever.co/...` posting
- [ ] Workday URL: any `myworkdayjobs.com` posting
- [ ] LinkedIn URL: any `linkedin.com/jobs/view/...`
- [ ] Generic fallback: a company careers page not on a known ATS
- [ ] Claude fallback triggers when DOM parse returns incomplete fields
- [ ] Notion page created with correct property types
- [ ] Options page saves and loads config correctly
- [ ] Icon badge shows success/error states
- [ ] Chrome notification fires on success

---

## Setup Instructions (After Build)

1. Open `chrome://extensions` in Chrome
2. Enable **Developer Mode** (top right toggle)
3. Click **Load unpacked** → select the project folder
4. Click the extension icon → go to Options
5. Paste your Notion Integration Token and Database ID
6. Optionally paste Claude API key for fallback parsing
7. Share your Notion database with the integration (via "Connect to" in Notion)
8. Navigate to any job posting and click the extension icon
