// scripts/check-npm-version.js
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

console.log(chalk.blue('🔍 检查npm包版本...'));

try {
  // 读取当前包信息
  const packageJsonPath = path.join(__dirname, '..', 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
  const packageName = packageJson.name;
  const currentVersion = packageJson.version;

  console.log(chalk.cyan(`包名: ${packageName}`));
  console.log(chalk.cyan(`当前版本: ${currentVersion}`));

  // 检查npm上是否已存在该版本
  try {
    console.log(chalk.gray(`正在检查npm上的版本信息...`));
    const output = execSync(`npm view ${packageName} versions --json`, {
      encoding: 'utf-8',
      stdio: 'pipe',
      timeout: 10000,
    });

    const versions = JSON.parse(output.trim());

    if (Array.isArray(versions)) {
      if (versions.includes(currentVersion)) {
        console.log(
          chalk.red(`\n❌ 错误: 版本 ${currentVersion} 已经在npm上存在！`),
        );
        console.log(chalk.yellow(`已发布的版本列表:`));
        versions.forEach((v) => {
          if (v === currentVersion) {
            console.log(chalk.red(`  - ${v} (当前版本，已存在)`));
          } else {
            console.log(chalk.gray(`  - ${v}`));
          }
        });
        console.log(chalk.yellow(`\n请使用以下命令更新版本号:`));
        console.log(chalk.cyan(`  npm version patch   # 1.0.4 -> 1.0.5`));
        console.log(chalk.cyan(`  npm version minor   # 1.0.4 -> 1.1.0`));
        console.log(chalk.cyan(`  npm version major   # 1.0.4 -> 2.0.0`));
        process.exit(1);
      } else {
        console.log(
          chalk.green(`\n✅ 版本 ${currentVersion} 尚未发布，可以继续发布`),
        );
        if (versions.length > 0) {
          console.log(chalk.gray(`已存在的版本: ${versions.join(', ')}`));
        }
      }
    } else {
      // 如果返回的是单个版本字符串
      if (versions === currentVersion) {
        console.log(
          chalk.red(`\n❌ 错误: 版本 ${currentVersion} 已经在npm上存在！`),
        );
        process.exit(1);
      } else {
        console.log(
          chalk.green(`\n✅ 版本 ${currentVersion} 尚未发布，可以继续发布`),
        );
      }
    }
  } catch (error) {
    // 如果包不存在，会返回404错误，这是正常的（首次发布）
    if (error.message.includes('404') || error.message.includes('Not Found')) {
      console.log(
        chalk.green(`\n✅ 包 ${packageName} 尚未在npm上发布，这是首次发布`),
      );
      console.log(chalk.cyan(`版本 ${currentVersion} 可以发布`));
    } else if (error.message.includes('timeout')) {
      console.log(
        chalk.yellow(`\n⚠️  检查超时，跳过版本检查（可能是网络问题）`),
      );
      console.log(chalk.yellow(`继续发布流程...`));
    } else {
      // 其他错误，可能是网络问题，允许继续但给出警告
      console.log(chalk.yellow(`\n⚠️  无法检查npm版本信息: ${error.message}`));
      console.log(chalk.yellow(`可能是网络问题或包尚未发布，继续发布流程...`));
    }
  }
} catch (error) {
  console.error(chalk.red(`检查版本时出错: ${error.message}`));
  process.exit(1);
}
