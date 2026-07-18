// One-off: chroma-key the white studio background out of mascot-earth-buddy.png,
// using a border flood-fill so interior white details (eyes, shoe soles) are untouched.
const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const SRC = path.join(__dirname, '..', 'assets', 'mascot-earth-buddy.png');
const OUT = path.join(__dirname, '..', 'assets', 'mascot-earth-buddy-transparent.png');
const WHITE_THRESHOLD = 238;

const png = PNG.sync.read(fs.readFileSync(SRC));
const { width, height, data } = png;

const isBg = (idx) => data[idx] >= WHITE_THRESHOLD && data[idx + 1] >= WHITE_THRESHOLD && data[idx + 2] >= WHITE_THRESHOLD;

const visited = new Uint8Array(width * height);
const queue = [];

for (let x = 0; x < width; x++) {
  queue.push(x, 0);
  queue.push(x, height - 1);
}
for (let y = 0; y < height; y++) {
  queue.push(0, y);
  queue.push(width - 1, y);
}

let qi = 0;
while (qi < queue.length) {
  const x = queue[qi++];
  const y = queue[qi++];
  if (x < 0 || y < 0 || x >= width || y >= height) continue;
  const p = y * width + x;
  if (visited[p]) continue;
  visited[p] = 1;
  const idx = p * 4;
  if (!isBg(idx)) continue;
  data[idx + 3] = 0; // transparent
  queue.push(x + 1, y, x - 1, y, x, y + 1, x, y - 1);
}

fs.writeFileSync(OUT, PNG.sync.write(png));
console.log('Done. Wrote transparent-background version to', OUT);
