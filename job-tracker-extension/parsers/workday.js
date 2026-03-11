function parseWorkday({ url, rawText, domData }) {
  let title = '';
  let company = '';
  let location = '';
  let description = '';

  // Title from page title
  if (domData.title) {
    title = domData.title.replace(/\s*[\|\-].*$/, '').trim();
  }

  // Company from URL subdomain: company.wd1.myworkday.com or company.myworkdayjobs.com
  const urlMatch = url.match(/https?:\/\/([^.]+)\./);
  if (urlMatch) company = urlMatch[1].replace(/-/g, ' ');

  // Title fallback — first non-empty line of rawText if domData.title was just the company name
  if (!title || title.toLowerCase() === company.toLowerCase()) {
    const lines = rawText.split('\n').filter(l => l.trim());
    if (lines.length >= 1) title = lines[0].trim();
  }

  // Location
  const locationMatch = rawText.match(/(?:Locations?|Location)[:\s]+([^\n]+)/i);
  if (locationMatch) {
    location = locationMatch[1].trim();
  } else {
    // Workday often lists city, state on a dedicated line
    const stateMatch = rawText.match(/([A-Z][a-z]+(?: [A-Z][a-z]+)?,\s*[A-Z]{2}(?:,\s*United States)?)/);
    if (stateMatch) location = stateMatch[1];
  }

  // Description
  const descMatch = rawText.match(/(?:Job Description|About the Role|What You.ll Do|Responsibilities)[:\s]*\n+([\s\S]+)/i);
  description = descMatch ? descMatch[1].trim() : rawText;

  // jobType
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
    atsSource: 'workday'
  };
}

export default parseWorkday;
