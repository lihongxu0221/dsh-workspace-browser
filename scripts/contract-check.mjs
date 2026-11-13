#!/usr/bin/env node
/**
 * Contract check: verify this plugin still fits the upstream DeepSeek Harness tree.
 *
 * The plugin's `node_modules` pins a published release, so `tsc` alone cannot
 * notice an upstream rename, a dropped export, or a removed service id. This
 * script compares the plugin's declared surfaces against a harness checkout:
 *
 *   [a] peerDependencies  — every `@deepseek-ai/dsh-*` peer exists upstream
 *   [b] source imports    — every `@deepseek-ai/dsh-*` import target exists upstream
 *   [c] imported names    — every named import is exported by that package
 *   [d] dsh.client.inject — every injected service id is still a package
 *
 * Usage:
 *   node scripts/contract-check.mjs [--upstream <path>] [--quiet]
 *
 * `--upstream` defaults to $DSH_UPSTREAM, then to `../../Code` beside the plugin.
 * Exit code 0 on PASS, 1 on FAIL.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

/** Packages the plugin consumes as ordinary npm dependencies, not harness services. */
const EXTERNAL = new Set(['@deepseek-ai/cordis', 'react', 'clsx', 'react-dom'])

const HERE = dirname(dirname(fileURLToPath(import.meta.url)))

/** Parse `--flag value` pairs from argv. */
function parseArgs(argv) {
  const args = { upstream: process.env.DSH_UPSTREAM, quiet: false }
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--quiet') args.quiet = true
    else if (argv[i] === '--upstream') args.upstream = argv[i + 1]
  }
  return args
}

/** Walk a directory tree, yielding file paths whose name matches `keep`. */
function walk(dir, keep, out = []) {
  let entries
  try {
    entries = readdirSync(dir, { withFileTypes: true })
  } catch {
    return out
  }
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name === '.git') continue
    const path = join(dir, entry.name)
    if (entry.isDirectory()) walk(path, keep, out)
    else if (keep(entry.name)) out.push(path)
  }
  return out
}

/** Index every workspace package under `<upstream>/packages` by its manifest name. */
function indexPackages(upstream) {
  const root = join(upstream, 'packages')
  const index = new Map()
  for (const manifestPath of walk(root, name => name === 'package.json')) {
    let manifest
    try {
      manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
    } catch {
      continue
    }
    if (typeof manifest.name !== 'string') continue
    index.set(manifest.name, { dir: dirname(manifestPath), version: manifest.version })
  }
  return index
}

/** Collect the identifiers a package exports, from its `src` tree. */
function exportedNames(pkgDir) {
  const names = new Set()
  const files = walk(join(pkgDir, 'src'), name => /\.(ts|tsx|mts)$/.test(name))
  for (const file of files) {
    let text
    try {
      text = readFileSync(file, 'utf8')
    } catch {
      continue
    }
    for (const match of text.matchAll(/export\s+(?:declare\s+)?(?:type\s+|interface\s+|class\s+|function\s+\*?\s*|const\s+|let\s+|var\s+|enum\s+|abstract\s+class\s+)?([A-Za-z_$][\w$]*)/g)) {
      names.add(match[1])
    }
    for (const match of text.matchAll(/export\s+(?:type\s+)?\{([^}]*)\}/g)) {
      for (const piece of match[1].split(',')) {
        const local = piece.trim().split(/\s+as\s+/).pop()?.trim()
        if (local) names.add(local)
      }
    }
    // A star re-export forwards names this scan cannot enumerate; treat the whole
    // package as permissive rather than reporting a false miss.
    if (/export\s+(?:type\s+)?\*\s+from/.test(text)) names.add('*')
  }
  return names
}

/** Split `import { a, b as c } from '@deepseek-ai/x'` into its parts. */
function parseImports(source) {
  const found = []
  const pattern = /import\s+(type\s+)?([\s\S]*?)\s+from\s+['"]([^'"]+)['"]/g
  for (const match of source.matchAll(pattern)) {
    const clause = match[2]
    const from = match[3]
    if (!from.startsWith('@deepseek-ai/') && !from.startsWith('.')) continue
    const names = []
    const braced = /\{([\s\S]*?)\}/.exec(clause)
    if (braced) {
      for (const piece of braced[1].split(',')) {
        const local = piece.trim().replace(/^type\s+/, '').split(/\s+as\s+/)[0]?.trim()
        if (local && local !== 'type') names.push(local)
      }
    }
    const namespace = /import\s+(?:type\s+)?\*\s+as\s+([A-Za-z_$][\w$]*)/.exec(clause)
    found.push({ from, names, namespace: namespace?.[1] })
  }
  return found
}

/** Map an import specifier to the workspace package it addresses. */
function packageOf(specifier, index) {
  if (index.has(specifier)) return specifier
  const parts = specifier.split('/')
  if (parts.length > 2) {
    const base = parts.slice(0, 2).join('/')
    if (index.has(base)) return base
  }
  return undefined
}

const args = parseArgs(process.argv.slice(2))
const upstream = resolve(args.upstream ?? join(HERE, '..', '..', 'Code'))
const manifest = JSON.parse(readFileSync(join(HERE, 'package.json'), 'utf8'))
const index = indexPackages(upstream)
const fail = []
const note = (line) => { if (!args.quiet) process.stdout.write(`${line}\n`) }

if (index.size === 0) {
  process.stderr.write(`no packages found under ${join(upstream, 'packages')}\n`)
  process.exit(1)
}

// [a] peerDependencies
const peers = Object.keys(manifest.peerDependencies ?? {})
const peerMissing = []
let peerChecked = 0
for (const name of peers) {
  if (EXTERNAL.has(name)) continue
  peerChecked += 1
  if (!index.has(name)) peerMissing.push(name)
}
fail.push(...peerMissing.map(name => `[a] missing peer package: ${name}`))
note(`[a] peerDependencies ${peers.length} (external ${peers.length - peerChecked}), missing ${peerMissing.length}`)

// [b] + [c] source imports and imported names
const sources = walk(join(HERE, 'src'), name => /\.(ts|tsx|mts)$/.test(name))
const importedPackages = new Set()
const nameMissing = []
let importCount = 0
for (const file of sources) {
  const text = readFileSync(file, 'utf8')
  for (const { from, names } of parseImports(text)) {
    if (from.startsWith('.')) continue
    importCount += 1
    const pkg = packageOf(from, index)
    if (pkg === undefined) {
      if (!EXTERNAL.has(from)) fail.push(`[b] unresolved import in ${file}: ${from}`)
      continue
    }
    importedPackages.add(pkg)
    if (names.length === 0) continue
    const exported = exportedNames(index.get(pkg).dir)
    if (exported.has('*')) continue
    for (const name of names) {
      if (!exported.has(name)) nameMissing.push(`${pkg} → ${name} (${file})`)
    }
  }
}
fail.push(...nameMissing.map(line => `[c] not exported upstream: ${line}`))
note(`[b] src imports ${sources.length} files, ${importedPackages.size} packages, missing ${importedPackages.size === 0 ? 0 : [...importedPackages].filter(name => !index.has(name)).length}`)
note(`[c] named imports checked ${importCount}, missing ${nameMissing.length}`)

// [d] injected service ids
const inject = manifest.dsh?.client?.inject ?? []
const injectMissing = inject.filter(id => !index.has(id))
fail.push(...injectMissing.map(id => `[d] missing injected package: ${id}`))
note(`[d] dsh.client.inject ${inject.length}, missing ${injectMissing.length}`)

if (fail.length === 0) {
  note('RESULT: PASS')
  process.exit(0)
}
for (const line of fail) process.stdout.write(`${line}\n`)
process.stdout.write(`RESULT: FAIL (${fail.length})\n`)
process.exit(1)
