// Stage indicator overlay — reads/writes the DOM panel in index.html.
const el = () => document.getElementById('stage-indicator');

export function setStage(num, name) {
  const node = el();
  if (!node) return;
  node.innerHTML = `<span class="stage-num">Stage ${num}</span> · ${name}`;
}

export function setRaw(html) {
  const node = el();
  if (!node) return;
  node.innerHTML = html;
}

export function show() {
  const node = el();
  if (node) node.style.opacity = '1';
}
