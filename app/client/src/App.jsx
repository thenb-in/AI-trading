// App-side root component. Renders the framework's <App /> (which owns
// auth, routing, sidebar, etc.) and is the place to add app-specific
// pages or composition above/below it.

import { App as StartupApp } from '@startup/App';

export function App() {
  return <StartupApp />;
}
