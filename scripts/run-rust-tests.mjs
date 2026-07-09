#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';

const manifestPath = 'src-tauri/Cargo.toml';

if (!existsSync(manifestPath)) {
  console.log('No Tauri Cargo manifest found; skipping Rust tests');
  process.exit(0);
}

const cargoCheck = spawnSync('cargo', ['--version'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });

if (cargoCheck.error?.code === 'ENOENT') {
  console.error('Cargo is not installed; Rust tests are required because src-tauri/Cargo.toml exists.');
  process.exit(1);
}

if (cargoCheck.status !== 0) {
  process.stderr.write(cargoCheck.stderr || 'Could not verify cargo availability\n');
  process.exit(cargoCheck.status ?? 1);
}

const result = spawnSync('cargo', ['test', '--manifest-path', manifestPath], { stdio: 'inherit' });
process.exit(result.status ?? 1);
