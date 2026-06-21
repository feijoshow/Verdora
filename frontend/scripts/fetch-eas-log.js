const { execSync } = require('child_process');
const fs = require('fs');
const https = require('https');
const zlib = require('zlib');

const buildId = process.argv[2] || '299fa3e4-ed2e-47ef-8550-8df16cae797a';
const raw = execSync(`npx eas-cli build:view ${buildId} --json`, {
  encoding: 'utf8',
  stdio: ['pipe', 'pipe', 'ignore'],
});
const json = JSON.parse(raw);
const url = json.logFiles?.[0];
if (!url) {
  console.error('No log URL');
  process.exit(1);
}

https.get(url, (res) => {
  const chunks = [];
  res.on('data', (c) => chunks.push(c));
  res.on('end', () => {
    const buf = Buffer.concat(chunks);
    let text;
    try {
      text = zlib.gunzipSync(buf).toString('utf8');
    } catch {
      try {
        text = zlib.inflateSync(buf).toString('utf8');
      } catch {
        text = buf.toString('utf8');
      }
    }
    const out = require('path').join(__dirname, '..', 'eas-build-log.txt');
    fs.writeFileSync(out, text);
    const lines = text.split('\n');
    const hits = lines.filter((l) =>
      /FAILURE|error:|Error:|What went wrong|Execution failed|No matching variant|Could not resolve/i.test(l),
    );
    console.log(hits.slice(-40).join('\n') || lines.slice(-60).join('\n'));
  });
});
