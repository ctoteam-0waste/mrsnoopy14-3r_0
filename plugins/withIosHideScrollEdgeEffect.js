const { withAppDelegate } = require('@expo/config-plugins');
const { mergeContents } = require('@expo/config-plugins/build/utils/generateCode');

// iOS 26+ draws a scroll edge effect behind the status bar on every scroll view.
// With Reduce Transparency on it becomes an opaque band in the scroll view's
// background colour, covering the green headers that sit under the status bar.
// The app has no native nav bars, so the effect is hidden on all scroll views.
const EXTENSION = `
extension UIScrollView {
  static func hideTopScrollEdgeEffect() {
    guard #available(iOS 26.0, *) else { return }
    let original = #selector(UIView.didMoveToWindow)
    let replacement = #selector(UIScrollView.kv_didMoveToWindow)
    guard let originalMethod = class_getInstanceMethod(UIScrollView.self, original),
          let replacementMethod = class_getInstanceMethod(UIScrollView.self, replacement) else { return }
    if class_addMethod(UIScrollView.self, original, method_getImplementation(replacementMethod), method_getTypeEncoding(replacementMethod)) {
      class_replaceMethod(UIScrollView.self, replacement, method_getImplementation(originalMethod), method_getTypeEncoding(originalMethod))
    } else {
      method_exchangeImplementations(originalMethod, replacementMethod)
    }
  }

  @objc private func kv_didMoveToWindow() {
    kv_didMoveToWindow()
    if #available(iOS 26.0, *) {
      topEdgeEffect.isHidden = true
    }
  }
}
`;

module.exports = function withIosHideScrollEdgeEffect(config) {
  return withAppDelegate(config, (config) => {
    if (config.modResults.language !== 'swift') {
      throw new Error('[withIosHideScrollEdgeEffect] Expected a Swift AppDelegate.');
    }
    let contents = mergeContents({
      tag: 'karmaverse-hide-scroll-edge-effect',
      src: config.modResults.contents,
      newSrc: '    UIScrollView.hideTopScrollEdgeEffect()',
      anchor: /window = UIWindow\(frame: UIScreen\.main\.bounds\)/,
      offset: 1,
      comment: '//',
    }).contents;
    if (!contents.includes('func hideTopScrollEdgeEffect()')) {
      contents += EXTENSION;
    }
    config.modResults.contents = contents;
    return config;
  });
};
