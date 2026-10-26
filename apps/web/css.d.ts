// Ambient declaration for side-effect CSS imports from packages
// (e.g. `import 'driver.js/dist/driver.css'`). Next.js handles the actual
// bundling; this only satisfies TypeScript's module resolution.
declare module '*.css';
