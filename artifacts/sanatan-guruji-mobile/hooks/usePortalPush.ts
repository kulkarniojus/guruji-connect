import Constants, { ExecutionEnvironment } from 'expo-constants';
import type { useGurujiPush as InstalledPushHook } from './useGurujiPush';

// Expo Go must not even evaluate expo-notifications: some of its native
// modules exist only in installed builds and throw during module import.
// The runtime is fixed for the lifetime of the app, so the selected hook
// cannot change between renders.
const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient
  || Constants.appOwnership === 'expo';

const previewPush: ReturnType<typeof InstalledPushHook> = {
  isGuruji: false,
  enabled: false,
  busy: false,
  onMessage: () => {},
  onPortalLoad: () => {},
  toggle: () => {},
};

export const usePortalPush: typeof InstalledPushHook = isExpoGo
  ? function usePreviewPush() { return previewPush; }
  : (require('./useGurujiPush') as { useGurujiPush: typeof InstalledPushHook }).useGurujiPush;
