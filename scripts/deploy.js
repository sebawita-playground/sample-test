'use strict';

// Mock deployment step: pretends to ship the contents of dist/ somewhere.
const fs = require('node:fs');
const path = require('node:path');

const distDir = path.resolve(__dirname, '..', 'dist');

if (!fs.existsSync(distDir)) {
  console.error('No dist/ directory found. Run `npm run build` first.');
  process.exit(1);
}

const manifestPath = path.join(distDir, 'build-manifest.json');
const manifest = fs.existsSync(manifestPath)
  ? JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
  : {};

const target = process.env.DEPLOY_TARGET || 'staging';

console.log(`🚀 Mock deploying sample-tests to "${target}"...`);
console.log('   Build manifest:', manifest);

// Simulate work
const start = Date.now();
while (Date.now() - start < 250) {
  /* pretend to upload */
}

console.log(`✅ Deployment to "${target}" complete.`);
