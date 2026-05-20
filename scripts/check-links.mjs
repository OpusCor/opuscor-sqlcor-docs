#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { globSync } from 'glob';

// Run after build
const dist = path.resolve('dist');
const files = globSync('dist/**/*.html');
let broken = 0;

for (const file of files) {
  const content = fs.readFileSync(file, 'utf-8');
  const links = [...content.matchAll(/href="([^"]+)"/g)].map((m) => m[1]);
  for (const link of links) {
    if (link.startsWith('/') && !link.startsWith('//') && !link.startsWith('/_astro')) {
      const target = path.join(dist, link.split('?')[0].split('#')[0]);
      if (!fs.existsSync(target) && !fs.existsSync(target + '/index.html')) {
        console.error(`Broken link in ${file}: ${link}`);
        broken++;
      }
    }
  }
}
process.exit(broken > 0 ? 1 : 0);
