const NOTION_API_URL = 'https://api.notion.com/v1/pages';
const NOTION_DB_URL = 'https://api.notion.com/v1/databases';
const NOTION_VERSION = '2022-06-28';

async function checkDuplicate(notionToken, notionDatabaseId, title, company) {
  try {
    const filter = {
      and: [
        {
          property: 'Role Title',
          title: { equals: title }
        },
        {
          property: 'Company',
          rich_text: { equals: company }
        }
      ]
    };

    const response = await fetch(`${NOTION_DB_URL}/${notionDatabaseId}/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${notionToken}`,
        'Content-Type': 'application/json',
        'Notion-Version': NOTION_VERSION
      },
      body: JSON.stringify({ filter, page_size: 1 })
    });

    if (!response.ok) {
      console.warn('[JobTracker] Duplicate check failed, proceeding with save');
      return false;
    }

    const data = await response.json();
    return data.results.length > 0;
  } catch {
    console.warn('[JobTracker] Duplicate check network error, proceeding with save');
    return false;
  }
}

async function saveToNotion(job, url) {
  const { notionToken, notionDatabaseId } = await chrome.storage.sync.get([
    'notionToken',
    'notionDatabaseId'
  ]);

  if (!notionToken) {
    throw new Error('Notion Integration Token not configured. Open extension options to set it up.');
  }
  if (!notionDatabaseId) {
    throw new Error('Notion Database ID not configured. Open extension options to set it up.');
  }

  const title = job.title || 'Untitled';
  const company = job.company || '';

  if (title && company) {
    const isDuplicate = await checkDuplicate(notionToken, notionDatabaseId, title, company);
    if (isDuplicate) {
      throw new Error(`Duplicate: "${title}" at "${company}" already exists in Notion.`);
    }
  }

  const today = new Date().toISOString().split('T')[0];
  const description = (job.description || '').slice(0, 2000);

  // Build properties — skip optional fields if empty to avoid Notion validation errors
  const properties = {
    'Role Title': {
      title: [{ text: { content: title } }]
    },
    'Company': {
      rich_text: [{ text: { content: company } }]
    },
    'Job URL': {
      url: url || null
    },
    'Location': {
      rich_text: [{ text: { content: job.location || '' } }]
    },
    'ATS Source': {
      rich_text: [{ text: { content: job.atsSource || '' } }]
    },
    'Status': {
      select: { name: 'Bookmarked' }
    },
    'Date Added': {
      date: { start: today }
    },
    'Raw JD': {
      rich_text: [{ text: { content: description } }]
    },
    'Notes': {
      rich_text: []
    }
  };

  // Only include select fields if they have a value (Notion rejects empty select names)
  if (job.jobType) {
    properties['Job Type'] = { select: { name: job.jobType } };
  }

  if (job.salaryRange) {
    properties['Salary Range'] = { rich_text: [{ text: { content: job.salaryRange } }] };
  }

  const body = {
    parent: { database_id: notionDatabaseId },
    properties
  };

  const response = await fetch(NOTION_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${notionToken}`,
      'Content-Type': 'application/json',
      'Notion-Version': NOTION_VERSION
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({ message: 'Unknown error' }));
    const msg = errData.message || JSON.stringify(errData);
    console.error('[JobTracker] Notion API error:', response.status, errData);
    throw new Error(`Notion API ${response.status}: ${msg}`);
  }

  const created = await response.json();
  return created.id;
}

async function checkDuplicateByUrl(url, token, databaseId) {
  try {
    const response = await fetch(`${NOTION_DB_URL}/${databaseId}/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Notion-Version': NOTION_VERSION
      },
      body: JSON.stringify({
        filter: { property: 'Job URL', url: { equals: url } },
        page_size: 1
      })
    });

    if (!response.ok) return false;
    const data = await response.json();
    return data.results.length > 0;
  } catch {
    return false;
  }
}

export { checkDuplicateByUrl };
export default saveToNotion;
