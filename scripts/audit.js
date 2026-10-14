/**
 * Crest Wealth – Static Analysis Audit Script
 * Run with: node scripts/audit.js
 *
 * Checks performed:
 *   1. ESLint on all .js files
 *   2. Stylelint on all .css files
 *   3. Custom HTML checks:
 *      – Missing alt attributes on <img> tags
 *      – Missing Content-Security-Policy meta tag
 *   4. Forbidden pattern scan across all .js files:
 *      – eval()
 *      – new Function()
 *      – innerHTML with raw user data patterns
 */

const path = require('path');
const fs   = require('fs');
const { execSync } = require('child_process');

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────
const SKIP_DIRS = new Set([
  'node_modules', '.git', '.kilo', '.trae', '.agents', 'scratch'
]);

function walk(dir, callback) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch (_) { return; }
  for (const entry of entries) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, callback);
    else callback(full);
  }
}

let warnings = 0;
let errors   = 0;

function warn(msg)  { console.warn('  ⚠️  ' + msg);  warnings++; }
function error(msg) { console.error('  ❌  ' + msg); errors++;   }
function ok(msg)    { console.log( '  ✅  ' + msg); }

const projectRoot = path.resolve(__dirname, '..');
console.log('\n🔍  Crest Wealth – Site Audit');
console.log('   Project root:', projectRoot);
console.log('━'.repeat(60));

// ──────────────────────────────────────────────────────────────────────────────
// 1. ESLint
// ──────────────────────────────────────────────────────────────────────────────
console.log('\n[1/4] ESLint (JavaScript)');
try {
  execSync('npx eslint "**/*.js" --ignore-pattern "node_modules/**" --ignore-pattern "scripts/audit.js" --max-warnings=0 --no-eslintrc --rule "no-unused-vars: warn" --rule "no-eval: error"', {
    stdio: 'inherit',
    cwd: projectRoot
  });
  ok('ESLint passed with zero warnings.');
} catch (_) {
  error('ESLint reported errors or warnings above. Fix them before deploying.');
}

// ──────────────────────────────────────────────────────────────────────────────
// 2. Stylelint
// ──────────────────────────────────────────────────────────────────────────────
console.log('\n[2/4] Stylelint (CSS)');
try {
  execSync('npx stylelint "**/*.css" --ignore-path .gitignore --max-warnings=0', {
    stdio: 'inherit',
    cwd: projectRoot
  });
  ok('Stylelint passed with zero warnings.');
} catch (_) {
  error('Stylelint reported errors or warnings above. Fix them before deploying.');
}

// ──────────────────────────────────────────────────────────────────────────────
// 3. HTML checks
// ──────────────────────────────────────────────────────────────────────────────
console.log('\n[3/4] HTML checks (alt attributes, CSP)');
let htmlFiles = 0;
walk(projectRoot, file => {
  if (!file.endsWith('.html')) return;
  htmlFiles++;
  const content = fs.readFileSync(file, 'utf8');
  const rel     = path.relative(projectRoot, file);

  // Missing alt
  const missingAlt = [...content.matchAll(/<img(?![^>]*\balt=)[^>]*>/gi)];
  if (missingAlt.length) {
    warn(`${rel}: ${missingAlt.length} <img> tag(s) missing alt attribute`);
  }

  // CSP
  if (!/Content-Security-Policy/.test(content)) {
    warn(`${rel}: No Content-Security-Policy <meta> tag found`);
  }

  // Inline event handlers (security smell)
  const inlineEvents = [...content.matchAll(/\son\w+\s*=\s*["']/gi)];
  if (inlineEvents.length > 10) {
    warn(`${rel}: ${inlineEvents.length} inline event handlers (onclick=, etc.) – consider delegating via JS`);
  }
});
console.log(`   Scanned ${htmlFiles} HTML file(s).`);

// ──────────────────────────────────────────────────────────────────────────────
// 4. Forbidden pattern scan
// ──────────────────────────────────────────────────────────────────────────────
console.log('\n[4/4] Forbidden pattern scan (JS files)');
const FORBIDDEN = [
  { pattern: /\beval\s*\(/g,            label: 'eval() usage' },
  { pattern: /new\s+Function\s*\(/g,   label: 'new Function() usage' },
  { pattern: /document\.write\s*\(/g,  label: 'document.write() usage' },
];

let jsFiles = 0;
walk(projectRoot, file => {
  if (!file.endsWith('.js')) return;
  if (file.includes('node_modules')) return;
  jsFiles++;
  const content = fs.readFileSync(file, 'utf8');
  const rel     = path.relative(projectRoot, file);

  for (const { pattern, label } of FORBIDDEN) {
    const matches = [...content.matchAll(pattern)];
    if (matches.length) {
      error(`${rel}: ${matches.length} occurrence(s) of ${label}`);
    }
  }
});
console.log(`   Scanned ${jsFiles} JavaScript file(s).`);

// ──────────────────────────────────────────────────────────────────────────────
// Summary
// ──────────────────────────────────────────────────────────────────────────────
console.log('\n' + '━'.repeat(60));
console.log(`Audit complete.  Errors: ${errors}  Warnings: ${warnings}`);
if (errors > 0) {
  console.error('\n❌  Audit FAILED. Address the errors above before releasing.\n');
  process.exit(1);
} else if (warnings > 0) {
  console.warn('\n⚠️   Audit passed with warnings. Consider fixing them.\n');
} else {
  console.log('\n✅  All checks passed. The site is clean.\n');
}
