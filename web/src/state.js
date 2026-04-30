export const RENDER_DELAY = 100;
export const SCROLL_SYNC_DELAY = 10;
export const MIN_PANE_PERCENT = 20;

export const PAGE_CONFIG = {
  a4Width: 210,
  a4Height: 297,
  margin: 15,
  contentWidth: 180,
  contentHeight: 267,
  windowWidth: 1000,
  scale: 2
};

export const PAGE_BREAK_THRESHOLD = 0.3;
export const MIN_SCALE_FACTOR = 0.5;
export const PDF_FONT_STACK = '"Georgia", "Times New Roman", Times, serif';

export const SANITIZE_CONFIG = {
  ADD_TAGS: ['mjx-container'],
  ADD_ATTR: ['id', 'class', 'style']
};

export const SANITIZE_CONFIG_PDF = {
  ADD_TAGS: ['mjx-container', 'svg', 'path', 'g', 'marker', 'defs', 'pattern', 'clipPath'],
  ADD_ATTR: ['id', 'class', 'style', 'viewBox', 'd', 'fill', 'stroke', 'transform', 'marker-end', 'marker-start']
};

export const state = {
  markdownRenderTimeout: null,
  syncScrollingEnabled: true,
  isEditorScrolling: false,
  isPreviewScrolling: false,
  scrollSyncTimeout: null,
  currentViewMode: 'split',
  isResizing: false,
  editorWidthPercent: 50,
  currentFileName: 'document.md',
  currentFileHandle: null,
  syncAnchorsCache: null,
};
