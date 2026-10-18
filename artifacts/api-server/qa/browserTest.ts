import { spawn } from 'node:child_process';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import WebSocket from 'ws';

export async function openBrowserTest() {
  const directory = await mkdtemp(`${tmpdir()}/guruji-auth-qa-`);
  const browser = spawn('chromium', [
    '--headless', '--no-sandbox', '--disable-gpu', '--remote-debugging-port=0',
    '--remote-debugging-address=127.0.0.1', `--user-data-dir=${directory}`, 'about:blank',
  ], { stdio: 'ignore' });
  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
  let page: any;
  for (let attempt = 0; attempt < 80; attempt++) {
    try {
      const port=(await readFile(`${directory}/DevToolsActivePort`,'utf8')).split('\n')[0].trim();
      const pages = await (await fetch(`http://127.0.0.1:${port}/json`)).json() as any[];
      page = pages.find(item => item.type === 'page');
      if (page) break;
    } catch {}
    await sleep(250);
  }
  if (!page) { browser.kill(); throw new Error('Could not start system Chromium'); }
  const socket = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise<void>((resolve, reject) => { socket.once('open', resolve); socket.once('error', reject); });
  let sequence = 0;
  const pending = new Map<number, { resolve: (value: any) => void; reject: (error: Error) => void }>();
  socket.on('message', data => {
    const message = JSON.parse(String(data));
    const request = pending.get(message.id);
    if (!request) return;
    pending.delete(message.id);
    message.error ? request.reject(new Error(message.error.message)) : request.resolve(message.result);
  });
  const command = (method: string, params: any = {}) => new Promise<any>((resolve, reject) => {
    const id = ++sequence;
    pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params }));
    setTimeout(() => {
      if (pending.delete(id)) reject(new Error(`Browser command timed out: ${method}`));
    }, 15000).unref();
  });
  const evaluate = async (expression: string) => {
    const result = await command('Runtime.evaluate', {
      expression: `(async () => (${expression}))()`, awaitPromise: true, returnByValue: true,
    });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
    return result.result?.value;
  };
  const wait = async (expression: string, label: string) => {
    for (let attempt = 0; attempt < 120; attempt++) {
      try {
        if (await evaluate(`!!document.body && (${expression})`)) return;
      } catch (error) {
        if (!/Execution context was destroyed|Cannot find context/.test(String(error))) throw error;
      }
      await sleep(250);
    }
    const pageState = await evaluate(`({path:location.pathname+location.search,text:document.body?.innerText.slice(-1400)})`);
    throw new Error(`Did not reach ${label}: ${JSON.stringify(pageState)}`);
  };
  const click = async (selector: string, text?: string) => {
    const position = await evaluate(`(() => {
      const elements = [...document.querySelectorAll(${JSON.stringify(selector)})];
      const el = ${text === undefined ? 'elements[0]' : `elements.find(el => el.textContent.trim() === ${JSON.stringify(text)})`};
      if (!el) throw new Error('Missing clickable control');
      el.scrollIntoView({behavior:'instant',block:'center'});
      const r=el.getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2};
    })()`);
    await command('Input.dispatchMouseEvent', { type: 'mousePressed', ...position, button: 'left', clickCount: 1 });
    await command('Input.dispatchMouseEvent', { type: 'mouseReleased', ...position, button: 'left', clickCount: 1 });
  };
  const type = async (selector: string, value: string) => {
    await evaluate(`document.querySelector(${JSON.stringify(selector)}).focus()`);
    await command('Input.insertText', { text: value });
  };
  const close = async () => {
    socket.close();
    if (browser.exitCode === null) await new Promise<void>(resolve => {
      browser.once('exit', () => resolve());
      browser.kill('SIGTERM');
      setTimeout(() => browser.kill('SIGKILL'), 3000).unref();
    });
    await rm(directory, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  };
  await command('Page.enable');
  await command('Runtime.enable');
  await command('Emulation.setDeviceMetricsOverride', {
    width: 1280, height: 900, deviceScaleFactor: 1, mobile: false,
  });
  return { command, evaluate, wait, click, type, close };
}