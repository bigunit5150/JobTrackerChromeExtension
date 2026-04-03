# Job Tracker for Notion

One-click Chrome extension that saves job postings to your Notion database.

[Install from Chrome Web Store](https://chromewebstore.google.com/detail/ponffclikgodccpghpammcpjpjeojopj?utm_source=item-share-cb) · [Notion Template](https://ribbon-punishment-423.notion.site/Job-Search-Dashboard-32b037c8790b80f1a3e8c5a95e140dff) · [Buy Me a Coffee](https://buymeacoffee.com/kjsmith5150)

**v1.1.0**

## Quick Start

1. [Duplicate the Notion template](https://ribbon-punishment-423.notion.site/Job-Search-Dashboard-32b037c8790b80f1a3e8c5a95e140dff) — this gives you a **Job Search Dashboard** with a pre-configured **Job Tracker** table
2. Create your Notion integration token
3. [Install from Chrome Web Store](https://chromewebstore.google.com/detail/ponffclikgodccpghpammcpjpjeojopj?utm_source=item-share-cb)4. Configure the extension with your token and the **Job Tracker** table's database ID

## Notion Setup

1. [Duplicate the template](https://ribbon-punishment-423.notion.site/Job-Search-Dashboard-32b037c8790b80f1a3e8c5a95e140dff) to your Notion workspace.
2. Go to [notion.so/my-integrations](https://www.notion.so/my-integrations) and create a new integration.
3. Copy the **Internal Integration Secret** (starts with `secret_` or `ntn_`).
4. Open the **Job Tracker** table in the dashboard (click into it so it opens as a full-page database).
5. Click **...** (top right) > **Connections** > add your integration.
6. Copy the **Database ID** — open the table as a full page, then grab the 32-character hex string from the URL before the `?v=` parameter.

   The table includes these properties:

   | Property     | Type   |
   |--------------|--------|
   | Role Title   | Title  |
   | Company      | Text   |
   | Job URL      | URL    |
   | Location     | Text   |
   | Job Type     | Select |
   | Salary Range | Text   |
   | ATS Source   | Text   |
   | Status       | Select |
   | Date Added   | Date   |
   | Date Applied | Date   |
   | Raw JD       | Text   |
   | Notes        | Text   |

## Configuration

1. Click the Job Tracker extension icon in Chrome.
2. Click **Settings** at the bottom of the popup.
3. Paste your **Notion Integration Token** and **Database ID**.
4. (Optional) Paste a **Claude API Key** to enable smarter extraction on unknown job boards.
5. Click **Save Settings**.
6. Click **Test Notion Connection** to verify everything works.

## Supported Job Boards

- **Greenhouse** — `boards.greenhouse.io` job postings
- **Lever** — `jobs.lever.co` job postings
- **Ashby** — `jobs.ashbyhq.com` job postings
- **Workday** — `myworkdayjobs.com` job postings
- **LinkedIn Jobs** — `linkedin.com/jobs` postings
- **Any other board** — generic fallback parser extracts what it can

## Duplicate Detection

The extension checks for duplicates in two ways:

- **On popup open:** Checks if the current URL already exists in your database. If found, the button changes to "Already Saved — Capture Again?" and the icon shows a yellow ring.
- **On save:** Checks if a job with the same Role Title and Company already exists. If found, the save is blocked and you see an error notification.

You can always override the URL-based duplicate warning and capture again if needed.

## Claude API (Optional)

If you provide a Claude API key in Settings, the extension will use Claude to extract structured job data when the built-in parsers can't fully parse a page. This helps on non-standard job boards where the HTML structure is unpredictable. Without a Claude key, the extension still works — it just relies on the built-in parsers and may capture less complete data on unusual sites.

## Privacy

**Your API keys are stored locally in Chrome storage. No data is collected or transmitted to any server operated by this extension.** [Privacy Policy](https://kssoftware.net/privacy-policy.html)

## Troubleshooting

- **"Notion credentials not configured"** — Open Settings and enter your token and database ID.
- **"API token is invalid" (401)** — Your Notion token is wrong or expired. Create a new one at [notion.so/my-integrations](https://www.notion.so/my-integrations).
- **"Database not found" (404)** — The database ID is wrong, or you haven't connected the integration to the database (Notion > ... > Connections).
- **"Property does not exist" (400)** — Your database columns don't match the expected schema. Check the Notion Setup section above.
- **"Duplicate" error** — A job with the same title and company already exists in your database.
- **Icon doesn't change** — Reload the extension at `chrome://extensions`.
- **Found a bug?** [Open an issue](https://github.com/bigunit5150/JobTrackerChromeExtension/issues)

## License

PolyForm Noncommercial License 1.0.0 — see `LICENSE` for details.
Free for personal, educational, and noncommercial use.

---

This tool is free and always will be. If it saves you time during your job search, a coffee is appreciated but never expected. [Buy Me a Coffee](https://buymeacoffee.com/kjsmith5150)
