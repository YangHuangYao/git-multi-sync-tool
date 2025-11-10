#!/usr/bin/env node

/**
 * Ensures the local Node.js runtime satisfies the project's required version.
 * This script runs before dependency installation via the `preinstall` hook.
 */

const fs = require('fs');
const path = require('path');

const packageJsonPath = path.resolve(__dirname, '..', 'package.json');
const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

const requiredRange = pkg.engines && pkg.engines.node;

if (!requiredRange) {
  process.exit(0);
}

/**
 * Very small semver comparison tailored for a single lower-bound range (>=x.y.z).
 * Returns true if `version` satisfies the `>=` constraint encoded in `range`.
 */
function satisfiesGteRange(version, range) {
  const versionNumbers = version.replace(/^v/, '').split('.').map(Number);
  const match = range.match(/^>=\s*([0-9]+)\.([0-9]+)\.([0-9]+)$/);

  if (!match || versionNumbers.some((n) => Number.isNaN(n))) {
    // Fallback: if the range is not a simple >=x.y.z string, skip strict checking.
    return true;
  }

  const [, requiredMajor, requiredMinor, requiredPatch] = match.map(Number);
  const [major, minor, patch] = versionNumbers;

  if (major > requiredMajor) return true;
  if (major < requiredMajor) return false;
  if (minor > requiredMinor) return true;
  if (minor < requiredMinor) return false;
  return patch >= requiredPatch;
}

const currentVersion = process.version;

if (!satisfiesGteRange(currentVersion, requiredRange)) {
  const message = [
    '',
    '🚫 当前 Node.js 版本不满足项目要求。',
    `   当前版本: ${currentVersion}`,
    `   需要版本: ${requiredRange}`,
    '',
    '请安装符合要求的 Node.js 版本后重新执行。',
    '推荐使用 nvm、fnm、Volta 等版本管理工具进行切换。',
    '',
  ].join('\n');

  console.error(message);
  process.exit(1);
}

