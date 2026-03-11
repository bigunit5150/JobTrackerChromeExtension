function parseLinkedIn({ url, rawText, domData }) {
  let title = '';
  let company = '';
  let location = '';
  let description = '';

  // LinkedIn page title format: "Role at Company | LinkedIn"
  if (domData.title) {
    const withoutSuffix = domData.title.replace(/\s*\|\s*LinkedIn.*$/i, '').trim();
    const parts = withoutSuffix.split(/\s+at\s+/i);
    if (parts.length >= 2) {
      title = parts[0].trim();
      company = parts[1].trim();
    } else {
      title = withoutSuffix;
    }
  }

  // Location — LinkedIn typically shows city/state near the top
  const locationMatch = rawText.match(/(?:^|\n)([A-Z][a-z]+(?: [A-Z][a-z]+)?,?\s*(?:[A-Z]{2}|[A-Za-z ]+))\s*(?:\n|$)/m);
  if (locationMatch) location = locationMatch[1].trim();

  // Description: look for "About the job" section
  const descMatch = rawText.match(/About the job[:\s]*\n+([\s\S]+)/i);
  if (descMatch) {
    description = descMatch[1].trim();
  } else {
    // Take everything after the first 3 lines (past the header)
    const lines = rawText.split('\n').filter(l => l.trim());
    description = lines.slice(3).join('\n').trim() || rawText;
  }

  // jobType
  let jobType = null;
  const jt = (rawText).toLowerCase();
  if (jt.includes('remote')) jobType = 'Remote';
  else if (jt.includes('hybrid')) jobType = 'Hybrid';
  else if (location) jobType = 'Onsite';

  // Salary
  let salaryRange = null;
  const salaryMatch = rawText.match(/\$[\d,]+(?:K|k)?(?:\s*[-–—]\s*\$[\d,]+(?:K|k)?)?(?:\s*(?:per year|\/yr|annually|\/hour|\/hr))?/);
  if (salaryMatch) salaryRange = salaryMatch[0];

  return {
    title: title || '',
    company: company || '',
    location: location || '',
    jobType,
    salaryRange,
    description: description || rawText,
    atsSource: 'linkedin'
  };
}

export default parseLinkedIn;
