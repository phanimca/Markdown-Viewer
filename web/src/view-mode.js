import { state, MIN_PANE_PERCENT } from './state.js';
import { dom } from './dom.js';
import { renderMarkdown } from './render.js';
import { invalidateSyncAnchors } from './scroll-sync.js';

export function setViewMode(mode) {
  if (mode === state.currentViewMode) return;

  const previousMode = state.currentViewMode;
  state.currentViewMode = mode;

  dom.contentContainer.classList.remove('view-editor-only', 'view-preview-only', 'view-split');
  dom.contentContainer.classList.add('view-' + (mode === 'editor' ? 'editor-only' : mode === 'preview' ? 'preview-only' : 'split'));

  dom.viewModeButtons.forEach(btn => {
    const btnMode = btn.getAttribute('data-mode');
    if (btnMode === mode) {
      btn.classList.add('active');
      btn.setAttribute('aria-pressed', 'true');
    } else {
      btn.classList.remove('active');
      btn.setAttribute('aria-pressed', 'false');
    }
  });

  dom.mobileViewModeButtons.forEach(btn => {
    const btnMode = btn.getAttribute('data-mode');
    if (btnMode === mode) {
      btn.classList.add('active');
      btn.setAttribute('aria-pressed', 'true');
    } else {
      btn.classList.remove('active');
      btn.setAttribute('aria-pressed', 'false');
    }
  });

  updateSyncToggleVisibility(mode);

  if (mode === 'split') {
    applyPaneWidths();
  } else if (previousMode === 'split') {
    resetPaneWidths();
  }

  if (mode === 'split' || mode === 'preview') {
    renderMarkdown();
  }
}

export function updateSyncToggleVisibility(mode) {
  const isSplitView = mode === 'split';

  if (dom.toggleSyncButton) {
    dom.toggleSyncButton.style.display = isSplitView ? '' : 'none';
    dom.toggleSyncButton.setAttribute('aria-hidden', !isSplitView);
  }

  if (dom.mobileToggleSync) {
    dom.mobileToggleSync.style.display = isSplitView ? '' : 'none';
    dom.mobileToggleSync.setAttribute('aria-hidden', !isSplitView);
  }
}

export function applyPaneWidths() {
  if (state.currentViewMode !== 'split') return;

  const previewPercent = 100 - state.editorWidthPercent;
  dom.editorPaneElement.style.flex = `0 0 calc(${state.editorWidthPercent}% - 4px)`;
  dom.previewPaneElement.style.flex = `0 0 calc(${previewPercent}% - 4px)`;
}

export function resetPaneWidths() {
  dom.editorPaneElement.style.flex = '';
  dom.previewPaneElement.style.flex = '';
}

function startResize(e) {
  if (state.currentViewMode !== 'split') return;
  e.preventDefault();
  state.isResizing = true;
  dom.resizeDivider.classList.add('dragging');
  document.body.classList.add('resizing');
}

function startResizeTouch(e) {
  if (state.currentViewMode !== 'split') return;
  e.preventDefault();
  state.isResizing = true;
  dom.resizeDivider.classList.add('dragging');
  document.body.classList.add('resizing');
}

function handleResize(e) {
  if (!state.isResizing) return;

  const containerRect = dom.contentContainer.getBoundingClientRect();
  const containerWidth = containerRect.width;
  const mouseX = e.clientX - containerRect.left;

  let newEditorPercent = (mouseX / containerWidth) * 100;
  newEditorPercent = Math.max(MIN_PANE_PERCENT, Math.min(100 - MIN_PANE_PERCENT, newEditorPercent));

  state.editorWidthPercent = newEditorPercent;
  applyPaneWidths();
}

function handleResizeTouch(e) {
  if (!state.isResizing || !e.touches[0]) return;

  const containerRect = dom.contentContainer.getBoundingClientRect();
  const containerWidth = containerRect.width;
  const touchX = e.touches[0].clientX - containerRect.left;

  let newEditorPercent = (touchX / containerWidth) * 100;
  newEditorPercent = Math.max(MIN_PANE_PERCENT, Math.min(100 - MIN_PANE_PERCENT, newEditorPercent));

  state.editorWidthPercent = newEditorPercent;
  applyPaneWidths();
}

function stopResize() {
  if (!state.isResizing) return;
  state.isResizing = false;
  dom.resizeDivider.classList.remove('dragging');
  document.body.classList.remove('resizing');
}

export function initResizer() {
  if (!dom.resizeDivider) return;

  dom.resizeDivider.addEventListener('mousedown', startResize);
  document.addEventListener('mousemove', handleResize);
  document.addEventListener('mouseup', stopResize);

  dom.resizeDivider.addEventListener('touchstart', startResizeTouch);
  document.addEventListener('touchmove', handleResizeTouch);
  document.addEventListener('touchend', stopResize);

  dom.resizeDivider.addEventListener('keydown', function (e) {
    if (state.currentViewMode !== 'split') return;
    const STEP = 5;
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      state.editorWidthPercent = Math.max(MIN_PANE_PERCENT, state.editorWidthPercent - STEP);
      applyPaneWidths();
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      state.editorWidthPercent = Math.min(100 - MIN_PANE_PERCENT, state.editorWidthPercent + STEP);
      applyPaneWidths();
    }
  });
}

export function openMobileMenu() {
  dom.mobileMenuPanel.classList.add("active");
  dom.mobileMenuOverlay.classList.add("active");
}

export function closeMobileMenu() {
  dom.mobileMenuPanel.classList.remove("active");
  dom.mobileMenuOverlay.classList.remove("active");
}
