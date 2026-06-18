const fs = require('fs');
const path = require('path');

const outFile = process.argv[2];
const raw = fs.readFileSync(outFile, 'utf8');
const data = JSON.parse(raw);
const arr = Array.isArray(data) ? data : (data.result || data.results || []);

function normalize(s) {
  s = String(s).trim().replace(/^```html\s*/i, '').replace(/^```\s*/, '').replace(/```\s*$/, '').trim();
  if (/^&lt;/i.test(s)) {
    s = s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
         .replace(/&#0?39;/g, "'").replace(/&#x27;/gi, "'").replace(/&nbsp;/g, ' ')
         .replace(/&amp;/g, '&');
  }
  return s;
}

const base = path.join('c:/Users/clean/Documents/NCF SITE/NCF-Test-Website/_work/hero-icons-v2');
const summary = [];
for (const item of arr) {
  const dir = path.join(base, item.key);
  fs.mkdirSync(dir, { recursive: true });
  const html = normalize(item.html);
  fs.writeFileSync(path.join(dir, 'index.html'), html, 'utf8');
  summary.push(`${item.key}: ${html.length} chars | starts "${html.slice(0, 22).replace(/\n/g, ' ')}" | rationale: ${item.rationale}`);
}
console.log(summary.join('\n\n'));
