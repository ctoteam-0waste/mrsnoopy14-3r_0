// GoogleService-Info.plist is gitignored, so EAS Build never uploads it. On EAS it
// comes from the GOOGLE_SERVICES_INFO_PLIST file env var; locally it falls back to
// the file in the project root.
module.exports = ({ config }) => ({
  ...config,
  ios: {
    ...config.ios,
    googleServicesFile: process.env.GOOGLE_SERVICES_INFO_PLIST ?? config.ios.googleServicesFile,
  },
});
