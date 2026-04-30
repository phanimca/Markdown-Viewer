// CSS imports — Vite bundles these; MathJax stays on CDN in index.html
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import 'github-markdown-css/github-markdown.css';
import 'highlight.js/styles/github.min.css';
import '../styles.css';

// Bootstrap JS components
import { Dropdown } from 'bootstrap';

import { initDom, dom } from './dom.js';
import { renderMarkdown, debouncedRender, updateMobileStats } from './render.js';
import { initMermaid } from './mermaid-utils.js';
import { initResizer, setViewMode, openMobileMenu, closeMobileMenu } from './view-mode.js';
import {
  syncEditorToPreview, syncPreviewToEditor,
  syncEditorClickToPreview, syncPreviewClickToEditor,
  toggleSyncScrolling, invalidateSyncAnchors
} from './scroll-sync.js';
import {
  importMarkdownFile, openMarkdownFile, saveMarkdownFile, reloadFile,
  importFromSharePoint, importFromAdo,
  exportMarkdownFile, exportHtmlFile,
  insertAdoTocSnippet, insertAdoNoteSnippet,
  copyToClipboard
} from './import-export.js';
import { runPdfExport } from './pdf-export.js';

// Initialize DOM refs (module scripts are deferred — DOM is ready)
initDom();

// Initialize Bootstrap dropdowns explicitly
document.querySelectorAll('[data-bs-toggle="dropdown"]').forEach(el => {
  new Dropdown(el);
});

// Theme initialization
const prefersDarkMode = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
document.documentElement.setAttribute("data-theme", prefersDarkMode ? "dark" : "light");
dom.themeToggle.innerHTML = prefersDarkMode
  ? '<i class="bi bi-sun"></i>'
  : '<i class="bi bi-moon"></i>';

// Initialize Mermaid
try {
  initMermaid();
} catch (e) {
  console.warn("Mermaid initialization failed:", e);
}

// Sample markdown content
const sampleMarkdown = `# Welcome to Markdown Viewer

## ✨ Key Features
- **Live Preview** with GitHub styling
- **Smart Import/Export** (MD, HTML, PDF)
- **Mermaid Diagrams** for visual documentation
- **LaTeX Math Support** for scientific notation
- **Emoji Support** 😄 👍 🎉

## 💻 Code with Syntax Highlighting
\`\`\`javascript
  async function renderMarkdown() {
    const markdown = markdownEditor.value;
    const html = marked.parse(markdown);
    const sanitizedHtml = DOMPurify.sanitize(html);
    markdownPreview.innerHTML = sanitizedHtml;

    // Apply syntax highlighting to code blocks
    markdownPreview.querySelectorAll('pre code').forEach((block) => {
        hljs.highlightElement(block);
    });
  }
\`\`\`

## 🧮 Mathematical Expressions
Write complex formulas with LaTeX syntax:

Inline equation: $$E = mc^2$$

Display equations:
$$\\frac{\\partial f}{\\partial x} = \\lim_{h \\to 0} \\frac{f(x+h) - f(x)}{h}$$

$$\\sum_{i=1}^{n} i^2 = \\frac{n(n+1)(2n+1)}{6}$$

## 📊 Mermaid Diagrams
Create powerful visualizations directly in markdown:

\`\`\`mermaid
flowchart LR
    A[Start] --> B{Is it working?}
    B -->|Yes| C[Great!]
    B -->|No| D[Debug]
    C --> E[Deploy]
    D --> B
\`\`\`

### Sequence Diagram Example
\`\`\`mermaid
sequenceDiagram
    User->>Editor: Type markdown
    Editor->>Preview: Render content
    User->>Editor: Make changes
    Editor->>Preview: Update rendering
    User->>Export: Save as PDF
\`\`\`

## 📋 Task Management
- [x] Create responsive layout
- [x] Implement live preview with GitHub styling
- [x] Add syntax highlighting for code blocks
- [x] Support math expressions with LaTeX
- [x] Enable mermaid diagrams

## 🆚 Feature Comparison

| Feature                  | Markdown Viewer (Ours) | Other Markdown Editors  |
|:-------------------------|:----------------------:|:-----------------------:|
| Live Preview             | ✅ GitHub-Styled       | ✅                     |
| Sync Scrolling           | ✅ Two-way             | 🔄 Partial/None        |
| Mermaid Support          | ✅                     | ❌/Limited             |
| LaTeX Math Rendering     | ✅                     | ❌/Limited             |

### 📝 Multi-row Headers Support

<table>
  <thead>
    <tr>
      <th rowspan="2">Document Type</th>
      <th colspan="2">Support</th>
    </tr>
    <tr>
      <th>Markdown Viewer (Ours)</th>
      <th>Other Markdown Editors</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Technical Docs</td>
      <td>Full + Diagrams</td>
      <td>Limited/Basic</td>
    </tr>
    <tr>
      <td>Research Notes</td>
      <td>Full + Math</td>
      <td>Partial</td>
    </tr>
    <tr>
      <td>Developer Guides</td>
      <td>Full + Export Options</td>
      <td>Basic</td>
    </tr>
  </tbody>
</table>

## 📝 Text Formatting Examples

### Text Formatting

Text can be formatted in various ways for ~~strikethrough~~, **bold**, *italic*, or ***bold italic***.

For highlighting important information, use <mark>highlighted text</mark> or add <u>underlines</u> where appropriate.

### Superscript and Subscript

Chemical formulas: H<sub>2</sub>O, CO<sub>2</sub>
Mathematical notation: x<sup>2</sup>, e<sup>iπ</sup>

### Keyboard Keys

Press <kbd>Ctrl</kbd> + <kbd>B</kbd> for bold text.

### Abbreviations

<abbr title="Graphical User Interface">GUI</abbr>
<abbr title="Application Programming Interface">API</abbr>

### Text Alignment

<div style="text-align: center">
Centered text for headings or important notices
</div>

<div style="text-align: right">
Right-aligned text (for dates, signatures, etc.)
</div>

### **Lists**

Create bullet points:
* Item 1
* Item 2
  * Nested item
    * Nested further

### **Links and Images**

Add a [link](https://github.com/phanimca/Markdown-Viewer/) to important resources.

Embed an image:
![Markdown Logo](https://example.com/logo.png)

### **Blockquotes**

Quote someone famous:
> "The best way to predict the future is to invent it." - Alan Kay

---

## 🛡️ Security Note

This is a fully client-side application. Your content never leaves your browser and stays secure on your device.`;

dom.markdownEditor.value = sampleMarkdown;

// Initial render
renderMarkdown();
updateMobileStats();

// Initialize view mode
dom.contentContainer.classList.add('view-split');
initResizer();

// ── Event listeners ───────────────────────────────────────────────────────────

// View mode buttons (desktop)
dom.viewModeButtons.forEach(btn => {
  btn.addEventListener('click', function () {
    setViewMode(this.getAttribute('data-mode'));
  });
});

// View mode buttons (mobile)
dom.mobileViewModeButtons.forEach(btn => {
  btn.addEventListener('click', function () {
    setViewMode(this.getAttribute('data-mode'));
    closeMobileMenu();
  });
});

// Editor input
dom.markdownEditor.addEventListener("input", debouncedRender);

// Tab key → insert 2 spaces
dom.markdownEditor.addEventListener("keydown", function (e) {
  if (e.key === 'Tab') {
    e.preventDefault();
    const start = this.selectionStart;
    const end = this.selectionEnd;
    const value = this.value;
    const indent = '  ';
    this.value = value.substring(0, start) + indent + value.substring(end);
    this.selectionStart = this.selectionEnd = start + indent.length;
    this.dispatchEvent(new Event('input'));
  }
});

// Scroll sync
dom.editorPane.addEventListener("scroll", syncEditorToPreview);
dom.previewPane.addEventListener("scroll", syncPreviewToEditor);
dom.toggleSyncButton.addEventListener("click", toggleSyncScrolling);

// Click-to-sync
dom.editorPane.addEventListener("click", syncEditorClickToPreview);
dom.editorPane.addEventListener("keyup", syncEditorClickToPreview);
dom.previewPane.addEventListener("click", syncPreviewClickToEditor);

// Invalidate scroll anchor cache on resize
window.addEventListener("resize", invalidateSyncAnchors);

// Theme toggle
dom.themeToggle.addEventListener("click", function () {
  const theme = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", theme);

  dom.themeToggle.innerHTML = theme === "dark"
    ? '<i class="bi bi-sun"></i>'
    : '<i class="bi bi-moon"></i>';

  initMermaid();
  renderMarkdown();
});

// File open
dom.openLocalBtn.addEventListener("click", function (e) {
  e.preventDefault();
  openMarkdownFile();
});

dom.openSharepointBtn.addEventListener("click", function (e) {
  e.preventDefault();
  dom.sharepointError.classList.add("d-none");
  dom.sharepointUrlInput.value = "";
  dom.sharepointImportModal.show();
});

dom.openAdoBtn.addEventListener("click", function (e) {
  e.preventDefault();
  dom.adoError.classList.add("d-none");
  dom.adoImportModal.show();
});

// SharePoint modal import
dom.sharepointImportBtn.addEventListener("click", async function () {
  const url = dom.sharepointUrlInput.value.trim();
  if (!url) {
    dom.sharepointError.textContent = "Please enter a SharePoint file URL.";
    dom.sharepointError.classList.remove("d-none");
    return;
  }
  dom.sharepointImportBtn.disabled = true;
  dom.sharepointImportBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Importing\u2026';
  try {
    await importFromSharePoint(url);
    dom.sharepointImportModal.hide();
  } catch (e) {
    dom.sharepointError.textContent = e.message;
    dom.sharepointError.classList.remove("d-none");
  } finally {
    dom.sharepointImportBtn.disabled = false;
    dom.sharepointImportBtn.innerHTML = '<i class="bi bi-download me-1"></i> Import';
  }
});

// ADO modal import
dom.adoImportBtn.addEventListener("click", async function () {
  const org = dom.adoOrgInput.value.trim();
  const project = dom.adoProjectInput.value.trim();
  const repo = dom.adoRepoInput.value.trim();
  const branch = dom.adoBranchInput.value.trim() || "main";
  const filePath = dom.adoPathInput.value.trim();
  const pat = dom.adoPatInput.value.trim();
  if (!org || !project || !repo || !filePath) {
    dom.adoError.textContent = "Organization, Project, Repository and File Path are required.";
    dom.adoError.classList.remove("d-none");
    return;
  }
  dom.adoImportBtn.disabled = true;
  dom.adoImportBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Importing\u2026';
  try {
    await importFromAdo(org, project, repo, branch, filePath, pat);
    dom.adoImportModal.hide();
    dom.adoPatInput.value = "";
  } catch (e) {
    dom.adoError.textContent = e.message;
    dom.adoError.classList.remove("d-none");
  } finally {
    dom.adoImportBtn.disabled = false;
    dom.adoImportBtn.innerHTML = '<i class="bi bi-download me-1"></i> Import';
    dom.adoPatInput.value = "";
  }
});

// Save
dom.saveButton.addEventListener("click", function () {
  saveMarkdownFile();
});

// Reload
dom.reloadButton.addEventListener("click", function () {
  reloadFile();
});

// ADO insert buttons
if (dom.insertAdoTocButton) {
  dom.insertAdoTocButton.addEventListener("click", function () {
    insertAdoTocSnippet();
  });
}

if (dom.insertAdoNoteButton) {
  dom.insertAdoNoteButton.addEventListener("click", function () {
    insertAdoNoteSnippet();
  });
}

// File input (fallback)
dom.fileInput.addEventListener("change", function (e) {
  const file = e.target.files[0];
  if (file) {
    importMarkdownFile(file);
  }
  this.value = "";
});

// Export
dom.exportMd.addEventListener("click", function (e) {
  e.preventDefault();
  try {
    exportMarkdownFile();
  } catch (e) {
    console.error("Export failed:", e);
    alert("Export failed: " + e.message);
  }
});

dom.exportHtml.addEventListener("click", function (e) {
  e.preventDefault();
  try {
    exportHtmlFile();
  } catch (e) {
    console.error("HTML export failed:", e);
    alert("HTML export failed: " + e.message);
  }
});

dom.exportPdf.addEventListener("click", async function (e) {
  e.preventDefault();
  await runPdfExport();
});

// Copy markdown
dom.copyMarkdownButton.addEventListener("click", function () {
  try {
    copyToClipboard(dom.markdownEditor.value);
  } catch (e) {
    console.error("Copy failed:", e);
    alert("Failed to copy Markdown: " + e.message);
  }
});

// Keyboard shortcuts
document.addEventListener("keydown", function (e) {
  if (!(e.ctrlKey || e.metaKey)) return;

  const key = e.key.toLowerCase();
  if (key === 'o') {
    e.preventDefault();
    openMarkdownFile();
  } else if (key === 's') {
    e.preventDefault();
    saveMarkdownFile();
  } else if (key === 'r') {
    e.preventDefault();
    reloadFile();
  } else if (e.altKey && key === 't') {
    e.preventDefault();
    insertAdoTocSnippet();
  } else if (e.altKey && key === 'n') {
    e.preventDefault();
    insertAdoNoteSnippet();
  }
});

document.addEventListener("keydown", function (e) {
  if ((e.ctrlKey || e.metaKey) && e.key === "c") {
    e.preventDefault();
    dom.copyMarkdownButton.click();
  }
  if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "S") {
    e.preventDefault();
    if (dom.currentViewMode === 'split') {
      toggleSyncScrolling();
    }
  }
});

// Mobile menu
dom.mobileMenuToggle.addEventListener("click", openMobileMenu);
dom.mobileCloseMenu.addEventListener("click", closeMobileMenu);
dom.mobileMenuOverlay.addEventListener("click", closeMobileMenu);

dom.mobileToggleSync.addEventListener("click", () => toggleSyncScrolling());
dom.mobileOpenLocalBtn.addEventListener("click", () => { openMarkdownFile(); closeMobileMenu(); });
dom.mobileOpenSharepointBtn.addEventListener("click", () => {
  dom.sharepointError.classList.add("d-none");
  dom.sharepointUrlInput.value = "";
  closeMobileMenu();
  dom.sharepointImportModal.show();
});
dom.mobileOpenAdoBtn.addEventListener("click", () => {
  dom.adoError.classList.add("d-none");
  closeMobileMenu();
  dom.adoImportModal.show();
});
dom.mobileSaveBtn.addEventListener("click", () => saveMarkdownFile());
dom.mobileReloadBtn.addEventListener("click", () => { reloadFile(); closeMobileMenu(); });
dom.mobileInsertAdoTocBtn.addEventListener("click", () => {
  insertAdoTocSnippet();
  closeMobileMenu();
});
dom.mobileInsertAdoNoteBtn.addEventListener("click", () => {
  insertAdoNoteSnippet();
  closeMobileMenu();
});
dom.mobileExportMd.addEventListener("click", () => dom.exportMd.click());
dom.mobileExportHtml.addEventListener("click", () => dom.exportHtml.click());
dom.mobileExportPdf.addEventListener("click", () => dom.exportPdf.click());
dom.mobileCopyMarkdown.addEventListener("click", () => dom.copyMarkdownButton.click());
dom.mobileThemeToggle.addEventListener("click", () => {
  dom.themeToggle.click();
  dom.mobileThemeToggle.innerHTML = dom.themeToggle.innerHTML + " Toggle Dark Mode";
});

// Drop zone
const dropEvents = ["dragenter", "dragover", "dragleave", "drop"];
dropEvents.forEach((eventName) => {
  dom.dropzone.addEventListener(eventName, preventDefaults, false);
  document.body.addEventListener(eventName, preventDefaults, false);
});

function preventDefaults(e) {
  e.preventDefault();
  e.stopPropagation();
}

["dragenter", "dragover"].forEach((eventName) => {
  dom.dropzone.addEventListener(eventName, () => dom.dropzone.classList.add("active"), false);
});

["dragleave", "drop"].forEach((eventName) => {
  dom.dropzone.addEventListener(eventName, () => dom.dropzone.classList.remove("active"), false);
});

dom.dropzone.addEventListener("drop", function (e) {
  const dt = e.dataTransfer;
  const files = dt.files;
  if (files.length) {
    const file = files[0];
    const isMarkdownFile =
      file.type === "text/markdown" ||
      file.name.endsWith(".md") ||
      file.name.endsWith(".markdown");
    if (isMarkdownFile) {
      importMarkdownFile(file);
    } else {
      alert("Please upload a Markdown file (.md or .markdown)");
    }
  }
}, false);

dom.dropzone.addEventListener("click", function (e) {
  if (e.target !== dom.closeDropzoneBtn && !dom.closeDropzoneBtn.contains(e.target)) {
    dom.fileInput.click();
  }
});

dom.closeDropzoneBtn.addEventListener("click", function (e) {
  e.stopPropagation();
  dom.dropzone.style.display = "none";
});
