function parseGreenhouse({ url, rawText, domData }) {
  let title = '';
  let company = '';
  let location = '';
  let description = '';

  // Title
  const titleMatch = rawText.match(/^([^\n]+)/);
  title = titleMatch ? titleMatch[1].trim() : '';

  // Try to extract title from domData page title: "Role at Company"
  if (domData.title) {
    const titleParts = domData.title.split(' at ');
    if (titleParts.length >= 2) {
      if (!title) title = titleParts[0].trim();
      if (!company) company = titleParts[1].replace(/\s*[\|\-].*$/, '').trim();
    }
    if (!title) {
      // Fall back to page title stripping common suffixes
      title = domData.title.replace(/\s*[\|\-].*$/, '').trim();
    }
  }

  // Company from URL if not found yet (e.g. boards.greenhouse.io/companyname/...)
  if (!company) {
    const urlMatch = url.match(/greenhouse\.io\/([^/]+)/);
    if (urlMatch) company = urlMatch[1].replace(/-/g, ' ');
  }

  // Location: look for text after common location indicators
  const locationMatch = rawText.match(/(?:Location|Remote|Hybrid|Onsite)[:\s]+([^\n]+)/i);
  if (locationMatch) location = locationMatch[1].trim();

  // Description: everything after "About" or large block
  const descMatch = rawText.match(/(?:About the (?:role|job|position)|Job Description|Responsibilities)[:\s]*\n+([\s\S]+)/i);
  description = descMatch ? descMatch[1].trim() : rawText;

  // jobType detection
  let jobType = null;
  const jt = (location + ' ' + rawText).toLowerCase();
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
    atsSource: 'greenhouse'
  };
}

export default parseGreenhouse;
