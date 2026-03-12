import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import parseGreenhouse from '../parsers/greenhouse.js';
import parseLever from '../parsers/lever.js';
import parseWorkday from '../parsers/workday.js';
import parseLinkedIn from '../parsers/linkedin.js';
import parseGeneric from '../parsers/generic.js';
import { detectATS, isComplete } from '../parsers/index.js';

// ---------------------------------------------------------------------------
// detectATS
// ---------------------------------------------------------------------------
describe('detectATS', () => {
  test('detects greenhouse.io', () => {
    assert.equal(detectATS('https://boards.greenhouse.io/everlaw/jobs/4615567006'), 'greenhouse');
  });
  test('detects grnh.se shortlink', () => {
    assert.equal(detectATS('https://grnh.se/abc123'), 'greenhouse');
  });
  test('detects lever.co', () => {
    assert.equal(detectATS('https://jobs.lever.co/acme/abc-123'), 'lever');
  });
  test('detects myworkdayjobs.com', () => {
    assert.equal(detectATS('https://acme.wd1.myworkdayjobs.com/en-US/acme/job/123'), 'workday');
  });
  test('detects linkedin.com/jobs', () => {
    assert.equal(detectATS('https://www.linkedin.com/jobs/view/1234567890'), 'linkedin');
  });
  test('falls back to generic', () => {
    assert.equal(detectATS('https://careers.acme.com/jobs/software-engineer'), 'generic');
  });
});

// ---------------------------------------------------------------------------
// isComplete
// ---------------------------------------------------------------------------
describe('isComplete', () => {
  test('returns true when title + company + description present', () => {
    assert.equal(isComplete({ title: 'SWE', company: 'Acme', description: 'Build things.' }), true);
  });
  test('returns false when title is missing', () => {
    assert.equal(isComplete({ title: '', company: 'Acme', description: 'Build things.' }), false);
  });
  test('returns false when company is missing', () => {
    assert.equal(isComplete({ title: 'SWE', company: '', description: 'Build things.' }), false);
  });
  test('returns false when description is missing', () => {
    assert.equal(isComplete({ title: 'SWE', company: 'Acme', description: '' }), false);
  });
});

// ---------------------------------------------------------------------------
// Greenhouse parser
// ---------------------------------------------------------------------------
describe('parseGreenhouse', () => {
  const sample = {
    url: 'https://boards.greenhouse.io/everlaw/jobs/4615567006',
    domData: { title: 'Senior Software Engineer at Everlaw' },
    rawText: `Senior Software Engineer
San Francisco, CA (Hybrid)

About the role
We are looking for a Senior Software Engineer to join our team.
You will build scalable backend services using Java and Python.
Salary: $170,000 – $210,000 per year

Responsibilities
- Design and build distributed systems
- Mentor junior engineers`,
  };

  test('extracts title from domData', () => {
    const result = parseGreenhouse(sample);
    assert.equal(result.title, 'Senior Software Engineer');
  });

  test('extracts company from domData', () => {
    const result = parseGreenhouse(sample);
    assert.equal(result.company, 'Everlaw');
  });

  test('detects Hybrid jobType', () => {
    const result = parseGreenhouse(sample);
    assert.equal(result.jobType, 'Hybrid');
  });

  test('extracts salary range', () => {
    const result = parseGreenhouse(sample);
    assert.ok(result.salaryRange, 'salaryRange should be non-null');
    assert.ok(result.salaryRange.includes('170'), 'salaryRange should include lower bound');
  });

  test('atsSource is greenhouse', () => {
    const result = parseGreenhouse(sample);
    assert.equal(result.atsSource, 'greenhouse');
  });

  test('description is non-empty', () => {
    const result = parseGreenhouse(sample);
    assert.ok(result.description.length > 0);
  });
});

// ---------------------------------------------------------------------------
// Lever parser
// ---------------------------------------------------------------------------
describe('parseLever', () => {
  const sample = {
    url: 'https://jobs.lever.co/acme/abc-123-def',
    domData: { title: 'Product Manager · Acme Corp' },
    rawText: `Product Manager
Remote

About the role
We're hiring a Product Manager to lead our growth team.
You'll define the roadmap and work cross-functionally.

What you'll do
- Define product strategy
- Work with engineering and design`,
  };

  test('extracts title from domData separator ·', () => {
    const result = parseLever(sample);
    assert.equal(result.title, 'Product Manager');
  });

  test('extracts company from domData separator ·', () => {
    const result = parseLever(sample);
    assert.equal(result.company, 'Acme Corp');
  });

  test('detects Remote jobType', () => {
    const result = parseLever(sample);
    assert.equal(result.jobType, 'Remote');
  });

  test('atsSource is lever', () => {
    const result = parseLever(sample);
    assert.equal(result.atsSource, 'lever');
  });

  test('falls back to URL for company when title has no separator', () => {
    const noSep = { ...sample, domData: { title: 'Product Manager' } };
    const result = parseLever(noSep);
    assert.ok(result.company.length > 0, 'company should come from URL');
  });
});

// ---------------------------------------------------------------------------
// Workday parser
// ---------------------------------------------------------------------------
describe('parseWorkday', () => {
  const sample = {
    url: 'https://acme.wd1.myworkdayjobs.com/en-US/acme/job/123',
    domData: { title: 'Data Engineer | Acme' },
    rawText: `Data Engineer
Locations: Austin, TX, United States

Job Description
Build and maintain data pipelines using Spark and dbt.
Collaborate with data scientists and analysts.

What You'll Do
- Design scalable ETL workflows
- Monitor pipeline health`,
  };

  test('extracts title from domData (strips suffix)', () => {
    const result = parseWorkday(sample);
    assert.equal(result.title, 'Data Engineer');
  });

  test('extracts location', () => {
    const result = parseWorkday(sample);
    assert.ok(result.location.includes('Austin'));
  });

  test('detects Onsite jobType from location', () => {
    const result = parseWorkday(sample);
    assert.equal(result.jobType, 'Onsite');
  });

  test('atsSource is workday', () => {
    const result = parseWorkday(sample);
    assert.equal(result.atsSource, 'workday');
  });
});

// ---------------------------------------------------------------------------
// LinkedIn parser
// ---------------------------------------------------------------------------
describe('parseLinkedIn', () => {
  const sample = {
    url: 'https://www.linkedin.com/jobs/view/1234567890',
    domData: { title: 'Frontend Engineer at Stripe | LinkedIn' },
    rawText: `Frontend Engineer
Stripe
San Francisco, CA · Hybrid · Full-time

About the job
We are looking for a Frontend Engineer to join Stripe's infrastructure team.
You will build tools used by millions of developers worldwide.
Compensation: $160,000 – $200,000

Requirements
- 4+ years of React experience
- Strong TypeScript skills`,
  };

  test('extracts title from domData (strips | LinkedIn)', () => {
    const result = parseLinkedIn(sample);
    assert.equal(result.title, 'Frontend Engineer');
  });

  test('extracts company from domData', () => {
    const result = parseLinkedIn(sample);
    assert.equal(result.company, 'Stripe');
  });

  test('detects Hybrid jobType', () => {
    const result = parseLinkedIn(sample);
    assert.equal(result.jobType, 'Hybrid');
  });

  test('extracts description from "About the job" section', () => {
    const result = parseLinkedIn(sample);
    assert.ok(result.description.includes('infrastructure team'));
  });

  test('atsSource is linkedin', () => {
    const result = parseLinkedIn(sample);
    assert.equal(result.atsSource, 'linkedin');
  });
});

// ---------------------------------------------------------------------------
// Generic parser
// ---------------------------------------------------------------------------
describe('parseGeneric', () => {
  const sample = {
    url: 'https://careers.acme.com/jobs/staff-engineer',
    domData: { title: 'Staff Engineer at Acme Inc' },
    rawText: `Staff Engineer
Location: New York, NY

About
Acme Inc is hiring a Staff Engineer to lead platform initiatives.
You will define architecture and drive cross-team alignment.

Responsibilities
- Lead technical design
- Drive engineering excellence`,
  };

  test('extracts title from domData', () => {
    const result = parseGeneric(sample);
    assert.ok(result.title.length > 0);
  });

  test('extracts company from "at" pattern in page title', () => {
    const result = parseGeneric(sample);
    assert.ok(result.company.includes('Acme'));
  });

  test('extracts location', () => {
    const result = parseGeneric(sample);
    assert.ok(result.location.includes('New York'));
  });

  test('detects Onsite jobType', () => {
    const result = parseGeneric(sample);
    assert.equal(result.jobType, 'Onsite');
  });

  test('atsSource is generic', () => {
    const result = parseGeneric(sample);
    assert.equal(result.atsSource, 'generic');
  });
});
