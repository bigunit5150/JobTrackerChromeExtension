# Job Tracker for Notion

One-click Chrome extension that saves job postings to your Notion database.

## Quick Start

1. [Duplicate the Notion template](https://ribbon-punishment-423.notion.site/Job-Search-Dashboard-32b037c8790b80f1a3e8c5a95e140dff?source=copy_link)
2. Create your Notion integration token
3. [Install from Chrome Web Store](#) <!-- placeholder -->
4. Configure the extension

## Notion Setup

1. Go to [notion.so/my-integrations](https://www.notion.so/my-integrations) and create a new integration.
2. Copy the **Internal Integration Secret** (starts with `secret_` or `ntn_`).
3. Create a Notion database with these exact properties:

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

4. Open your database in Notion, click **...** (top right) > **Connections** > add your integration.
5. Copy the **Database ID** from the database URL — it's the 32-character hex string before the `?v=` parameter.

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

## Troubleshooting

- **"Notion credentials not configured"** — Open Settings and enter your token and database ID.
- **"API token is invalid" (401)** — Your Notion token is wrong or expired. Create a new one at [notion.so/my-integrations](https://www.notion.so/my-integrations).
- **"Database not found" (404)** — The database ID is wrong, or you haven't connected the integration to the database (Notion > ... > Connections).
- **"Property does not exist" (400)** — Your database columns don't match the expected schema. Check the Notion Setup section above.
- **"Duplicate" error** — A job with the same title and company already exists in your database.
- **Icon doesn't change** — Reload the extension at `chrome://extensions`.

---

This tool is free and always will be. If it saves you time during your job search, a coffee is appreciated but never expected. [Buy Me a Coffee](https://buymeacoffee.com/kjsmith5150)
