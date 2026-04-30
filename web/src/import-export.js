import DOMPurify from 'dompurify';
import { saveAs } from 'file-saver';
import { marked } from 'marked';
import { dom } from './dom.js';
import { state, SANITIZE_CONFIG } from './state.js';
import { preprocessMarkdown } from './preprocessors.js';
import { renderMarkdown } from './render.js';

export function importMarkdownFile(file) {
  const reader = new FileReader();
  reader.onload = function (e) {
    dom.markdownEditor.value = e.target.result;
    state.currentFileName = file.name || "document.md";
    state.currentFileHandle = null;
    renderMarkdown();
    dom.dropzone.style.display = "none";
  };
  reader.onerror = function () {
    alert("Failed to read file. The file may be inaccessible or corrupted.");
  };
  reader.readAsText(file);
}

export async function openMarkdownFile() {
  if (window.showOpenFilePicker) {
    try {
      const [fileHandle] = await window.showOpenFilePicker({
        types: [{
          description: 'Markdown Files',
          accept: {
            'text/markdown': ['.md', '.markdown'],
            'text/plain': ['.txt']
          }
        }],
        excludeAcceptAllOption: false,
        multiple: false
      });

      if (!fileHandle) return;

      const file = await fileHandle.getFile();
      const content = await file.text();
      dom.markdownEditor.value = content;
      state.currentFileName = file.name || "document.md";
      state.currentFileHandle = fileHandle;
      renderMarkdown();
      return;
    } catch (e) {
      if (e && e.name !== 'AbortError') {
        console.warn("Native open dialog failed, using fallback:", e);
      }
    }
  }

  dom.fileInput.click();
}

export async function importFromSharePoint(url) {
  let parsedUrl;
  try {
    parsedUrl = new URL(url);
  } catch {
    throw new Error("Invalid URL format. Please provide a full SharePoint HTTPS URL.");
  }

  if (parsedUrl.protocol !== "https:") {
    throw new Error("Only HTTPS SharePoint URLs are allowed.");
  }

  let resp;
  try {
    resp = await fetch(url);
  } catch (e) {
    throw new Error(
      "Failed to fetch the file. This is often a CORS restriction. " +
      "Ensure the SharePoint file is shared with \u2018Anyone with the link\u2019 and the URL is a direct download link."
    );
  }
  if (!resp.ok) {
    throw new Error(
      "SharePoint returned HTTP " + resp.status + ": " + resp.statusText +
      ". Check that the URL is correct and the file is publicly accessible."
    );
  }
  const text = await resp.text();
  const fileName = parsedUrl.pathname.split("/").pop() || "sharepoint.md";
  dom.markdownEditor.value = text;
  state.currentFileName = fileName;
  state.currentFileHandle = null;
  renderMarkdown();
}

export async function importFromAdo(org, project, repo, branch, filePath, pat) {
  if (!filePath.startsWith("/")) filePath = "/" + filePath;
  const url = new URL(
    "https://dev.azure.com/" +
    encodeURIComponent(org) + "/" +
    encodeURIComponent(project) +
    "/_apis/git/repositories/" +
    encodeURIComponent(repo) + "/items"
  );
  url.searchParams.set("path", filePath);
  url.searchParams.set("versionDescriptor.version", branch);
  url.searchParams.set("versionDescriptor.versionType", "branch");
  url.searchParams.set("$format", "text");
  url.searchParams.set("api-version", "7.1");
  const headers = { "Accept": "text/plain" };
  if (pat) {
    headers["Authorization"] = "Basic " + btoa(":" + pat);
  }
  let resp;
  try {
    resp = await fetch(url.toString(), { headers });
  } catch (e) {
    throw new Error(
      "Network error contacting Azure DevOps. " +
      "Check your connection or that the organization name is correct."
    );
  }
  if (resp.status === 401 || resp.status === 403) {
    throw new Error(
      "Authentication failed (HTTP " + resp.status + "). " +
      "Provide a valid PAT with Code (Read) scope for private repositories."
    );
  }
  if (!resp.ok) {
    throw new Error("Azure DevOps returned HTTP " + resp.status + ": " + resp.statusText);
  }
  const text = await resp.text();
  const fileName = filePath.split("/").pop() || "ado.md";
  dom.markdownEditor.value = text;
  state.currentFileName = fileName;
  state.currentFileHandle = null;
  renderMarkdown();
}

export async function saveMarkdownFile() {
  const markdownText = dom.markdownEditor.value;

  if (window.showSaveFilePicker) {
    try {
      const fileHandle = state.currentFileHandle || await window.showSaveFilePicker({
        suggestedName: state.currentFileName,
        types: [{
          description: 'Markdown Files',
          accept: {
            'text/markdown': ['.md'],
            'text/plain': ['.txt']
          }
        }]
      });

      const writable = await fileHandle.createWritable();
      await writable.write(markdownText);
      await writable.close();

      state.currentFileHandle = fileHandle;
      return;
    } catch (e) {
      if (e && e.name !== 'AbortError') {
        console.warn("Native save dialog failed, using fallback:", e);
      } else {
        return;
      }
    }
  }

  const blob = new Blob([markdownText], {
    type: "text/markdown;charset=utf-8",
  });
  saveAs(blob, state.currentFileName || "document.md");
}

export function exportMarkdownFile() {
  const blob = new Blob([dom.markdownEditor.value], {
    type: "text/markdown;charset=utf-8",
  });
  saveAs(blob, "document.md");
}

export function exportHtmlFile() {
  const markdown = dom.markdownEditor.value;
  const html = marked.parse(preprocessMarkdown(markdown));
  const sanitizedHtml = DOMPurify.sanitize(html, SANITIZE_CONFIG);
  const isDarkTheme = document.documentElement.getAttribute("data-theme") === "dark";
  const cssTheme = isDarkTheme
    ? "https://cdnjs.cloudflare.com/ajax/libs/github-markdown-css/5.9.0/github-markdown-dark.min.css"
    : "https://cdnjs.cloudflare.com/ajax/libs/github-markdown-css/5.9.0/github-markdown.min.css";
  const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Markdown Export</title>
  <link rel="stylesheet" href="${cssTheme}">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.11.1/styles/${
    isDarkTheme ? "github-dark" : "github"
  }.min.css">
  <style>
      body {
          background-color: ${isDarkTheme ? "#0d1117" : "#ffffff"};
          color: ${isDarkTheme ? "#c9d1d9" : "#24292e"};
      }
      .markdown-body {
          box-sizing: border-box;
          min-width: 200px;
          max-width: 980px;
          margin: 0 auto;
          padding: 45px;
          background-color: ${isDarkTheme ? "#0d1117" : "#ffffff"};
          color: ${isDarkTheme ? "#c9d1d9" : "#24292e"};
      }
      @media (max-width: 767px) {
          .markdown-body {
              padding: 15px;
          }
      }
  </style>
</head>
<body>
  <article class="markdown-body">
      ${sanitizedHtml}
  </article>
</body>
</html>`;
  const blob = new Blob([fullHtml], { type: "text/html;charset=utf-8" });
  saveAs(blob, "document.html");
}

export function insertTextAtCursor(text, selectStartOffset = null, selectEndOffset = null) {
  const start = dom.markdownEditor.selectionStart;
  const end = dom.markdownEditor.selectionEnd;
  const currentValue = dom.markdownEditor.value;

  dom.markdownEditor.value = currentValue.substring(0, start) + text + currentValue.substring(end);

  if (selectStartOffset !== null && selectEndOffset !== null) {
    dom.markdownEditor.selectionStart = start + selectStartOffset;
    dom.markdownEditor.selectionEnd = start + selectEndOffset;
  } else {
    const caret = start + text.length;
    dom.markdownEditor.selectionStart = caret;
    dom.markdownEditor.selectionEnd = caret;
  }

  dom.markdownEditor.focus();
  dom.markdownEditor.dispatchEvent(new Event('input'));
}

export function insertAdoTocSnippet() {
  insertTextAtCursor('[[_TOC_]]\n\n');
}

export function insertAdoNoteSnippet() {
  const snippet = '> [!NOTE]\n> Add your note here.\n\n';
  const placeholder = 'Add your note here.';
  const startOffset = snippet.indexOf(placeholder);
  insertTextAtCursor(snippet, startOffset, startOffset + placeholder.length);
}

export function showCopiedMessage() {
  const originalText = dom.copyMarkdownButton.innerHTML;
  dom.copyMarkdownButton.innerHTML = '<i class="bi bi-check-lg"></i> Copied!';

  setTimeout(() => {
    dom.copyMarkdownButton.innerHTML = originalText;
  }, 2000);
}

export async function copyToClipboard(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      showCopiedMessage();
    } else {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed";
      textArea.style.opacity = "0";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const successful = document.execCommand("copy");
      document.body.removeChild(textArea);
      if (successful) {
        showCopiedMessage();
      } else {
        throw new Error("Copy command was unsuccessful");
      }
    }
  } catch (err) {
    console.error("Copy failed:", err);
    alert("Failed to copy HTML: " + err.message);
  }
}
