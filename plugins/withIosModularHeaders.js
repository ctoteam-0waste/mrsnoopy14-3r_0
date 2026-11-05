const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

// Google Sign-In pulls in the Swift pod AppCheckCore, which imports GoogleUtilities
// and RecaptchaInterop, and Firebase Messaging's Swift pods import the Firebase core
// pods. Those don't define modules, so pod install fails with static libraries unless
// they are built with modular headers.
const MODULAR_PODS = [
  'GoogleUtilities',
  'RecaptchaInterop',
  'FirebaseCore',
  'FirebaseCoreExtension',
  'FirebaseCoreInternal',
  'FirebaseInstallations',
  'GoogleDataTransport',
  'nanopb',
];

module.exports = function withIosModularHeaders(config) {
  return withDangerousMod(config, [
    'ios',
    (config) => {
      const podfilePath = path.join(config.modRequest.platformProjectRoot, 'Podfile');
      let content = fs.readFileSync(podfilePath, 'utf8');

      if (!content.includes(":modular_headers => true")) {
        const anchor = /\n(\s*)use_expo_modules!\n/;
        if (!anchor.test(content)) {
          throw new Error(
            '[withIosModularHeaders] Could not find use_expo_modules! in ios/Podfile. ' +
            "Add pod '<name>', :modular_headers => true for " + MODULAR_PODS.join(', ') + ' manually.'
          );
        }
        content = content.replace(anchor, (m, indent) =>
          m + MODULAR_PODS.map((name) => `${indent}pod '${name}', :modular_headers => true\n`).join('')
        );
        fs.writeFileSync(podfilePath, content, 'utf8');
      }

      return config;
    },
  ]);
};
