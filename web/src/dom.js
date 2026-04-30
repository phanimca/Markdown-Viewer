import { Modal } from 'bootstrap';

export const dom = {};

export function initDom() {
  dom.markdownEditor = document.getElementById("markdown-editor");
  dom.markdownPreview = document.getElementById("markdown-preview");
  dom.themeToggle = document.getElementById("theme-toggle");
  dom.openButton = document.getElementById("open-button");
  dom.openLocalBtn = document.getElementById("open-local");
  dom.openSharepointBtn = document.getElementById("open-sharepoint");
  dom.openAdoBtn = document.getElementById("open-ado");
  dom.saveButton = document.getElementById("save-button");
  dom.reloadButton = document.getElementById("reload-button");
  dom.insertAdoTocButton = document.getElementById("insert-ado-toc");
  dom.insertAdoNoteButton = document.getElementById("insert-ado-note");
  dom.fileInput = document.getElementById("file-input");
  dom.exportMd = document.getElementById("export-md");
  dom.exportHtml = document.getElementById("export-html");
  dom.exportPdf = document.getElementById("export-pdf");
  dom.copyMarkdownButton = document.getElementById("copy-markdown-button");
  dom.dropzone = document.getElementById("dropzone");
  dom.closeDropzoneBtn = document.getElementById("close-dropzone");
  dom.toggleSyncButton = document.getElementById("toggle-sync");
  dom.editorPane = document.getElementById("markdown-editor");
  dom.previewPane = document.querySelector(".preview-pane");
  dom.readingTimeElement = document.getElementById("reading-time");
  dom.wordCountElement = document.getElementById("word-count");
  dom.charCountElement = document.getElementById("char-count");
  dom.contentContainer = document.querySelector(".content-container");
  dom.viewModeButtons = document.querySelectorAll(".view-mode-btn");
  dom.mobileViewModeButtons = document.querySelectorAll(".mobile-view-mode-btn");
  dom.resizeDivider = document.querySelector(".resize-divider");
  dom.editorPaneElement = document.querySelector(".editor-pane");
  dom.previewPaneElement = document.querySelector(".preview-pane");
  dom.mobileMenuToggle = document.getElementById("mobile-menu-toggle");
  dom.mobileMenuPanel = document.getElementById("mobile-menu-panel");
  dom.mobileMenuOverlay = document.getElementById("mobile-menu-overlay");
  dom.mobileCloseMenu = document.getElementById("close-mobile-menu");
  dom.mobileReadingTime = document.getElementById("mobile-reading-time");
  dom.mobileWordCount = document.getElementById("mobile-word-count");
  dom.mobileCharCount = document.getElementById("mobile-char-count");
  dom.mobileToggleSync = document.getElementById("mobile-toggle-sync");
  dom.mobileOpenLocalBtn = document.getElementById("mobile-open-local");
  dom.mobileOpenSharepointBtn = document.getElementById("mobile-open-sharepoint");
  dom.mobileOpenAdoBtn = document.getElementById("mobile-open-ado");
  dom.mobileSaveBtn = document.getElementById("mobile-save-button");
  dom.mobileReloadBtn = document.getElementById("mobile-reload-button");
  dom.mobileInsertAdoTocBtn = document.getElementById("mobile-insert-ado-toc");
  dom.mobileInsertAdoNoteBtn = document.getElementById("mobile-insert-ado-note");
  dom.mobileExportMd = document.getElementById("mobile-export-md");
  dom.mobileExportHtml = document.getElementById("mobile-export-html");
  dom.mobileExportPdf = document.getElementById("mobile-export-pdf");
  dom.mobileCopyMarkdown = document.getElementById("mobile-copy-markdown");
  dom.mobileThemeToggle = document.getElementById("mobile-theme-toggle");

  // Modal form elements
  dom.sharepointUrlInput = document.getElementById("sharepoint-url");
  dom.sharepointImportBtn = document.getElementById("sharepoint-import-btn");
  dom.sharepointError = document.getElementById("sharepoint-error");
  dom.adoOrgInput = document.getElementById("ado-org");
  dom.adoProjectInput = document.getElementById("ado-project");
  dom.adoRepoInput = document.getElementById("ado-repo");
  dom.adoBranchInput = document.getElementById("ado-branch");
  dom.adoPathInput = document.getElementById("ado-path");
  dom.adoPatInput = document.getElementById("ado-pat");
  dom.adoError = document.getElementById("ado-error");
  dom.adoImportBtn = document.getElementById("ado-import-btn");

  // Bootstrap Modal instances
  dom.sharepointImportModal = new Modal(document.getElementById("sharepoint-import-modal"));
  dom.adoImportModal = new Modal(document.getElementById("ado-import-modal"));
}
