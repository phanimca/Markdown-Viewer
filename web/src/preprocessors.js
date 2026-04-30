export function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function slugifyHeading(text) {
  return String(text)
    .toLowerCase()
    .trim()
    .replace(/<[^>]*>/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

export function buildAdoTocHtml(markdown) {
  const sourceWithoutCode = markdown.replace(/```[\s\S]*?```/g, '');
  const headingRegex = /^(#{1,6})\s+(.+)$/gm;
  const items = [];
  let match;

  while ((match = headingRegex.exec(sourceWithoutCode)) !== null) {
    const level = match[1].length;
    const rawText = match[2].replace(/\s+#+\s*$/, '').trim();
    const anchor = slugifyHeading(rawText);
    if (!anchor) continue;

    items.push(`<li class="ado-toc-level-${level}"><a href="#${anchor}">${escapeHtml(rawText)}</a></li>`);
  }

  if (items.length === 0) {
    return '<div class="ado-toc"><div class="ado-toc-title">Table of contents</div><div class="ado-toc-empty">No headings found.</div></div>';
  }

  return `<nav class="ado-toc"><div class="ado-toc-title">Table of contents</div><ul>${items.join('')}</ul></nav>`;
}

export function transformAdoWikiLinks(markdown) {
  return markdown.replace(/\[\[([^\]]+)\]\]/g, (fullMatch, content) => {
    const trimmed = content.trim();
    if (!trimmed) return fullMatch;
    if (trimmed.toUpperCase() === '_TOC_') return fullMatch;

    const pipeIndex = trimmed.indexOf('|');
    const targetPart = pipeIndex >= 0 ? trimmed.slice(0, pipeIndex).trim() : trimmed;
    const labelPart = pipeIndex >= 0 ? trimmed.slice(pipeIndex + 1).trim() : '';

    if (!targetPart) return fullMatch;

    const hashIndex = targetPart.indexOf('#');
    const pagePart = hashIndex >= 0 ? targetPart.slice(0, hashIndex).trim() : targetPart;
    const sectionPart = hashIndex >= 0 ? targetPart.slice(hashIndex + 1).trim() : '';
    const label = labelPart || targetPart;

    if (/^https?:\/\//i.test(targetPart)) {
      return `[${label}](${targetPart})`;
    }

    if (targetPart.startsWith('#')) {
      const anchorOnly = slugifyHeading(targetPart.slice(1));
      return `[${label}](#${anchorOnly})`;
    }

    const encodedPage = encodeURIComponent(pagePart).replace(/%2F/g, '/');
    const anchor = sectionPart ? `#${slugifyHeading(sectionPart)}` : '';
    const href = `${encodedPage}${anchor}`;
    return `[${label}](${href})`;
  });
}

export function transformAdoCallouts(markdown) {
  const lines = markdown.split('\n');
  const output = [];
  let i = 0;

  while (i < lines.length) {
    const startMatch = lines[i].match(/^\s*>\s*\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*$/i);
    if (!startMatch) {
      output.push(lines[i]);
      i++;
      continue;
    }

    const kind = startMatch[1].toLowerCase();
    const title = startMatch[1].toUpperCase();
    i++;

    const bodyLines = [];
    while (i < lines.length && /^\s*>/.test(lines[i])) {
      bodyLines.push(lines[i].replace(/^\s*>\s?/, ''));
      i++;
    }

    const bodyHtml = escapeHtml(bodyLines.join('\n').trim()).replace(/\n/g, '<br>');
    output.push(`<div class="ado-callout ado-callout-${kind}"><div class="ado-callout-title">${title}</div><div class="ado-callout-body">${bodyHtml}</div></div>`);
  }

  return output.join('\n');
}

export function preprocessMarkdown(markdown) {
  if (!markdown) return markdown;

  let result = markdown;

  result = result.replace(/\[\[_TOC_\]\]/gi, () => buildAdoTocHtml(markdown));

  result = transformAdoCallouts(result);
  result = transformAdoWikiLinks(result);

  result = result.replace(
    /(^|\n)([ \t]{0,3}):::\s*mermaid\s*\n([\s\S]*?)\n\2:::(?=\n|$)/g,
    (match, prefix, indent, diagramBody) => {
      const normalizedBody = diagramBody.replace(/\n+$/, '');
      return `${prefix}${indent}\`\`\`mermaid\n${normalizedBody}\n${indent}\`\`\``;
    }
  );

  return result;
}
