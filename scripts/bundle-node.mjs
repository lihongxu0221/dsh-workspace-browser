#!/usr/bin/env node
/**
 * Build the node half of the plugin.
 *
 * Each entry below is an independent Cordis plugin row in cordis.patch.yml.
 * They share local modules, so bundling each entry separately keeps a single
 * copy of shared code per entry while every entry stays loadable on its own.
 *
 * Host packages (`@deepseek-ai/*`) are externals: the profile resolves them
 * through the host loader, not through this package's node_modules. Node
 * builtins are external as well.
 *
 * Run `npm run build` (tsc) first. Usage: node scripts/bundle-node.mjs
 */
import { build } from 'esbuild'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..')

/** tsc output name -> published file name. */
const entries = {
  index: 'index',
  'composer-plugin': 'composer',
  'settings-skin-plugin': 'settings-skin',
  'sidebar-plugin': 'sidebar',
  'theme-plugin': 'theme',
  'desktop-menu-plugin': 'desktop-menu',
  'session-title-plugin': 'session-title',
}

const shared = {
  absWorkingDir: repo,
  bundle: true,
  format: 'esm',
  platform: 'node',
  target: 'node22',
  sourcemap: true,
  packages: 'external',
  logLevel: 'warning',
}

await Promise.all(Object.entries(entries).map(async ([source, output]) => {
  await build({
    ...shared,
    entryPoints: [join(repo, 'lib', 'types', `${source}.js`)],
    outfile: join(repo, 'lib', `${output}.js`),
  })
  console.log(`bundle-node: lib/${output}.js <- lib/types/${source}.js`)
}))