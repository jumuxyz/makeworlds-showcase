import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

export const root = fileURLToPath(new URL('../', import.meta.url));
const escape = value => String(value).replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[char]);

export async function build() {
  const data = JSON.parse(await readFile(resolve(root, 'data/results.json'), 'utf8'));
  let html = await readFile(resolve(root, 'src/index.html'), 'utf8');
  const cells = row => `<td>${row.psnr.toFixed(3)}</td><td>${row.ssim.toFixed(4)}</td><td>${row.lpips.toFixed(4)}</td>`;
  const rows = data.scenes.map(scene => {
    const records = [{ platform: 'Paper reference', ...scene.paper }, ...scene.platforms];
    return '<tbody>' + records.map((record, i) =>
      `<tr${i === 0 ? ' class="baseline"' : ''}><th scope="row">${escape(scene.name)}</th><td>${escape(record.platform)}</td>${cells(record)}</tr>`
    ).join('\n') + '</tbody>';
  }).join('\n');
  const spreads = data.scenes.map(scene =>
    `<div class="spread"><h4>${escape(scene.name)}</h4><p>${scene.crossPlatform.psnr.toFixed(3)} <small>dB</small></p></div>`
  ).join('\n');
  const replacements = { DATE: escape(data.testedAt), CANDIDATE: escape(data.candidate), RESULT_ROWS: rows, SPREADS: spreads };
  html = html.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    if (!(key in replacements)) throw new Error(`Unknown template field: ${key}`);
    return replacements[key];
  });
  const dist = resolve(root, 'dist');
  await rm(dist, { recursive: true, force: true });
  await mkdir(resolve(dist, 'data'), { recursive: true });
  await cp(resolve(root, 'src/assets'), resolve(dist, 'assets'), { recursive: true });
  for (const name of ['results.json', 'sources.json']) {
    await cp(resolve(root, 'data', name), resolve(dist, 'data', name));
  }
  await writeFile(resolve(dist, 'index.html'), html);
  await writeFile(resolve(dist, '.nojekyll'), '');
  return { dist, html, data };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const { dist } = await build();
  console.log(`Built ${dist}`);
}
