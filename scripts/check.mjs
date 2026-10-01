import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { build, root } from './build.mjs';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const raw = await readFile(resolve(root, 'data/results.json'));
const data = JSON.parse(raw);
const sources = JSON.parse(await readFile(resolve(root, 'data/sources.json'), 'utf8'));
assert.equal(hash(raw), sources.results.sha256, 'Result snapshot changed; review and update its provenance');
assert.equal(data.schemaVersion, 1);
assert.match(data.candidate, /^[a-f0-9]{8,40}$/);
assert.match(data.testedAt, /^\d{4}-\d{2}-\d{2}$/);
assert.match(data.source.sha256, /^[a-f0-9]{64}$/);
assert.match(data.source.crossPlatformSha256, /^[a-f0-9]{64}$/);
assert.deepEqual(data.scenes.map(scene => scene.code), ['B-Train', 'B-DrJohnson', 'B-Playroom'], 'Review the editorial scope before changing selected scenes');
const metrics = row => {
  assert.ok(Number.isFinite(row.psnr) && row.psnr > 0);
  assert.ok(Number.isFinite(row.ssim) && row.ssim >= -1 && row.ssim <= 1);
  assert.ok(Number.isFinite(row.lpips) && row.lpips >= 0);
};
for (const scene of data.scenes) {
  assert.deepEqual(scene.platforms.map(row => row.platform).sort(), ['Linux', 'Mac', 'Windows']);
  metrics(scene.paper);
  for (const row of scene.platforms) {
    metrics(row);
    assert.ok(row.record.startsWith(scene.code + '-') && row.record.endsWith('.json'));
  }
  for (const value of Object.values(scene.crossPlatform)) assert.ok(Number.isFinite(value) && value >= 0);
}
assert.equal(sources.assets.length, 6);
let thumbnails = 0;
for (const asset of sources.assets) {
  assert.equal(asset.sample, 'B-Train');
  assert.equal(asset.candidate, data.candidate);
  assert.ok(asset.sourceSha256 && asset.selectionRule && asset.rights);
  const bytes = await readFile(resolve(root, 'src', asset.path));
  assert.equal(hash(bytes), asset.publicationSha256, `Image hash mismatch: ${asset.path}`);
  assert.equal(bytes.subarray(0, 4).toString(), 'RIFF');
  assert.equal(bytes.subarray(8, 12).toString(), 'WEBP');
  if (asset.thumbnail) {
    const thumbnail = await readFile(resolve(root, 'src', asset.thumbnail.path));
    assert.equal(hash(thumbnail), asset.thumbnail.sha256, `Thumbnail hash mismatch: ${asset.thumbnail.path}`);
    assert.equal(thumbnail.subarray(8, 12).toString(), 'WEBP');
    thumbnails++;
  }
}
assert.equal(thumbnails, 3);
assert.equal(hash(await readFile(resolve(root, 'src', sources.brand.file))), sources.brand.sha256);
for (const icon of sources.icons ?? []) {
  assert.equal(hash(await readFile(resolve(root, 'src', icon.file))), icon.sha256, `Icon hash mismatch: ${icon.file}`);
}

const { html, dist } = await build();
assert.ok(!html.includes('{{'), 'Unresolved template field');
const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
assert.equal(new Set(ids).size, ids.length, 'Duplicate HTML id');
for (const [, link] of html.matchAll(/\b(?:href|src)="([^"]+)"/g)) {
  if (/^https:\/\//.test(link)) continue;
  if (link.startsWith('#')) { assert.ok(ids.includes(link.slice(1)), `Missing anchor: ${link}`); continue; }
  assert.ok(link.startsWith('./'), `Use a project-relative URL: ${link}`);
  assert.ok(!link.includes('..'), `Unexpected parent path: ${link}`);
  const target = link === './' ? 'index.html' : link.slice(2);
  assert.ok((await stat(resolve(dist, target))).isFile(), `Missing local file: ${link}`);
}
assert.equal((html.match(/class="baseline"/g) || []).length, 3);
assert.ok(!/\/Users\/|172\.16\.|192\.168\.|localhost|127\.0\.0\.1/.test(html), 'Private host or path in page');
console.log('PASS: frozen results, 9 platform records, 6 image + 3 thumbnail hashes, provenance, generated tables, links and project-relative URLs.');
