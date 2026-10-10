/* Simple file watcher — rebuild on change */
'use strict';

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const WATCH = ['data', 'content', 'templates', 'css', 'js'];

function rebuild() {
    const build = spawn('node', [path.join(__dirname, 'build.cjs')], {
        stdio: 'inherit',
        cwd: ROOT,
    });
    build.on('close', (code) => {
        if (code !== 0) console.log('  ⚠  Build exited with', code);
    });
}

let timer = null;
function onChange(event, filename) {
    clearTimeout(timer);
    timer = setTimeout(() => {
        console.log(`\n→ Change detected: ${filename}`);
        rebuild();
    }, 200);
}

console.log('👀 Watching for changes…\n');
rebuild();

for (const dir of WATCH) {
    const full = path.join(ROOT, dir);
    if (fs.existsSync(full)) {
        fs.watch(full, { recursive: true }, onChange);
    }
}