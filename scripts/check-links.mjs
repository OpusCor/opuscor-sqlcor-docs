#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { globSync } from 'glob';

const dist = path.resolve('dist');
const files = globSync('dist/**/*.html');

let brokenCount = 0;

for (const file of files) {
  const content = fs.readFileSync(file, 'utf-8');
  const links = [...content.matchAll(/href="([^"]+)"/g)].map((m) => m[1]);

  for (const link of links) {
    if (link.startsWith('/') && !link.startsWith('//')) {
      const target = path.join(dist, link.split('?')[0].split('#')[0]);
      if (!fs.existsSync(target) && !link.endsWith('.html')) {
        if (!fs.existsSync(target + '/index.html')) {
          console.error(`Broken link in ${file}: ${link}`);
          brokenCount++;
        }
      }
    }
  }
}

if (brokenCount > 0) process.exit(1);
console.log('All internal links verified.');
