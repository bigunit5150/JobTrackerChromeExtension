function parseLever({ url, rawText, domData }) {
  let title = '';
  let company = '';
  let location = '';
  let jobType = null;
  let salaryRange = null;
  let description = '';

  // Primary: JSON-LD structured data
  const jsonLdMatch = rawText.match(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/i);
  if (jsonLdMatch) {
    try {
      const ld = JSON.parse(jsonLdMatch[1]);

      title = ld.title || '';
      company = ld.hiringOrganization?.name || '';

      // Location
      const addr = ld.jobLocation?.address;
      if (addr?.addressLocality) {
        location = [addr.addressLocality, addr.addressRegion, addr.addressCountry]
          .filter(Boolean).join(', ');
      }

      // Employment type
      if (ld.employmentType) {
        const et = ld.employmentType.toLowerCase();
        if (et.includes('full')) jobType = 'Full-time';
        else if (et.includes('part')) jobType = 'Part-time';
        else if (et.includes('contract')) jobType = 'Contract';
        else if (et.includes('intern')) jobType = 'Internship';
      }

      // Description — strip HTML tags
      if (ld.description) {
        description = ld.description.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      }
    } catch {
      // JSON-LD parse failed, fall through to fallbacks
    }
  }

  // Fallback: page title format "Company - Job Title"
  if ((!title || !company) && domData?.title) {
    const parts = domData.title.split(/\s*-\s*/);
    if (parts.length >= 2) {
      if (!company) company = parts[0].trim();
      if (!title) title = parts.slice(1).join(' - ').trim();
    }
  }

  // Fallback: company from URL (jobs.lever.co/company/...)
  if (!company) {
    const urlMatch = url.match(/lever\.co\/([^/]+)/);
    if (urlMatch) company = urlMatch[1].replace(/-/g, ' ');
  }

  // Remote/hybrid detection from raw text
  const textLower = rawText.toLowerCase();
  if (!jobType || jobType === 'Full-time') {
    if (textLower.includes('workplacetypes') && textLower.includes('remote')) {
      jobType = 'Remote';
    } else if (textLower.includes('hybrid')) {
      jobType = 'Hybrid';
    }
  }

  // Salary: look for compensation pattern in raw text
  if (!salaryRange) {
    const salaryMatch = rawText.match(/(?:Compensation[^:]*:\s*)?\$[\d,]+[kK]?\s*[-–—]\s*\$?[\d,]+[kK]?(?:\s*(?:per year|\/yr|annually|\/hour|\/hr))?/i);
    if (salaryMatch) salaryRange = salaryMatch[0].trim();
  }

  // Fallback: raw text for description
  if (!description && rawText) {
    const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
    description = lines.slice(2).join('\n').trim();
  }

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
