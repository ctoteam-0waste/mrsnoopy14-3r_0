const { getDefaultConfig } = require("expo/metro-config");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Make react-native-svg work on Expo Web
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web' && moduleName === 'react-native-svg') {
    return context.resolveRequest(
      context,
      'react-native-svg/src/ReactNativeSVG.web',
      platform
    );
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
