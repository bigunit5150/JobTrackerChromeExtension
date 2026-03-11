function parseLever({ url, rawText, domData }) {
  let title = '';
  let company = '';
  let location = '';
  let description = '';

  // Title from page title: "Role · Company" or "Role - Company"
  if (domData.title) {
    const parts = domData.title.split(/\s*[·\-|]\s*/);
    if (parts.length >= 2) {
      title = parts[0].trim();
      company = parts[1].trim();
    } else {
      title = domData.title.trim();
    }
  }

  // Company from URL: jobs.lever.co/company/...
  if (!company) {
    const urlMatch = url.match(/lever\.co\/([^/]+)/);
    if (urlMatch) company = urlMatch[1].replace(/-/g, ' ');
  }

  // Location from rawText
  const locationMatch = rawText.match(/(?:Location|Remote|Hybrid)[:\s]+([^\n]+)/i);
  if (locationMatch) {
    location = locationMatch[1].trim();
  } else {
    // Lever often puts location near top — grab second non-empty line
    const lines = rawText.split('\n').filter(l => l.trim());
    if (lines.length >= 3) location = lines[2].trim();
  }

  // Description: text after the first large heading
  const descMatch = rawText.match(/(?:About the (?:role|position|team)|Job Description|Overview|What you.ll do)[:\s]*\n+([\s\S]+)/i);
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
    atsSource: 'lever'
  };
}

export default parseLever;
