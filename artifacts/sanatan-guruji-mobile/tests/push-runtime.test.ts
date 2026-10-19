import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const source = readFileSync(new URL('../hooks/usePortalPush.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;

function load(executionEnvironment: string, appOwnership: string | null) {
  const loaded: string[] = [];
  const installed = () => 'installed hook';
  const exports: Record<string, any> = {};
  runInNewContext(compiled, {
    exports,
    require(name: string) {
      loaded.push(name);
      if (name === 'expo-constants') return {
        __esModule: true,
        default: { executionEnvironment, appOwnership },
        ExecutionEnvironment: { StoreClient: 'storeClient' },
      };
      if (name === './useGurujiPush') {
        assert.notEqual(executionEnvironment, 'storeClient', 'Expo Go must not load native push');
        assert.notEqual(appOwnership, 'expo', 'Legacy Expo Go must not load native push');
        return { useGurujiPush: installed };
      }
      throw new Error(`Unexpected native dependency: ${name}`);
    },
  });
  return { hook: exports.usePortalPush, installed, loaded };
}

test('Android Expo Go opens without evaluating the installed push dependency tree', () => {
  const runtime = load('storeClient', 'expo');
  const push = runtime.hook(null, 'https://example.com', () => {});
  assert.deepEqual(runtime.loaded, ['expo-constants']);
  assert.equal(push.isGuruji, false);
  assert.equal(push.enabled, false);
  push.onPortalLoad();
  push.onMessage({});
  push.toggle();
});

test('Expo Go detection works with either runtime identification API', () => {
  assert.equal(load('storeClient', null).hook().enabled, false);
  assert.equal(load('unknown', 'expo').hook().enabled, false);
});

test('Installed Android and iOS builds retain the genuine notification hook', () => {
  for (const environment of ['standalone', 'bare']) {
    const runtime = load(environment, null);
    assert.equal(runtime.hook, runtime.installed);
    assert.deepEqual(runtime.loaded, ['expo-constants', './useGurujiPush']);
  }
});
