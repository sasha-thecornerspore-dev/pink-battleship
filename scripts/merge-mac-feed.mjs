#!/usr/bin/env node
// Merge the per-arch latest-mac.yml files produced by separate arm64 and x64
// runners into the single feed electron-updater reads. MacUpdater picks the
// right zip by arch from `files` (urls containing "arm64" vs not), so the merged
// feed just needs every file entry. Top-level path/sha512 (legacy fields) are
// kept from the first feed.
//
//   node scripts/merge-mac-feed.mjs <arm64.yml> <x64.yml> > latest-mac.yml

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

/** Split an electron-builder feed into { version, files: string[] (raw entry blocks), rest: string[] }. */
export function parseFeed(text) {
  const lines = text.replace(/\r\n/g, '\n').split('\n')
  let version = null
  const files = []
  const rest = []
  let inFiles = false
  for (const line of lines) {
    if (line.trim() === '') continue
    if (/^files:\s*$/.test(line)) {
      inFiles = true
      continue
    }
    if (inFiles && /^\s/.test(line)) {
      if (/^\s*-\s/.test(line)) files.push([line])
      else if (files.length) files[files.length - 1].push(line)
      else throw new Error(`Malformed files block near: ${line}`)
      continue
    }
    inFiles = false
    const v = line.match(/^version:\s*['"]?([^'"\s]+)['"]?\s*$/)
    if (v) version = v[1]
    rest.push(line)
  }
  if (!version) throw new Error('Feed has no version')
  if (!files.length) throw new Error('Feed has no files')
  return { version, files: files.map((f) => f.join('\n')), rest }
}

export function mergeFeeds(...texts) {
  const feeds = texts.map(parseFeed)
  const version = feeds[0].version
  for (const f of feeds) {
    if (f.version !== version) throw new Error(`Version mismatch: ${version} vs ${f.version}`)
  }
  const seen = new Set()
  const files = []
  for (const f of feeds) {
    for (const entry of f.files) {
      const url = entry.match(/url:\s*(\S+)/)?.[1]
      if (url && seen.has(url)) continue
      if (url) seen.add(url)
      files.push(entry)
    }
  }
  const [versionLine, ...others] = feeds[0].rest
  return [versionLine, 'files:', ...files, ...others].join('\n') + '\n'
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const paths = process.argv.slice(2)
  if (paths.length < 2) {
    console.error('usage: merge-mac-feed.mjs <feed.yml> <feed.yml> [...]')
    process.exit(2)
  }
  process.stdout.write(mergeFeeds(...paths.map((p) => readFileSync(p, 'utf8'))))
}
