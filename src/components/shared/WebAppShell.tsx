import React from 'react';

// Native has its own tab bar and no web navbar; screens render as they are.
// The web version (WebAppShell.web.tsx) adds the site navbar around them.
export function withWebAppShell<P>(Screen: React.ComponentType<P>, _activeTab?: string): React.ComponentType<P> {
  return Screen;
}
