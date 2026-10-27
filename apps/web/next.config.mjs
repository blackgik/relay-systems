import path from 'node:path';
import { fileURLToPath } from 'node:url';
import withPWA from '@ducanh2912/next-pwa';

// Pin the monorepo root so a stray lockfile in a parent directory is not
// mistaken for the workspace root.
const monorepoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '../..');

/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: monorepoRoot,
  // A second dev server (e.g. a preview on another port) must not share .next
  // with the main one or both corrupt each other's manifests.
  distDir: process.env.NEXT_DIST_DIR || '.next',
  webpack(config) {
    config.module.rules.push({
      test: /\.svg$/,
      resourceQuery: { not: [/__next_metadata__/] },
      use: [
        {
          loader: '@svgr/webpack',
          options: {
            svgoConfig: {
              plugins: [
                {
                  name: 'preset-default',
                  params: { overrides: { removeViewBox: false } },
                },
                'prefixIds',
              ],
            },
          },
        },
      ],
    });
    return config;
  },
};
export default withPWA({ dest: 'public', disable: process.env.NODE_ENV === 'development', register: true })(nextConfig);
