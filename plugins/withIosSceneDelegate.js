const { withAppDelegate, withInfoPlist } = require('@expo/config-plugins');

// Apps built with the iOS 27 SDK are terminated at launch unless they adopt the
// UIScene lifecycle. Expo SDK 54's AppDelegate still creates its own UIWindow, so
// this adds a SceneDelegate that attaches that window to the scene and forwards
// URL opens (Google/Facebook sign-in callbacks, deep links) back to the AppDelegate.
const SCENE_DELEGATE = `
class SceneDelegate: UIResponder, UIWindowSceneDelegate {
  private static var launchURL: URL?

  // A link that launches the app arrives here, before React Native has loaded, so
  // its 'url' event is lost, and RCTLinkingManager's getInitialURL (which reads the
  // launch options, empty under the scene lifecycle) returns null. Keep the link and
  // answer getInitialURL with it, so referral links, Universal Links and App Links
  // work on a cold start too.
  private static func rememberLaunchURL(_ url: URL?) {
    guard let url = url, launchURL == nil else { return }
    launchURL = url
    let selector = NSSelectorFromString("getInitialURL:reject:")
    guard let linking = NSClassFromString("RCTLinkingManager"),
          let method = class_getInstanceMethod(linking, selector) else { return }
    typealias GetInitialURL = @convention(c) (AnyObject, Selector, @escaping RCTPromiseResolveBlock, @escaping RCTPromiseRejectBlock) -> Void
    let original = unsafeBitCast(method_getImplementation(method), to: GetInitialURL.self)
    let replacement: @convention(block) (AnyObject, @escaping RCTPromiseResolveBlock, @escaping RCTPromiseRejectBlock) -> Void = { module, resolve, reject in
      if let url = SceneDelegate.launchURL {
        resolve(url.absoluteString)
      } else {
        original(module, selector, resolve, reject)
      }
    }
    method_setImplementation(method, imp_implementationWithBlock(replacement))
  }

  func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
    guard let windowScene = scene as? UIWindowScene,
          let appDelegate = UIApplication.shared.delegate as? AppDelegate,
          let window = appDelegate.window else { return }
    window.windowScene = windowScene
    window.makeKeyAndVisible()
    SceneDelegate.rememberLaunchURL(
      connectionOptions.urlContexts.first?.url
        ?? connectionOptions.userActivities.first(where: { $0.activityType == NSUserActivityTypeBrowsingWeb })?.webpageURL
    )
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
