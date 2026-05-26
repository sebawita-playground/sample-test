'use strict';

// Mock build step: copies src/ into dist/ and writes a build manifest.
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const srcDir = path.join(root, 'src');
const distDir = path.join(root, 'dist');

function copyDir(from, to) {
  fs.mkdirSync(to, { recursive: true });
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const fromPath = path.join(from, entry.name);
    const toPath = path.join(to, entry.name);
    if (entry.isDirectory()) {
      copyDir(fromPath, toPath);
    } else {
      fs.copyFileSync(fromPath, toPath);
    }
  }
}

fs.rmSync(distDir, { recursive: true, force: true });
copyDir(srcDir, distDir);

const manifest = {
  name: 'sample-tests',
  builtAt: new Date().toISOString(),
  node: process.version,
  commit: process.env.GITHUB_SHA || 'local',
};
fs.writeFileSync(
  path.join(distDir, 'build-manifest.json'),
  JSON.stringify(manifest, null, 2) + '\n',
);

console.log('Build complete:', manifest);
