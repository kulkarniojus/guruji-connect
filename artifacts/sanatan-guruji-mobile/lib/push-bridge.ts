// Runs only inside the first-party WebView. HttpOnly portal cookies never leave it.
// This bridge is needed instead of a native API fetch, which has a separate cookie jar.
export function pushAuthScript(portal: string) {
  return `(function(){
    if(window.top!==window || location.origin!==${JSON.stringify(new URL(portal).origin)})return;
    if(window.__sgPushPoll)clearInterval(window.__sgPushPoll);
    var busy=false;
    async function check(){
      if(busy)return;busy=true;
      try {
        var r=await fetch('/api/auth/me',{credentials:'include',cache:'no-store'});
        if(r.ok){var u=await r.json();window.ReactNativeWebView.postMessage(JSON.stringify({
          type:'sg-push-auth',userId:u.id,role:u.role
        }));}
        else if(r.status===401||r.status===403)window.ReactNativeWebView.postMessage(JSON.stringify({type:'sg-push-auth',userId:null,role:null}));
      }catch(e){}finally{busy=false;}
    }
    check();window.__sgPushPoll=setInterval(check,5000);
  })();true;`;
}

export function pushRequestScript(portal:string,requestId:string,method:'PUT'|'DELETE',body:unknown,userId:number) {
  return `(async function(){
    if(window.top!==window || location.origin!==${JSON.stringify(new URL(portal).origin)})return;
    var ok=false;
    try {
      var auth=await fetch('/api/auth/me',{credentials:'include',cache:'no-store'});
      if(auth.ok){
        var u=await auth.json();
        if(u.id===${JSON.stringify(userId)} && u.role==='guruji'){
          var r=await fetch('/api/mobile/push',{method:${JSON.stringify(method)},credentials:'include',
            headers:{'Content-Type':'application/json'},body:${JSON.stringify(JSON.stringify(body))}});
          ok=r.ok;
        }
      }
    }catch(e){}
    window.ReactNativeWebView.postMessage(JSON.stringify({type:'sg-push-result',requestId:${JSON.stringify(requestId)},ok:ok}));
  })();true;`;
}

export function isPortalMessageOrigin(messageUrl:string,portal:string) {
  try {return new URL(messageUrl).origin===new URL(portal).origin;}catch{return false;}
}
export function pushRequestTarget(data:Record<string,unknown>,userId:number|null) {
  if(data.type!=='guruji_puja_request' || !Number.isSafeInteger(data.requestId) ||
    Number(data.requestId)<=0 || data.userId!==userId)return null;
  return `/dashboard?tab=requests&requestId=${data.requestId}`;
}
