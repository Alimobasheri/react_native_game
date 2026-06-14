#!/usr/bin/env node
/**
 * Saves a JSON snapshot of swimmer-related config source files + git metadata.
 *
 * Usage:
 *   node scripts/snapshot-swimmer-config.mjs "My experiment notes"
 *   node scripts/snapshot-swimmer-config.mjs --message "Notes here"
 *   npm run snapshot:swimmer -- "Description"
 */

import { execSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(REPO_ROOT, 'experiments', 'snapshots');

const FILE_ALLOWLIST = [
  'src/containers/ReactNativeSkiaGameEngine/Swimmer.stories.tsx',
  'src/Layout.ts',
  'src/systems/PhysicsSystem/SwimmerPhysicsSystem.ts',
  'src/systems/PhysicsSystem/WaterPhysicsSystem.ts',
  'src/systems/PhysicsSystem/WaterShaderSystem.ts',
  'src/Shaders/WaterShader/waterShader.ts',
  'src/Game/path/flowGenerators.ts',
  'src/systems/PhysicsSystem/ObstacleSystem.ts',
  'src/components/TapSwimmer/TapSwimmer-rntge.tsx',
  'src/config/swimmerTuning.ts',
];

function parseArgs(argv) {
  const out = { message: '' };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--message' || a === '-m') {
      out.message = argv[i + 1] ?? '';
      i++;
    } else if (!a.startsWith('-')) {
      out.message = out.message ? `${out.message} ${a}` : a;
    }
  }
  return out.message.trim();
}

function safeExec(cmd, cwd = REPO_ROOT) {
  try {
    return execSync(cmd, { cwd, encoding: 'utf8' }).trim();
  } catch {
    return null;
  }
}

function main() {
  const description = parseArgs(process.argv) || '(no description)';

  const files = {};
  const missing = [];
  for (const rel of FILE_ALLOWLIST) {
    const abs = path.join(REPO_ROOT, rel);
    if (!fs.existsSync(abs)) {
      missing.push(rel);
      files[rel] = null;
    } else {
      files[rel] = fs.readFileSync(abs, 'utf8');
    }
  }

  const head = safeExec('git rev-parse HEAD');
  const branch = safeExec('git rev-parse --abbrev-ref HEAD');
  const status = safeExec('git status --short');

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const base = `swimmer-config_${stamp}`;
  const outPath = path.join(OUT_DIR, `${base}.json`);

  const payload = {
    description,
    timestamp: new Date().toISOString(),
    hostname: os.hostname(),
    git: {
      head,
      branch,
      status: status ? status.split('\n') : [],
    },
    files,
    missingFiles: missing.length ? missing : undefined,
  };

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(payload, null, 2), 'utf8');
  console.log(`Wrote ${path.relative(REPO_ROOT, outPath)}`);
  if (missing.length) {
    console.warn('Missing (skipped content):', missing.join(', '));
  }
}

main();
