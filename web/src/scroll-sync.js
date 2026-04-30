import { state, SCROLL_SYNC_DELAY } from './state.js';
import { dom } from './dom.js';

export function invalidateSyncAnchors() {
  state.syncAnchorsCache = null;
}

export function measureEditorLineOffsets(lineIndices) {
  if (lineIndices.length === 0) return [];

  const mirror = document.createElement('div');
  const cs = window.getComputedStyle(dom.editorPane);
  [
    'fontFamily', 'fontSize', 'fontWeight', 'fontStyle', 'fontVariant',
    'lineHeight', 'letterSpacing', 'wordSpacing', 'textIndent',
    'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
    'borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth',
    'boxSizing'
  ].forEach(p => { mirror.style[p] = cs[p]; });

  mirror.style.width = dom.editorPane.clientWidth + 'px';
  mirror.style.position = 'absolute';
  mirror.style.visibility = 'hidden';
  mirror.style.top = '-9999px';
  mirror.style.left = '-9999px';
  mirror.style.whiteSpace = 'pre-wrap';
  mirror.style.overflowWrap = 'break-word';
  mirror.style.overflow = 'hidden';
  mirror.style.height = 'auto';

  document.body.appendChild(mirror);

  const lines = dom.markdownEditor.value.split('\n');
  const results = [];

  for (const idx of lineIndices) {
    const textBefore = lines.slice(0, idx).join('\n');
    mirror.textContent = textBefore ? textBefore + '\n' : '';
    results.push(mirror.scrollHeight);
  }

  document.body.removeChild(mirror);
  return results;
}

function previewAbsoluteTop(el) {
  const rect = el.getBoundingClientRect();
  const paneRect = dom.previewPane.getBoundingClientRect();
  return dom.previewPane.scrollTop + (rect.top - paneRect.top);
}

function buildSyncAnchors() {
  if (state.syncAnchorsCache) return state.syncAnchorsCache;

  const lines = dom.markdownEditor.value.split('\n');
  const editorScrollMax = dom.editorPane.scrollHeight - dom.editorPane.clientHeight;
  const previewScrollMax = dom.previewPane.scrollHeight - dom.previewPane.clientHeight;

  if (editorScrollMax < 1 || previewScrollMax < 1) {
    state.syncAnchorsCache = [{ editorPx: 0, previewPx: 0 }];
    return state.syncAnchorsCache;
  }

  const headingLineIndices = [];
  for (let i = 0; i < lines.length; i++) {
    if (/^#{1,6}\s/.test(lines[i])) headingLineIndices.push(i);
  }

  const previewHeadings = Array.from(
    dom.markdownPreview.querySelectorAll('h1,h2,h3,h4,h5,h6')
  );

  const anchors = [{ editorPx: 0, previewPx: 0 }];
  const count = Math.min(headingLineIndices.length, previewHeadings.length);

  if (count > 0) {
    const editorOffsets = measureEditorLineOffsets(headingLineIndices.slice(0, count));

    for (let i = 0; i < count; i++) {
      const editorPx = Math.min(editorOffsets[i], editorScrollMax);
      const previewPx = Math.min(previewAbsoluteTop(previewHeadings[i]), previewScrollMax);
      const last = anchors[anchors.length - 1];
      if (editorPx > last.editorPx && previewPx >= last.previewPx) {
        anchors.push({ editorPx, previewPx });
      }
    }
  }

  anchors.push({ editorPx: editorScrollMax, previewPx: previewScrollMax });
  state.syncAnchorsCache = anchors;
  return anchors;
}

function piecewiseMap(anchors, fromKey, toKey, value) {
  if (anchors.length === 0) return 0;
  if (value <= anchors[0][fromKey]) return anchors[0][toKey];
  const last = anchors[anchors.length - 1];
  if (value >= last[fromKey]) return last[toKey];

  for (let i = 0; i < anchors.length - 1; i++) {
    const a = anchors[i], b = anchors[i + 1];
    if (value >= a[fromKey] && value <= b[fromKey]) {
      const span = b[fromKey] - a[fromKey];
      const r = span > 0 ? (value - a[fromKey]) / span : 0;
      return a[toKey] + r * (b[toKey] - a[toKey]);
    }
  }
  return last[toKey];
}

export function syncEditorToPreview() {
  if (!state.syncScrollingEnabled || state.isPreviewScrolling) return;

  state.isEditorScrolling = true;
  clearTimeout(state.scrollSyncTimeout);

  state.scrollSyncTimeout = setTimeout(() => {
    const anchors = buildSyncAnchors();
    const target = piecewiseMap(anchors, 'editorPx', 'previewPx', dom.editorPane.scrollTop);
    const previewScrollMax = dom.previewPane.scrollHeight - dom.previewPane.clientHeight;

    if (isFinite(target)) {
      dom.previewPane.scrollTop = Math.max(0, Math.min(target, previewScrollMax));
    }
    setTimeout(() => { state.isEditorScrolling = false; }, 50);
  }, SCROLL_SYNC_DELAY);
}

export function syncPreviewToEditor() {
  if (!state.syncScrollingEnabled || state.isEditorScrolling) return;

  state.isPreviewScrolling = true;
  clearTimeout(state.scrollSyncTimeout);

  state.scrollSyncTimeout = setTimeout(() => {
    const anchors = buildSyncAnchors();
    const target = piecewiseMap(anchors, 'previewPx', 'editorPx', dom.previewPane.scrollTop);
    const editorScrollMax = dom.editorPane.scrollHeight - dom.editorPane.clientHeight;

    if (isFinite(target)) {
      dom.editorPane.scrollTop = Math.max(0, Math.min(target, editorScrollMax));
    }
    setTimeout(() => { state.isPreviewScrolling = false; }, 50);
  }, SCROLL_SYNC_DELAY);
}

export function syncEditorClickToPreview() {
  if (!state.syncScrollingEnabled) return;

  const textBefore = dom.markdownEditor.value.substring(0, dom.markdownEditor.selectionStart);
  const lineIndex = textBefore.split('\n').length - 1;
  const offsets = measureEditorLineOffsets([lineIndex]);
  const editorPx = offsets[0];
  const anchors = buildSyncAnchors();
  const target = piecewiseMap(anchors, 'editorPx', 'previewPx', editorPx);
  const previewScrollMax = dom.previewPane.scrollHeight - dom.previewPane.clientHeight;

  if (isFinite(target)) {
    state.isEditorScrolling = true;
    dom.previewPane.scrollTop = Math.max(0, Math.min(target, previewScrollMax));
    setTimeout(() => { state.isEditorScrolling = false; }, 100);
  }
}

export function syncPreviewClickToEditor(event) {
  if (!state.syncScrollingEnabled) return;

  const paneRect = dom.previewPane.getBoundingClientRect();
  const clickedPreviewPx = dom.previewPane.scrollTop + (event.clientY - paneRect.top);
  const anchors = buildSyncAnchors();
  const target = piecewiseMap(anchors, 'previewPx', 'editorPx', clickedPreviewPx);
  const editorScrollMax = dom.editorPane.scrollHeight - dom.editorPane.clientHeight;

  if (isFinite(target)) {
    state.isPreviewScrolling = true;
    dom.editorPane.scrollTop = Math.max(0, Math.min(target, editorScrollMax));
    setTimeout(() => { state.isPreviewScrolling = false; }, 100);
  }
}

export function toggleSyncScrolling() {
  state.syncScrollingEnabled = !state.syncScrollingEnabled;
  const buttons = [
    { el: dom.toggleSyncButton, mobile: false },
    { el: dom.mobileToggleSync, mobile: true }
  ].filter(b => b.el);
  if (state.syncScrollingEnabled) {
    buttons.forEach(({ el, mobile }) => {
      el.innerHTML = `<i class="bi bi-link-45deg${mobile ? ' me-2' : ''}"></i> Sync On`;
      el.classList.add("sync-enabled", "border-primary");
      el.classList.remove("sync-disabled");
    });
  } else {
    buttons.forEach(({ el, mobile }) => {
      el.innerHTML = `<i class="bi bi-link${mobile ? ' me-2' : ''}"></i> Sync Off`;
      el.classList.add("sync-disabled");
      el.classList.remove("sync-enabled", "border-primary");
    });
  }
}
