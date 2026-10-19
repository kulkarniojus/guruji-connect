import { useEffect, useRef, useState } from 'react';
import { Alert, AppState, Linking, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import type WebView from 'react-native-webview';
import type { WebViewMessageEvent } from 'react-native-webview';
import type { RefObject } from 'react';
import { isPortalMessageOrigin, pushAuthScript, pushRequestScript, pushRequestTarget } from '@/lib/push-bridge';

Notifications.setNotificationHandler({
  handleNotification:async()=>({
    shouldPlaySound:true,shouldSetBadge:false,shouldShowBanner:true,shouldShowList:true,
  }),
});
const PREF='sg-puja-alert-users';
const INSTALL='sg-puja-alert-installation';
type Auth={userId:number|null;role:string|null};

export function useGurujiPush(webview:RefObject<WebView|null>,portal:string,navigate:(url:string)=>void) {
  const [auth,setAuth]=useState<Auth>({userId:null,role:null});
  const [enabled,setEnabled]=useState(false);
  const [busy,setBusy]=useState(false);
  const identity=useRef<Auth>(auth);
  const pending=useRef(new Map<string,(ok:boolean)=>void>());
  const autoAttempted=useRef<number|null>(null);
  const working=useRef(false);
  const pendingTap=useRef<Record<string,unknown>|null>(null);
  const mounted=useRef(true);

  async function installation() {
    let id=await AsyncStorage.getItem(INSTALL);
    if(!id) {
      // Installation identity only, not an authentication credential.
      id=`sg_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}_${Math.random().toString(36).slice(2)}`;
      await AsyncStorage.setItem(INSTALL,id);
    }
    return id;
  }
  async function preference(userId:number,value?:boolean) {
    const ids: number[]=JSON.parse(await AsyncStorage.getItem(PREF)??'[]');
    if(value===undefined)return ids.includes(userId);
    await AsyncStorage.setItem(PREF,JSON.stringify(value?[...new Set([...ids,userId])]:ids.filter(id=>id!==userId)));
    return value;
  }
  function request(method:'PUT'|'DELETE',body:unknown,userId:number):Promise<boolean> {
    return new Promise(resolve=>{
      const id=`${Date.now()}_${Math.random()}`;
      const timeout=setTimeout(()=>{pending.current.delete(id);resolve(false);},15000);
      pending.current.set(id,ok=>{clearTimeout(timeout);pending.current.delete(id);resolve(ok);});
      webview.current?.injectJavaScript(pushRequestScript(portal,id,method,body,userId));
    });
  }
  function showError(text:string) {
    Alert.alert('Puja alerts',text);
  }
  async function enable(manual:boolean) {
    const userId=identity.current.userId;
    if(!userId || identity.current.role!=='guruji' || working.current)return;
    working.current=true;setBusy(true);
    try {
      if(Constants.appOwnership==='expo' || !Device.isDevice) {
        if(manual)showError('Background puja alerts need the installed Sanatan Guruji app on a real phone. They are not available in Expo Go or the browser preview.');
        return;
      }
      const projectId=Constants.expoConfig?.extra?.eas?.projectId??Constants.easConfig?.projectId;
      if(!projectId) {
        if(manual)showError('Push notifications are not configured in this app build yet. The release needs a push project ID and Apple/Google push credentials.');
        return;
      }
      if(Platform.OS==='android')await Notifications.setNotificationChannelAsync('guruji-puja-requests',{
        name:'New puja requests',description:'One sound and vibration for each new puja request',
        importance:Notifications.AndroidImportance.MAX,sound:'default',
        enableVibrate:true,vibrationPattern:[0,400,200,400],
      });
      let permission=await Notifications.getPermissionsAsync();
      if(!permission.granted && manual && permission.canAskAgain) {
        permission=await Notifications.requestPermissionsAsync({ios:{allowAlert:true,allowBadge:false,allowSound:true}});
      }
      if(!permission.granted) {
        if(manual)Alert.alert('Allow puja alerts','Enable notifications in your phone settings to receive new puja requests with sound.',[
          {text:'Not now',style:'cancel'},{text:'Open settings',onPress:()=>{void Linking.openSettings().catch(()=>showError('Open the app notification settings on your phone.'));}},
        ]);
        return;
      }
      const token=(await Notifications.getExpoPushTokenAsync({projectId})).data;
      if(identity.current.userId!==userId || identity.current.role!=='guruji')return;
      const ok=await request('PUT',{installationId:await installation(),token,projectId,platform:Platform.OS,accountId:userId},userId);
      if(identity.current.userId!==userId)return;
      if(!ok)throw new Error('registration');
      await preference(userId,true);
      if(mounted.current)setEnabled(true);
      if(manual)showError('Puja alerts are on. Each new request will send one notification. Sound and vibration depend on your phone settings.');
    } catch {
      if(manual)showError('Unable to enable puja alerts. Check your connection and try again. Existing portal notifications still work.');
    } finally {working.current=false;if(mounted.current)setBusy(false);}
  }
  async function disable() {
    const userId=identity.current.userId;
    if(!userId || working.current)return;
    working.current=true;setBusy(true);
    try {
      if(!await request('DELETE',{installationId:await installation()},userId))throw new Error();
      await preference(userId,false);
      if(mounted.current && identity.current.userId===userId)setEnabled(false);
    }catch {showError('Unable to turn off puja alerts. Check your connection and retry, or disable notifications in your phone settings.');}
    finally {working.current=false;if(mounted.current)setBusy(false);}
  }
  function openNotification(data:Record<string,unknown>) {
    const target=pushRequestTarget(data,identity.current.userId);
    if(target && identity.current.role==='guruji') {
      pendingTap.current=null;
      navigate(new URL(target,portal).toString());
    } else if(identity.current.userId===null)pendingTap.current=data;
  }
  function onMessage(event:WebViewMessageEvent) {
    if(!isPortalMessageOrigin(event.nativeEvent.url,portal) || event.nativeEvent.data.length>3000)return;
    try {
      const data=JSON.parse(event.nativeEvent.data);
      if(data.type==='sg-push-result' && typeof data.requestId==='string') {
        pending.current.get(data.requestId)?.(data.ok===true);
      } else if(data.type==='sg-push-auth') {
        const next:Auth={userId:Number.isSafeInteger(data.userId)&&data.userId>0?data.userId:null,
          role:typeof data.role==='string'?data.role:null};
        if(next.userId!==identity.current.userId || next.role!==identity.current.role) {
          identity.current=next;setAuth(next);setEnabled(false);autoAttempted.current=null;
          // Remove already-delivered lockscreen notifications on logout/account switch.
          void Notifications.dismissAllNotificationsAsync().catch(()=>{});
        }
        if(pendingTap.current && next.userId!==null) {
          const tap=pendingTap.current;pendingTap.current=null;openNotification(tap);
        }
        if(next.role==='guruji' && next.userId && autoAttempted.current!==next.userId) {
          autoAttempted.current=next.userId;
          void preference(next.userId).then(value=>{if(value && identity.current.userId===next.userId)void enable(false);}).catch(()=>{});
        }
      }
    }catch{/* Ignore unrelated portal bridge messages. */}
  }
  function onPortalLoad() {
    autoAttempted.current=null;
    webview.current?.injectJavaScript(pushAuthScript(portal));
  }
  useEffect(()=>{
    mounted.current=true;
    const response=Notifications.addNotificationResponseReceivedListener(event=>openNotification(event.notification.request.content.data??{}));
    void Notifications.getLastNotificationResponseAsync().then(event=>{
      if(event) {
        openNotification(event.notification.request.content.data??{});
        void Notifications.clearLastNotificationResponseAsync().catch(()=>{});
      }
    }).catch(()=>{});
    const rotation=Notifications.addPushTokenListener(()=>{
      const userId=identity.current.userId;
      if(userId && identity.current.role==='guruji')
        void preference(userId).then(value=>{if(value && identity.current.userId===userId)void enable(false);}).catch(()=>{});
    });
    const resume=AppState.addEventListener('change',state=>{
      if(state==='active'){
        onPortalLoad();
        void Notifications.getPermissionsAsync().then(p=>{if(!p.granted&&mounted.current)setEnabled(false);}).catch(()=>{});
      }
    });
    return ()=>{
      mounted.current=false;response.remove();rotation.remove();resume.remove();
      for(const resolve of [...pending.current.values()])resolve(false);
    };
  },[]);
  return {isGuruji:auth.role==='guruji',enabled,busy,onMessage,onPortalLoad,
    toggle:()=>enabled?Alert.alert('Turn off puja alerts?','Existing in-app notifications will remain unchanged.',[
      {text:'Keep on',style:'cancel'},{text:'Turn off',onPress:()=>{void disable();}},
    ]):void enable(true)};
}
