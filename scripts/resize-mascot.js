// Downscale the transparent mascot PNG for web use — 1254x1254 is massive for a 108px icon.
// Box-filter downsample (average each NxN block) to keep it reasonably smooth, then let pngjs
// re-encode (which also tends to compress better than the original export).
const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const SRC = path.join(__dirname, '..', 'assets', 'mascot-earth-buddy-transparent.png');
const OUT = path.join(__dirname, '..', 'assets', 'mascot-earth-buddy-transparent-web.png');
const TARGET = 320; // renders at 108px in the widget; 320 covers retina (~3x) with margin

const src = PNG.sync.read(fs.readFileSync(SRC));
const { width: sw, height: sh, data: sd } = src;

const out = new PNG({ width: TARGET, height: TARGET });
const scale = sw / TARGET;

for (let y = 0; y < TARGET; y++) {
  const sy0 = Math.floor(y * scale);
  const sy1 = Math.min(sh, Math.floor((y + 1) * scale) || sy0 + 1);
  for (let x = 0; x < TARGET; x++) {
    const sx0 = Math.floor(x * scale);
    const sx1 = Math.min(sw, Math.floor((x + 1) * scale) || sx0 + 1);

    let r = 0, g = 0, b = 0, a = 0, aWeighted = 0, n = 0;
    for (let sy = sy0; sy < sy1; sy++) {
      for (let sx = sx0; sx < sx1; sx++) {
        const si = (sy * sw + sx) * 4;
        const alpha = sd[si + 3];
        r += sd[si] * alpha;
        g += sd[si + 1] * alpha;
        b += sd[si + 2] * alpha;
        a += alpha;
        n++;
      }
    }
    const di = (y * TARGET + x) * 4;
    if (a > 0) {
      out.data[di] = Math.round(r / a);
      out.data[di + 1] = Math.round(g / a);
      out.data[di + 2] = Math.round(b / a);
    }
    out.data[di + 3] = Math.round(a / n);
  }
}

fs.writeFileSync(OUT, PNG.sync.write(out, { colorType: 6 }));
const srcSize = fs.statSync(SRC).size;
const outSize = fs.statSync(OUT).size;
console.log('Source:', (srcSize / 1024).toFixed(0) + 'KB', sw + 'x' + sh);
console.log('Output:', (outSize / 1024).toFixed(0) + 'KB', TARGET + 'x' + TARGET);
console.log('Reduction:', (100 - (100 * outSize) / srcSize).toFixed(1) + '%');
