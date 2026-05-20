#!/usr/bin/env node
/**
 * guard-secrets.mjs
 * Scans staged diff for secret patterns. Exits 1 on any hit.
 */
import { execSync } from 'child_process';

const PATTERNS = [
  { name: 'AWS access key',      re: /AKIA[0-9A-Z]{16}/ },
  { name: 'Private key header',  re: /-----BEGIN (RSA |EC )?PRIVATE KEY-----/ },
  { name: 'JWT_SECRET',          re: /JWT_SECRET\s*=\s*['"][^'"]{16,}['"]/ },
  { name: 'DB connection string',re: /postgres:\/\/[^\s'"]+:[^\s'"]+@/ },
];

// AWS secret: only flag when aws_secret appears near a 40-char base64 string (conservative)
const AWS_SECRET_RE = /aws_secret[_\s]*(?:access[_\s]*)?key[^\n]{0,30}['"]([A-Za-z0-9/+=]{40})['"]/i;

function getStagedFiles() {
  try {
    const out = execSync('git diff --cached --name-only', { encoding: 'utf8' });
    return out.split('\n').map(f => f.trim()).filter(Boolean);
  } catch { return []; }
}

function getStagedDiff(file) {
  try {
    return execSync(`git diff --cached -- "${file}"`, { encoding: 'utf8' });
  } catch { return ''; }
}

const staged = getStagedFiles();
let violations = 0;

for (const file of staged) {
  // Flag .env files (but not .env.example / .env.sample)
  if (/(?:^|[/\\])\.env$/.test(file)) {
    console.error(`SECRETS  .env file staged: ${file}  →  .env files must never be committed`);
    violations++;
    continue;
  }

  const diff = getStagedDiff(file);
  const addedLines = diff.split('\n').filter(l => l.startsWith('+') && !l.startsWith('+++'));

  for (const line of addedLines) {
    for (const { name, re } of PATTERNS) {
      if (re.test(line)) {
        console.error(`SECRETS  ${file}  →  matched pattern "${name}"`);
        violations++;
      }
    }
    if (AWS_SECRET_RE.test(line)) {
      console.error(`SECRETS  ${file}  →  matched pattern "AWS secret key"`);
      violations++;
    }
  }
}

if (violations > 0) {
  console.error(`\n✖  secrets: ${violations} secret(s) detected in staged files. Remove before committing.`);
  process.exit(1);
} else {
  console.log('✔  secrets: no secrets detected in staged files');
}
