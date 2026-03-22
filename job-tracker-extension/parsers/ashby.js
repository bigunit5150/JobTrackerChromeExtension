function parseAshby({ url, rawText, domData }) {
  let title = '';
  let company = '';
  let location = '';
  let jobType = null;
  let salaryRange = null;
  let description = '';

  // Primary: JSON-LD structured data (embedded in page as schema.org/JobPosting)
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
      if (ld.jobLocationType === 'TELECOMMUTE') {
        jobType = 'Remote';
        if (!location) location = 'Remote';
      }

      // Employment type
      if (!jobType && ld.employmentType) {
        const et = ld.employmentType.toUpperCase();
        if (et.includes('FULL_TIME')) jobType = 'Full-time';
        else if (et.includes('PART_TIME')) jobType = 'Part-time';
        else if (et.includes('CONTRACT')) jobType = 'Contract';
        else if (et.includes('INTERN')) jobType = 'Internship';
      }

      // Salary
      const salary = ld.baseSalary?.value;
      if (salary?.minValue && salary?.maxValue) {
        const currency = ld.baseSalary.currency || 'USD';
        const unit = salary.unitText === 'YEAR' ? '/yr' : salary.unitText === 'HOUR' ? '/hr' : '';
        salaryRange = `${currency} ${salary.minValue.toLocaleString()} - ${salary.maxValue.toLocaleString()}${unit}`;
      } else if (salary?.minValue) {
        salaryRange = `${ld.baseSalary.currency || 'USD'} ${salary.minValue.toLocaleString()}+`;
      }

      // Description — strip HTML tags
      if (ld.description) {
        description = ld.description.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      }
    } catch {
      // JSON-LD parse failed, fall through to fallbacks
    }
  }

  // Fallback: page title format "Job Title @ Company"
  if ((!title || !company) && domData?.title) {
    const parts = domData.title.split(' @ ');
    if (parts.length >= 2) {
      if (!title) title = parts[0].trim();
      if (!company) company = parts.slice(1).join(' @ ').trim();
    }
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
    atsSource: 'ashby'
  };
}

export default parseAshby;
