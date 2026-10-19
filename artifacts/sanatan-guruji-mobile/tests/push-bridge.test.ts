import assert from 'node:assert/strict';
import { test } from 'node:test';
import vm from 'node:vm';
import { isPortalMessageOrigin,pushAuthScript,pushRequestScript,pushRequestTarget } from '../lib/push-bridge';

const portal='https://portal.example.test/';
function sandbox(role='guruji',userId:number|null=27,origin='https://portal.example.test') {
  const calls:{url:string;options:any}[]=[],messages:any[]=[];
  const window:any={ReactNativeWebView:{postMessage:(value:string)=>messages.push(JSON.parse(value))}};
  window.top=window;
  const context=vm.createContext({window,location:{origin},clearInterval:()=>{},setInterval:()=>1,
    fetch:async(url:string,options:any)=>{
      calls.push({url,options});
      return {ok:true,status:200,json:async()=>({id:userId,role})};
    }});
  return {context,calls,messages};
}
const flush=()=>new Promise(resolve=>setImmediate(resolve));
test('only first-party portal messages and integer-owned notification targets are allowed',()=>{
  assert.equal(isPortalMessageOrigin(portal,portal),true);
  assert.equal(isPortalMessageOrigin('https://portal.example.test.evil.test/',portal),false);
  assert.equal(isPortalMessageOrigin('https://checkout.stripe.com/',portal),false);
  assert.equal(pushRequestTarget({type:'guruji_puja_request',requestId:12,userId:27},27),'/dashboard?tab=requests&requestId=12');
  for(const data of [{type:'guruji_puja_request',requestId:'12',userId:27},
    {type:'guruji_puja_request',requestId:-1,userId:27},{type:'guruji_puja_request',requestId:12,userId:28},
    {type:'other',requestId:12,userId:27},{url:'https://evil.test'}])
    assert.equal(pushRequestTarget(data,27),null);
});
test('auth bridge reports actual session role without exporting cookies or passwords',async()=>{
  const s=sandbox();vm.runInContext(pushAuthScript(portal),s.context);await flush();
  assert.deepEqual(s.messages,[{type:'sg-push-auth',userId:27,role:'guruji'}]);
  assert.equal(s.calls[0].url,'/api/auth/me');
  assert.equal(s.calls[0].options.credentials,'include');
});
test('external checkout and nested frames cannot register a push device',async()=>{
  const s=sandbox('guruji',27,'https://checkout.stripe.com');
  vm.runInContext(pushAuthScript(portal),s.context);
  vm.runInContext(pushRequestScript(portal,'one','PUT',{},27),s.context);await flush();
  assert.equal(s.calls.length,0);assert.equal(s.messages.length,0);
  const frame=sandbox();vm.runInContext('window.top={}',frame.context);
  vm.runInContext(pushAuthScript(portal),frame.context);await flush();
  assert.equal(frame.calls.length,0);
});
test('registration uses WebView session and preserves exact server input',async()=>{
  const s=sandbox(),body={installationId:'installation-1234567890',token:'ExpoPushToken[test]',accountId:27};
  vm.runInContext(pushRequestScript(portal,'one','PUT',body,27),s.context);await flush();
  assert.equal(s.calls.length,2);assert.equal(s.calls[1].url,'/api/mobile/push');
  assert.deepEqual(JSON.parse(s.calls[1].options.body),body);
  assert.equal(s.calls[1].options.method,'PUT');
  assert.deepEqual(s.messages,[{type:'sg-push-result',requestId:'one',ok:true}]);
});
test('registration refuses customer, logged-out and switched accounts',async()=>{
  for(const [role,userId] of [['customer',27],['guruji',28],[null,null]] as const) {
    const s=sandbox(role??'',userId);
    vm.runInContext(pushRequestScript(portal,'one','PUT',{},27),s.context);await flush();
    assert.equal(s.calls.length,1);
    assert.equal(s.messages[0].ok,false);
  }
});
