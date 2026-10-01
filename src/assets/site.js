const comparison = document.querySelector('#comparison');
const controls = document.querySelector('.comparison-controls');
const split = document.querySelector('#split');
const views = {
  front: { id: 'view-000009', label: 'front and body' },
  diagonal: { id: 'view-000057', label: 'oblique overview' },
  side: { id: 'view-000249', label: 'side texture' },
};

if (comparison && controls && split) {
  const status = document.querySelector('.comparison-status');
  const renderImage = document.querySelector('#render-image');
  const photoImage = document.querySelector('#photo-image');
  const renderSplit = () => {
    comparison.style.setProperty('--split', `${split.value}%`);
    split.setAttribute('aria-valuetext', `Original photograph ${split.value}% · MakeWorlds render ${100 - Number(split.value)}%`);
  };
  split.addEventListener('input', renderSplit);

  const moveDivider = event => {
    const bounds = comparison.getBoundingClientRect();
    split.value = String(Math.round(Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width)) * 100));
    renderSplit();
  };
  split.addEventListener('pointerdown', event => {
    if (event.button !== 0 || !event.isPrimary) return;
    if (event.pointerType !== 'touch') event.preventDefault();
    split.focus({ preventScroll: true });
    split.setPointerCapture(event.pointerId);
    moveDivider(event);
  });
  split.addEventListener('pointermove', event => {
    if (split.hasPointerCapture(event.pointerId)) moveDivider(event);
  });
  for (const type of ['pointerup', 'pointercancel']) split.addEventListener(type, event => {
    if (split.hasPointerCapture(event.pointerId)) split.releasePointerCapture(event.pointerId);
  });

  // Keep each reference/render pair together, including while a new view loads.
  let revision = 0;
  const selectView = async key => {
    const current = ++revision;
    const view = views[key];
    comparison.setAttribute('aria-busy', 'true');
    status.textContent = '';
    try {
      const pair = await Promise.all(['render', 'photo'].map(async kind => {
        const image = new Image();
        image.src = `./assets/images/train-${key}-${kind}.webp`;
        await image.decode();
        return image;
      }));
      if (current !== revision) return;
      [renderImage.src, photoImage.src] = pair.map(image => image.src);
      renderImage.alt = `MakeWorlds render of Train, ${view.label}`;
      photoImage.alt = `Original photograph of Train, ${view.label}`;
      document.querySelector('#view-caption').textContent = `Mac · ${view.id}`;
      split.setAttribute('aria-label', `Photo and render divider, ${view.label}`);
      for (const button of document.querySelectorAll('[data-view]')) {
        button.setAttribute('aria-pressed', String(button.dataset.view === key));
      }
      comparison.classList.add('enhanced');
      split.hidden = false;
      renderSplit();
    } catch {
      if (current === revision) status.textContent = 'This image pair could not be loaded. Select another view or try again.';
    } finally {
      if (current === revision) comparison.removeAttribute('aria-busy');
    }
  };
  controls.hidden = false;
  for (const button of document.querySelectorAll('[data-view]')) {
    button.addEventListener('click', () => { void selectView(button.dataset.view); });
  }
  void selectView('front');
}
