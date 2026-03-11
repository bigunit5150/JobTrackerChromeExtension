const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-haiku-4-5-20251001';

async function claudeFallback(rawText, partialResult) {
  const { claudeApiKey } = await chrome.storage.sync.get('claudeApiKey');

  if (!claudeApiKey) {
    console.log('[JobTracker] No Claude API key configured, skipping fallback.');
    return partialResult;
  }

  const prompt = `Extract structured job information from the following job posting text.
Return ONLY valid JSON with these exact keys:
title, company, location, jobType, salaryRange, description

jobType must be one of: Remote, Hybrid, Onsite, or null if unclear.
salaryRange should be the raw text if present, or null.
description should be the full job description text.

Job posting text:
${rawText}`;

  try {
    const response = await fetch(CLAUDE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': claudeApiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (!response.ok) {
      const errBody = await response.text();
      console.error('[JobTracker] Claude API error:', response.status, errBody);
      return partialResult;
    }

    const data = await response.json();
    const content = data.content?.[0]?.text || '';

    // Strip markdown code fences if present
    const jsonText = content.replace(/```(?:json)?\s*/g, '').replace(/```\s*/g, '').trim();

    let parsed;
    try {
      parsed = JSON.parse(jsonText);
    } catch (parseErr) {
      console.error('[JobTracker] Claude returned malformed JSON:', jsonText);
      return partialResult;
    }

    // Merge: partialResult wins on any field it already has
    return {
      title:       partialResult.title       || parsed.title       || '',
      company:     partialResult.company     || parsed.company     || '',
      location:    partialResult.location    || parsed.location    || '',
      jobType:     partialResult.jobType     || parsed.jobType     || null,
      salaryRange: partialResult.salaryRange || parsed.salaryRange || null,
      description: partialResult.description || parsed.description || '',
      atsSource:   partialResult.atsSource
    };

  } catch (err) {
    console.error('[JobTracker] Claude request failed:', err);
    return partialResult;
  }
}

export default claudeFallback;
