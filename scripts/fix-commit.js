// scripts/fix-commit.js
const { execSync } = require('child_process');
const chalk = require('chalk');

console.log(chalk.blue('🔧 修复提交命令...'));

try {
  // 手动执行正确的git命令
  console.log(chalk.cyan('📁 添加文件...'));
  execSync('git add .', { stdio: 'inherit' });

  console.log(chalk.cyan('💾 提交代码...'));
  execSync('git commit -m "upd: 同步代码操作"', { stdio: 'inherit' });

  console.log(chalk.green('✅ 手动提交完成'));

  // 使用git-sync推送
  console.log(chalk.cyan('🚀 使用git-sync推送...'));
  execSync('git-sync push', { stdio: 'inherit' });
} catch (error) {
  console.error(chalk.red('提交失败:'), error.message);
}
console.log(chalk.blue('🔧 提交修复脚本执行完毕。'));
