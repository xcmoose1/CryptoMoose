import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const updateScript = spawn('node', ['js/daily-update.js'], {
    stdio: 'inherit',
    detached: true
});

updateScript.unref();

console.log('Daily update service started. The dashboard will be updated every 24 hours.');
