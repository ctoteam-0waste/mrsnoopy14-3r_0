const { withPlugins, withPodfile } = require('@expo/config-plugins');
const path = require('path');

// The package's exports map hides its plugin internals, so load them by file path.
const { withFirebaseAppDelegate } = require(
  path.join(path.dirname(require.resolve('@react-native-firebase/app/package.json')), 'plugin/build/ios')
);

// iOS-only slice of @react-native-firebase/app's plugin: configure Firebase in the
// AppDelegate and pull Firebase in through CocoaPods rather than SPM. The Android
// half is skipped on purpose: package.json excludes Firebase from Android autolinking.
const DISABLE_SPM = '$RNFirebaseDisableSPM = true';

function withFirebaseDisableSpm(config) {
  return withPodfile(config, (config) => {
    let contents = config.modResults.contents;
    if (!contents.includes(DISABLE_SPM)) {
      const anchor = /^.*prepare_react_native_project!.*$/m;
      if (!anchor.test(contents)) {
        throw new Error('[withFirebaseIos] Could not find prepare_react_native_project! in ios/Podfile.');
      }
      contents = contents.replace(anchor, (line) => `${line}\n${DISABLE_SPM}`);
    }
    config.modResults.contents = contents;
    return config;
  });
}

module.exports = function withFirebaseIos(config) {
  return withPlugins(config, [withFirebaseAppDelegate, withFirebaseDisableSpm]);
};
