const { withAppDelegate, withInfoPlist } = require('@expo/config-plugins');

// Apps built with the iOS 27 SDK are terminated at launch unless they adopt the
// UIScene lifecycle. Expo SDK 54's AppDelegate still creates its own UIWindow, so
// this adds a SceneDelegate that attaches that window to the scene and forwards
// URL opens (Google/Facebook sign-in callbacks, deep links) back to the AppDelegate.
const SCENE_DELEGATE = `
class SceneDelegate: UIResponder, UIWindowSceneDelegate {
  func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
    guard let windowScene = scene as? UIWindowScene,
          let appDelegate = UIApplication.shared.delegate as? AppDelegate,
          let window = appDelegate.window else { return }
    window.windowScene = windowScene
    window.makeKeyAndVisible()
    for context in connectionOptions.urlContexts {
      _ = appDelegate.application(UIApplication.shared, open: context.url, options: [:])
    }
    for userActivity in connectionOptions.userActivities {
      _ = appDelegate.application(UIApplication.shared, continue: userActivity, restorationHandler: { _ in })
    }
  }

  func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
    guard let appDelegate = UIApplication.shared.delegate as? AppDelegate else { return }
    for context in URLContexts {
      _ = appDelegate.application(UIApplication.shared, open: context.url, options: [:])
    }
  }

  func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
    guard let appDelegate = UIApplication.shared.delegate as? AppDelegate else { return }
    _ = appDelegate.application(UIApplication.shared, continue: userActivity, restorationHandler: { _ in })
  }
}
`;

function withSceneManifest(config) {
  return withInfoPlist(config, (config) => {
    config.modResults.UIApplicationSceneManifest = {
      UIApplicationSupportsMultipleScenes: false,
      UISceneConfigurations: {
        UIWindowSceneSessionRoleApplication: [
          {
            UISceneConfigurationName: 'Default',
            UISceneDelegateClassName: '$(PRODUCT_MODULE_NAME).SceneDelegate',
          },
        ],
      },
    };
    return config;
  });
}

function withSceneDelegateClass(config) {
  return withAppDelegate(config, (config) => {
    if (config.modResults.language !== 'swift') {
      throw new Error('[withIosSceneDelegate] Expected a Swift AppDelegate.');
    }
    if (!config.modResults.contents.includes('class SceneDelegate')) {
      config.modResults.contents += SCENE_DELEGATE;
    }
    return config;
  });
}

module.exports = function withIosSceneDelegate(config) {
  return withSceneDelegateClass(withSceneManifest(config));
};
