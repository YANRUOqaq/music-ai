import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import http from 'http';

let apiProcess: ChildProcess | null = null;
const API_PORT = 3000;
const API_BASE = `http://localhost:${API_PORT}`;

function findModuleRoot(): string {
  const parts = __dirname.split(path.sep);
  while (parts.length > 0) {
    const candidate = path.join(parts.join(path.sep), 'node_modules', 'NeteaseCloudMusicApi');
    try {
      require.resolve(candidate);
      return candidate;
    } catch {
      parts.pop();
    }
  }
  throw new Error('NeteaseCloudMusicApi not found in node_modules');
}

export async function startNeteaseAPI(): Promise<void> {
  if (apiProcess) return;

  const moduleRoot = findModuleRoot();
  const appPath = path.join(moduleRoot, 'app.js');

  apiProcess = spawn('node', [appPath], {
    env: { ...process.env, PORT: String(API_PORT) },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  apiProcess.stdout?.on('data', (data: Buffer) => {
    console.log(`[NeteaseAPI] ${data.toString().trim()}`);
  });

  apiProcess.stderr?.on('data', (data: Buffer) => {
    console.error(`[NeteaseAPI:err] ${data.toString().trim()}`);
  });

  apiProcess.on('exit', (code) => {
    console.log(`[NeteaseAPI] exited with code ${code}`);
    apiProcess = null;
  });

  await waitForReady();
}

function waitForReady(maxRetries = 30): Promise<void> {
  return new Promise((resolve, reject) => {
    let retries = 0;
    const check = () => {
      http.get(`${API_BASE}/search?keywords=test&limit=1`, (res) => {
        if (res.statusCode === 200) return resolve();
        retry();
      }).on('error', () => retry());
    };
    const retry = () => {
      retries++;
      if (retries >= maxRetries) return reject(new Error('NeteaseAPI failed to start'));
      setTimeout(check, 1000);
    };
    check();
  });
}

export function stopNeteaseAPI(): void {
  if (apiProcess) {
    apiProcess.kill();
    apiProcess = null;
  }
}

export function getAPIBase(): string {
  return API_BASE;
}

export function isAPIRunning(): boolean {
  return apiProcess !== null;
}
