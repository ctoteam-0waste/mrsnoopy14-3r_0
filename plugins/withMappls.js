const { withDangerousMod, withXcodeProject, IOSConfig } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

// 1. Add Mappls Maven repository to android/build.gradle
function withMapplsMavenRepo(config) {
  return withDangerousMod(config, [
    'android',
    (config) => {
      const buildGradlePath = path.join(config.modRequest.platformProjectRoot, 'build.gradle');
      let content = fs.readFileSync(buildGradlePath, 'utf8');

      const mapplsMaven = "        maven { url 'https://maven.mappls.com/repository/mappls/' }";

      // Only add if not already present
      if (!content.includes('maven.mappls.com')) {
        const anchor = "    maven { url 'https://www.jitpack.io' }";
        const allprojectsAnchor = /allprojects\s*{\s*repositories\s*{/;

        if (content.includes(anchor)) {
          content = content.replace(anchor, anchor + '\n' + mapplsMaven);
        } else if (allprojectsAnchor.test(content)) {
          content = content.replace(allprojectsAnchor, (m) => m + '\n' + mapplsMaven);
        } else {
          throw new Error(
            '[withMappls] Could not find a repositories block in android/build.gradle to insert the Mappls maven repo into. ' +
            'The Mappls native SDK will fail to resolve at build time — add ' +
            "\"maven { url 'https://maven.mappls.com/repository/mappls/' }\" to allprojects.repositories manually."
          );
        }

        fs.writeFileSync(buildGradlePath, content, 'utf8');
        console.log('[withMappls] Added Mappls Maven repo to build.gradle');
      }

      return config;
    },
  ]);
}

// 2. Copy .conf and .olf license files to android/app/src/main/assets/
function withMapplsAssets(config) {
  return withDangerousMod(config, [
    'android',
    (config) => {
      const assetsDir = path.join(config.modRequest.platformProjectRoot, 'app/src/main/assets');
      fs.mkdirSync(assetsDir, { recursive: true });

      const sourceDir = path.join(config.modRequest.projectRoot, 'assets');
      const licenseFiles = fs.readdirSync(sourceDir).filter(
        (f) => f.endsWith('.a.conf') || f.endsWith('.a.olf')
      );

      if (licenseFiles.length === 0) {
        throw new Error(
          `[withMappls] No .conf/.olf Mappls license files found in ${sourceDir}. ` +
          'The native Mappls SDK has no license to load and will fail to initialize at runtime.'
        );
      }

      for (const file of licenseFiles) {
        fs.copyFileSync(path.join(sourceDir, file), path.join(assetsDir, file));
        console.log('[withMappls] Copied', file, '→ android/app/src/main/assets/');
      }

      return config;
    },
  ]);
}

// 3. Add $MAPPLS_MAPS.post_install(installer) to ios/Podfile
// CocoaPods reopens the Pods project before post_install with its UUID counter
// reset to 0, so the first Swift package object Mappls adds gets the root
// project object's UUID and Xcode reports Pods.xcodeproj as damaged. Skip
// UUIDs that are already taken before letting Mappls add its packages.
const MAPPLS_POST_INSTALL = [
  '    def (installer.pods_project).generate_uuid',
  '      loop do',
  '        uuid = super',
  '        return uuid unless objects_by_uuid.key?(uuid)',
  '      end',
  '    end',
  '    $MAPPLS_MAPS.post_install(installer)',
  '',
].join('\n');

// Xcode 27 rejects pod targets below iOS 15.0 (e.g. resource bundles at 9.0), and its
// clang fails fmt 11.0.2's consteval checks under C++20, so fmt builds as C++17. This
// runs after react_native_post_install, which resets every pod to C++20.
const XCODE_27_POST_INSTALL = [
  '    installer.pods_project.targets.each do |t|',
  '      t.build_configurations.each do |c|',
  "        c.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '15.1' if c.build_settings['IPHONEOS_DEPLOYMENT_TARGET'].to_f < 15.1",
  "        c.build_settings['CLANG_CXX_LANGUAGE_STANDARD'] = 'c++17' if t.name == 'fmt'",
  '      end',
  '    end',
  '',
].join('\n');

function withMapplsPodfile(config) {
  return withDangerousMod(config, [
    'ios',
    (config) => {
      const podfilePath = path.join(config.modRequest.platformProjectRoot, 'Podfile');
      let content = fs.readFileSync(podfilePath, 'utf8');

      if (!content.includes('$MAPPLS_MAPS.post_install')) {
        const anchor = /post_install do \|installer\|\n/;
        if (!anchor.test(content)) {
          throw new Error(
            '[withMappls] Could not find a post_install block in ios/Podfile. ' +
            'Add "$MAPPLS_MAPS.post_install(installer)" inside post_install manually.'
          );
        }
        content = content.replace(anchor, (m) => m + MAPPLS_POST_INSTALL);
        content = content.replace(
          /(\n\s*react_native_post_install\([\s\S]*?\n\s*\)\n)/,
          (m) => m + XCODE_27_POST_INSTALL
        );
        fs.writeFileSync(podfilePath, content, 'utf8');
        console.log('[withMappls] Added $MAPPLS_MAPS.post_install to Podfile');
      }

      return config;
    },
  ]);
}

// 4. Bundle the iOS .i.conf and .i.olf license files into the app
function withMapplsIosAssets(config) {
  return withXcodeProject(config, (config) => {
    const project = config.modResults;
    const projectName = config.modRequest.projectName;
    const sourceDir = path.join(config.modRequest.projectRoot, 'assets');
    const targetDir = path.join(config.modRequest.platformProjectRoot, projectName);

    const licenseFiles = fs.readdirSync(sourceDir).filter(
      (f) => f.endsWith('.i.conf') || f.endsWith('.i.olf')
    );

    if (licenseFiles.length === 0) {
      throw new Error(
        `[withMappls] No iOS Mappls license files (<appId>.i.conf / <appId>.i.olf) found in ${sourceDir}. ` +
        'The Mappls iOS SDK calls fatalError at launch without them, so the app would crash on open.'
      );
    }

    for (const file of licenseFiles) {
      fs.copyFileSync(path.join(sourceDir, file), path.join(targetDir, file));
      const filepath = `${projectName}/${file}`;
      if (!project.hasFile(filepath)) {
        IOSConfig.XcodeUtils.addResourceFileToGroup({
          filepath,
          groupName: projectName,
          isBuildFile: true,
          project,
        });
      }
      console.log('[withMappls] Bundled', file, '→ ios/' + filepath);
    }

    return config;
  });
}

module.exports = function withMappls(config) {
  config = withMapplsMavenRepo(config);
  config = withMapplsAssets(config);
  config = withMapplsPodfile(config);
  config = withMapplsIosAssets(config);
  return config;
};
