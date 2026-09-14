import { readFileSync } from 'node:fs';

const requirements = readFileSync('docs/v2/requirements/REQUIREMENTS.md', 'utf8');
const traceability = readFileSync('docs/v2/REQUIREMENT_TRACEABILITY.md', 'utf8');

const idPattern = '(?:P-\\d{3}|R-[A-Z0-9-]+-\\d{3}|NFR-[A-Z0-9-]+-\\d{3})';
const headingPattern = new RegExp(`^###\\s+(${idPattern})\\b`, 'gm');
const rowPattern = new RegExp(`^\\|\\s*(${idPattern})\\s*\\|([^\\n]+)$`, 'gm');

const requirementIds = [...requirements.matchAll(headingPattern)].map((match) => match[1]);
const rows = [...traceability.matchAll(rowPattern)].map((match) => ({
  id: match[1],
  content: match[2],
}));
const tracedIds = rows.map((row) => row.id);

const missing = requirementIds.filter((id) => !tracedIds.includes(id));
const unknown = tracedIds.filter((id) => !requirementIds.includes(id));
const duplicates = tracedIds.filter((id, index) => tracedIds.indexOf(id) !== index);
const incomplete = rows.filter((row) => !row.content.includes('PASS')).map((row) => row.id);

const failures = [];
if (missing.length > 0) failures.push(`Missing requirement IDs: ${missing.join(', ')}`);
if (unknown.length > 0) failures.push(`Unknown requirement IDs: ${unknown.join(', ')}`);
if (duplicates.length > 0) failures.push(`Duplicate requirement IDs: ${[...new Set(duplicates)].join(', ')}`);
if (incomplete.length > 0) failures.push(`Rows without PASS evidence: ${incomplete.join(', ')}`);

if (failures.length > 0) {
  throw new Error(`Requirement traceability verification failed.\n${failures.join('\n')}`);
}

console.log(
  `Requirement traceability verified: ${requirementIds.length} normative requirement/principle IDs mapped.`,
);
