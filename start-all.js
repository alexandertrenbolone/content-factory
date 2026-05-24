/**
 * Запускает backend и worker в одном процессе (для бесплатного Render Web Service)
 */
const { spawn } = require('child_process');
const path = require('path');

function start(name, args, cwd) {
  console.log(`[${name}] starting...`);
  const proc = spawn('node', args, { cwd: path.join(__dirname, cwd), stdio: 'inherit' });
  proc.on('exit', (code) => {
    console.log(`[${name}] exited with code ${code}, restarting in 3s...`);
    setTimeout(() => start(name, args, cwd), 3000);
  });
  proc.on('error', (err) => {
    console.error(`[${name}] error:`, err.message);
  });
}

start('backend', ['dist/index.js'], 'backend');
start('worker', ['dist/worker.js'], 'worker');
