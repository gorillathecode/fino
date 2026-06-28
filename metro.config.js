const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// SDK 54 / React Native 0.81 bundles Hermes 0.12+ which supports private class
// fields natively. However some packages ship untranspiled #-syntax that older
// Hermes in cached builds may reject. The allowlist below forces Metro to run
// Babel on those packages so babel-preset-expo can emit Hermes-safe output.
const packagesRequiringTranspilation = [
  'react-native',
  '@react-native',
  '@react-native-community',
  'expo',
  '@expo',
  // supabase ships modern JS modules
  '@supabase',
  // modern Node-compat packages that may end up in the bundle
  'undici',
];

config.transformer.transformIgnorePatterns = [
  `node_modules/(?!(${packagesRequiringTranspilation.join('|')})/)`,
];

// On web, the Supabase Realtime client tries to use WebSocket at module-init
// time. Node.js 20 (used by Expo Router's static generation) has no native
// WebSocket, causing Metro to hang at ~99% during web bundling.
// FINO does not use realtime subscriptions, so we stub the entire module out
// for the web platform so Metro never has to evaluate it.
const originalResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (
    platform === 'web' &&
    (moduleName === '@supabase/realtime-js' ||
      moduleName.startsWith('@supabase/realtime-js/'))
  ) {
    return { type: 'sourceFile', filePath: require('path').join(__dirname, 'shims/realtime-js-web.js') };
  }
  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
