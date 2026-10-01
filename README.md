# MakeWorlds Showcase

A technical report on image-based Gaussian reconstruction, with a system overview,
public scene studies, image comparisons and evaluation methodology.

**Website:** [jumuxyz.github.io/makeworlds-showcase](https://jumuxyz.github.io/makeworlds-showcase/)

## Run locally

Requires Node.js 24 or newer. No npm dependencies are needed.

```sh
npm run check
npm run dev
```

Open `http://127.0.0.1:5187/makeworlds-showcase/`. To use another port,
run `npm run dev -- --port=5188`.

`npm run build` creates the static site in `dist/`. The **Publish Pages** workflow
builds and deploys that directory when triggered manually in GitHub Actions.

## Contents

- `src/`: report, responsive styles, comparison interaction and image assets.
- `data/results.json`: frozen measurements for Train, Dr Johnson and Playroom.
- `data/sources.json`: dataset attribution, image provenance and source hashes.
- `scripts/`: build, validation and local preview commands.

The selected experiments cover three platforms and retain PSNR, SSIM and LPIPS
for every included platform run. Paper-reference comparisons and cross-platform
variation use separate evaluation protocols, described in the report.

## Sources

Images and measurements are tied to the recorded MakeWorlds candidate and runs.
Dataset attribution is retained in the provenance file. The repository contains
publication images, not the original datasets or the MakeWorlds product implementation.

- [3D Gaussian Splatting](https://repo-sam.inria.fr/fungraph/3d-gaussian-splatting/)
- [Tanks and Temples](https://www.tanksandtemples.org/)
- [Deep Blending](https://repo-sam.inria.fr/fungraph/deep-blending/)
- [MakeWorlds](https://www.makeworlds.net/)
