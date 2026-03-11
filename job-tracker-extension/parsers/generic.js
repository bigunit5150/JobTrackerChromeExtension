function parseGeneric({ url, rawText, domData }) {
  const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);

  // Title: first non-empty line, or from page title
  let title = lines[0] || domData.title || '';

  // If page title looks more informative, prefer it
  if (domData.title && domData.title.length < 120) {
    const cleanTitle = domData.title.replace(/\s*[\|\-].*$/, '').trim();
    if (cleanTitle) title = cleanTitle;
  }

  // Company: try page title "Role at Company" or "Role | Company" pattern
  let company = '';
  if (domData.title) {
    const atMatch = domData.title.match(/\bat\s+(.+?)(?:\s*[\|\-]|$)/i);
    const pipeMatch = domData.title.match(/[\|\-]\s*(.+?)(?:\s*[\|\-]|$)/);
    if (atMatch) company = atMatch[1].trim();
    else if (pipeMatch) company = pipeMatch[1].trim();
  }

  // Location: look for common location patterns
  let location = '';
  const locationMatch = rawText.match(/(?:Location|Based in|Office)[:\s]+([^\n]{3,60})/i);
  if (locationMatch) {
    location = locationMatch[1].trim();
  } else {
    // Look for City, State/Country pattern
    const cityMatch = rawText.match(/\b([A-Z][a-z]+(?: [A-Z][a-z]+)?,\s*(?:[A-Z]{2}|[A-Za-z ]{2,20}))\b/);
    if (cityMatch) location = cityMatch[1];
  }

  // Description: the largest contiguous text block
  let description = '';
  const descMatch = rawText.match(/(?:About|Description|Overview|Responsibilities|What you.ll do)[:\s]*\n+([\s\S]+)/i);
  if (descMatch) {
    description = descMatch[1].trim();
  } else {
    // Use everything after title + company lines as description
    description = lines.slice(2).join('\n').trim() || rawText;
  }

  // jobType
  let jobType = null;
  const jt = rawText.toLowerCase();
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
    atsSource: 'generic'
  };
}

export default parseGeneric;
