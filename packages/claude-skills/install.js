#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);

// --list: print available commands and exit
if (args.includes('--list')) {
  const commandsDir = path.join(__dirname, 'commands');
  const files = fs.readdirSync(commandsDir).filter(f => f.endsWith('.md'));
  console.log('Available Claude Code slash commands:');
  files.forEach(f => console.log(`  /${path.basename(f, '.md')}`));
  process.exit(0);
}

// --target <dir>: install into <dir>/.claude/commands/
// postinstall: go up from node_modules/<pkg>/ to project root
// default: cwd
function resolveTarget() {
  const targetIdx = args.indexOf('--target');
  if (targetIdx !== -1 && args[targetIdx + 1]) {
    return path.resolve(args[targetIdx + 1], '.claude', 'commands');
  }
  if (process.env.npm_lifecycle_event === 'postinstall') {
    // __dirname = node_modules/markdown-viewer-claude-skills/
    return path.resolve(__dirname, '..', '..', '.claude', 'commands');
  }
  return path.resolve(process.cwd(), '.claude', 'commands');
}

const targetDir = resolveTarget();
const commandsDir = path.join(__dirname, 'commands');
const files = fs.readdirSync(commandsDir).filter(f => f.endsWith('.md'));

if (files.length === 0) {
  console.error('No command files found in', commandsDir);
  process.exit(1);
}

fs.mkdirSync(targetDir, { recursive: true });

let installed = 0;
let skipped = 0;

files.forEach(file => {
  const dest = path.join(targetDir, file);
  const existed = fs.existsSync(dest);
  fs.copyFileSync(path.join(commandsDir, file), dest);
  const label = existed ? 'updated' : 'installed';
  console.log(`  ${label}: /${path.basename(file, '.md')} -> ${dest}`);
  existed ? skipped++ : installed++;
});

const total = installed + skipped;
console.log(`\n${total} Claude Code skill(s) ready in ${targetDir}`);
console.log('Restart Claude Code (or reload the window) to pick up new commands.');
