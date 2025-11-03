// scripts/auto-bump-version.js
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

function parseVersion(version) {
  const match = version.match(
    /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+([0-9A-Za-z.-]+))?$/,
  );
  if (!match) return null;
  return {
    major: parseInt(match[1], 10),
    minor: parseInt(match[2], 10),
    patch: parseInt(match[3], 10),
    prerelease: match[4] || null,
    build: match[5] || null,
  };
}

function formatVersion(v) {
  let base = `${v.major}.${v.minor}.${v.patch}`;
  if (v.prerelease) base += `-${v.prerelease}`;
  if (v.build) base += `+${v.build}`;
  return base;
}

function bumpPatch(version) {
  const parsed = parseVersion(version);
  if (!parsed) throw new Error(`无法解析版本号: ${version}`);
  parsed.patch += 1;
  parsed.prerelease = null;
  parsed.build = null;
  return formatVersion(parsed);
}

console.log(chalk.blue('🔁 检查远程是否已存在当前版本，必要时自动自增版本...'));

try {
  const packageJsonPath = path.join(__dirname, '..', 'package.json');
  const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
  const name = pkg.name;
  let currentVersion = pkg.version;

  console.log(chalk.cyan(`包名: ${name}`));
  console.log(chalk.cyan(`本地版本: ${currentVersion}`));

  let versions = [];
  try {
    const output = execSync(`npm view ${name} versions --json`, {
      encoding: 'utf-8',
      stdio: 'pipe',
      timeout: 15000,
    });
    const parsed = output.trim() ? JSON.parse(output.trim()) : [];
    if (Array.isArray(parsed)) versions = parsed;
    else if (typeof parsed === 'string' && parsed) versions = [parsed];
  } catch (err) {
    // 包不存在（404）或网络问题：首次发布或跳过检查
    if (
      String(err.message).includes('404') ||
      String(err.message).includes('Not Found')
    ) {
      console.log(chalk.green('✅ 远程尚无该包或该版本，跳过自增'));
      process.exit(0);
    }
    console.log(chalk.yellow(`⚠️  无法获取远程版本信息: ${err.message}`));
    console.log(chalk.yellow('继续发布流程（可能是网络问题）...'));
    process.exit(0);
  }

  if (!versions.includes(currentVersion)) {
    console.log(chalk.green('✅ 当前版本未发布，无需自增'));
    process.exit(0);
  }

  console.log(
    chalk.yellow(`⚠️  远程已存在版本 ${currentVersion}，开始自增 patch...`),
  );
  let nextVersion = bumpPatch(currentVersion);
  const existing = new Set(versions);
  while (existing.has(nextVersion)) {
    nextVersion = bumpPatch(nextVersion);
  }

  console.log(chalk.cyan(`尝试更新到新版本: ${nextVersion}`));
  // 直接写入 package.json 以避免对工作区干净状态的要求
  pkg.version = nextVersion;
  fs.writeFileSync(
    packageJsonPath,
    JSON.stringify(pkg, null, 2) + '\n',
    'utf-8',
  );

  // 触发 changelog 更新（不强制提交）
  try {
    execSync('node scripts/generate-changelog.js', { stdio: 'inherit' });
  } catch (e) {
    console.log(chalk.yellow('⚠️  生成 changelog 失败，不影响发布'));
  }

  console.log(chalk.green(`✅ 版本已自增至 ${nextVersion}`));
  process.exit(0);
} catch (error) {
  console.error(chalk.red(`自增版本失败: ${error.message}`));
  process.exit(1);
}
