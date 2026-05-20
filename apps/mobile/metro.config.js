/**
 * Metro configuration for Behbehani CPO mobile.
 *
 * watchFolders: adds libs/shared/types and libs/data-access-mobile to Metro's
 * file watcher so that changes to workspace libs trigger a fast-refresh.
 *
 * nodeModulesPaths / extraNodeModules: ensures Metro resolves workspace package
 * names (@behbehani-cpo/shared-types, @behbehani-cpo/data-access-mobile) to their
 * source trees when the symlinks under apps/mobile/node_modules do not exist
 * (common when npm workspaces deduplicates the install to the root).
 *
 * IMPORTANT — Metro vs Webpack conflict notes (ARCHITECTURE.md §1):
 *   • Do NOT add a webpack.config.js to apps/mobile — Nx webpack plugin would
 *     try to build RN imports with webpack, which fails on RN-only APIs.
 *   • react is intentionally declared only in apps/mobile/package.json.
 *     Adding it to the root package.json silently binds Metro to the root copy
 *     and produces "Invalid hook call" errors at runtime.
 */

const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

// Resolve workspace root (two levels up from apps/mobile).
const workspaceRoot = path.resolve(__dirname, '../..');
const projectRoot = __dirname;

const config = getDefaultConfig(projectRoot);

// ─── Watch folders ────────────────────────────────────────────────────────────
// Metro will watch these directories for changes in addition to the project root.

config.watchFolders = [
  path.resolve(workspaceRoot, 'libs/shared/types'),
  path.resolve(workspaceRoot, 'libs/data-access-mobile'),
];

// ─── Module resolution ────────────────────────────────────────────────────────
// Helps Metro locate workspace packages that may not be symlinked locally.

config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

config.resolver.extraNodeModules = {
  '@behbehani-cpo/shared-types': path.resolve(
    workspaceRoot,
    'libs/shared/types/src',
  ),
  '@behbehani-cpo/data-access-mobile': path.resolve(
    workspaceRoot,
    'libs/data-access-mobile/src',
  ),
};

// ─── .js → .ts fallback resolver ─────────────────────────────────────────────
// libs/shared/types/src/index.ts uses TypeScript ESM imports with explicit
// `.js` extensions (e.g. `export * from './lib/roles.js'`). The TS compiler
// rewrites these to actual .js at build time, and Angular/Node consumers use
// `moduleResolution: "bundler"` which accepts either. Metro, however, takes
// the literal `.js` and fails because the source file is `roles.ts`.
//
// This resolver intercepts any `.js` import and retries the resolution
// without the extension, letting Metro find the `.ts`/`.tsx` source file.
const upstreamResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName.endsWith('.js')) {
    try {
      return context.resolveRequest(
        context,
        moduleName.replace(/\.js$/, ''),
        platform,
      );
    } catch {
      // fall through to upstream
    }
  }
  if (upstreamResolveRequest) {
    return upstreamResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
