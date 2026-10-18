import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import WebSocket from 'ws';

/** Fresh Chromium profile per run; never reuse a user's signed-in browser. */
export async function browserClient() {
  const directory = await mkdtemp(`${tmpdir()}/customer-fixes-`);
  const browser = spawn('chromium', ['--headless','--no-sandbox','--disable-gpu',
    '--remote-debugging-port=0',`--user-data-dir=${directory}`,'about:blank'], {stdio:'ignore'});
  const pause = (ms:number) => new Promise(resolve => setTimeout(resolve,ms));
  let target:any;
  for(let i=0;i<100;i++) {
    try {
      const port=(await readFile(`${directory}/DevToolsActivePort`,'utf8')).split('\n')[0];
      target=((await (await fetch(`http://127.0.0.1:${port}/json`)).json()) as any[]).find(t=>t.type==='page');
      if(target) break;
    }catch {}
    await pause(100);
  }
  if(!target) {browser.kill();throw new Error('Chromium did not start');}
  const socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise<void>((resolve,reject)=>{socket.once('open',resolve);socket.once('error',reject);});
  const pending = new Map<number,{resolve:(v:any)=>void;reject:(e:Error)=>void}>();
  let sequence=0;
  socket.on('message',data=>{
    const message=JSON.parse(String(data)),p=pending.get(message.id);
    if(!p)return;pending.delete(message.id);
    message.error?p.reject(new Error(message.error.message)):p.resolve(message.result);
  });
  const command=(method:string,params:any={})=>new Promise<any>((resolve,reject)=>{
    const id=++sequence;pending.set(id,{resolve,reject});socket.send(JSON.stringify({id,method,params}));
    setTimeout(()=>{if(pending.delete(id))reject(new Error(`Timed out: ${method}`));},15000).unref();
  });
  const evaluate=async(expression:string)=>{
    const result=await command('Runtime.evaluate',{expression:`(async()=>(${expression}))()`,awaitPromise:true,returnByValue:true});
    if(result.exceptionDetails)throw new Error(result.exceptionDetails.exception?.description||result.exceptionDetails.text);
    return result.result?.value;
  };
  const wait=async(expression:string,label:string)=>{
    for(let i=0;i<120;i++) {
      try{if(await evaluate(expression))return;}catch(e){if(!/context|document is not defined/i.test(String(e)))throw e;}
      await pause(150);
    }
    throw new Error(`Did not reach ${label}`);
  };
  const click=async(selector:string,text?:string)=>{
    const point=await evaluate(`(()=>{const el=[...document.querySelectorAll(${JSON.stringify(selector)})].find(e=>
      ${text===undefined?'true':`e.textContent.trim()===${JSON.stringify(text)}`} &&
      e.getBoundingClientRect().width>0 && e.getBoundingClientRect().height>0);
      if(!el)throw new Error('Missing clickable control');el.scrollIntoView({block:'center'});
      const r=el.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2};})()`);
    await command('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,...point});
    await command('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,...point});
  };
  const fill=async(selector:string,text:string)=>{
    await click(selector);
    await command('Input.dispatchKeyEvent',{type:'keyDown',key:'a',code:'KeyA',windowsVirtualKeyCode:65,modifiers:2});
    await command('Input.dispatchKeyEvent',{type:'keyUp',key:'a',code:'KeyA',windowsVirtualKeyCode:65,modifiers:2});
    await command('Input.insertText',{text});
  };
  return {command,evaluate,wait,click,fill,close:async()=>{socket.close();browser.kill();await pause(150);await rm(directory,{recursive:true,force:true});}};
}
