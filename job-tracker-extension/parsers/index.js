import parseGreenhouse from './greenhouse.js';
import parseLever from './lever.js';
import parseWorkday from './workday.js';
import parseLinkedIn from './linkedin.js';
import parseAshby from './ashby.js';
import parseGeneric from './generic.js';

function detectATS(url) {
  if (url.includes('greenhouse.io') || url.includes('grnh.se')) return 'greenhouse';
  if (url.includes('lever.co')) return 'lever';
  if (url.includes('myworkdayjobs.com') || url.includes('wd1.myworkday')) return 'workday';
  if (url.includes('linkedin.com/jobs')) return 'linkedin';
  if (url.includes('ashbyhq.com')) return 'ashby';
  return 'generic';
}

function isComplete(job) {
  return (
    typeof job.title === 'string' && job.title.trim() !== '' &&
    typeof job.company === 'string' && job.company.trim() !== '' &&
    typeof job.description === 'string' && job.description.trim() !== ''
  );
}

function parse(data) {
  const ats = detectATS(data.url);

  let result;
  switch (ats) {
    case 'greenhouse': result = parseGreenhouse(data); break;
    case 'lever':      result = parseLever(data);      break;
    case 'workday':    result = parseWorkday(data);    break;
    case 'linkedin':   result = parseLinkedIn(data);   break;
    case 'ashby':      result = parseAshby(data);       break;
    default:           result = parseGeneric(data);    break;
  }

  return { result, isComplete: isComplete(result) };
}

export { parse, detectATS, isComplete };
