// scripts/check-npm-auth.js
const { execSync } = require('child_process');
const chalk = require('chalk');
const fs = require('fs');
const path = require('path');

console.log(chalk.blue('🔐 检查npm认证状态...'));

try {
  // 检查是否登录
  let username = null;
  try {
    const output = execSync('npm whoami', {
      encoding: 'utf-8',
      stdio: 'pipe',
      timeout: 5000,
    });
    username = output.trim();
    console.log(chalk.green(`✅ 已登录npm账号: ${username}`));
  } catch (error) {
    if (
      error.message.includes('401') ||
      error.message.includes('Unauthorized')
    ) {
      console.log(chalk.red('\n❌ 未登录npm账号！'));
      console.log(chalk.yellow('\n请先登录npm账号：'));
      console.log(chalk.cyan('  npm login'));
      console.log(chalk.gray('\n或者使用以下命令添加认证令牌：'));
      console.log(chalk.cyan('  npm adduser'));
      process.exit(1);
    } else {
      console.log(chalk.yellow(`⚠️  无法检查登录状态: ${error.message}`));
      throw error;
    }
  }

  // 读取包信息
  const packageJsonPath = path.join(__dirname, '..', 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
  const packageName = packageJson.name;

  // 检查包是否已存在，以及当前用户是否是维护者
  try {
    console.log(chalk.gray(`\n检查包 ${packageName} 的维护者信息...`));
    const viewOutput = execSync(`npm view ${packageName} maintainers --json`, {
      encoding: 'utf-8',
      stdio: 'pipe',
      timeout: 10000,
    });

    const maintainers = JSON.parse(viewOutput.trim());

    if (Array.isArray(maintainers)) {
      // maintainers 可能是字符串数组 ["username <email>"] 或对象数组 [{name: "username", email: "email"}]
      const maintainerNames = maintainers.map((m) => {
        if (typeof m === 'string') {
          // 解析 "username <email>" 格式
          const match = m.match(/^([^\s<]+)/);
          return match ? match[1] : m;
        } else if (m && m.name) {
          // 对象格式
          return m.name;
        }
        return m;
      });
      const isMaintainer = maintainerNames.includes(username);

      console.log(chalk.cyan(`\n包维护者: ${maintainerNames.join(', ')}`));

      if (!isMaintainer) {
        console.log(
          chalk.red(
            `\n❌ 错误: 当前用户 ${username} 不是包 ${packageName} 的维护者！`,
          ),
        );
        console.log(chalk.yellow('\n解决方案：'));
        console.log(chalk.cyan('1. 使用正确的npm账号登录（维护者账号）'));
        console.log(chalk.cyan('2. 或者联系维护者将你添加为协作者：'));
        console.log(chalk.gray(`   npm owner add ${username} ${packageName}`));
        console.log(chalk.gray(`   （需要由当前维护者执行）`));
        process.exit(1);
      } else {
        console.log(
          chalk.green(`\n✅ 当前用户 ${username} 是包的维护者，可以发布`),
        );
      }
    }
  } catch (error) {
    // 如果包不存在（首次发布），这是正常的
    if (error.message.includes('404') || error.message.includes('Not Found')) {
      console.log(chalk.green(`\n✅ 包 ${packageName} 尚未在npm上发布`));
      console.log(chalk.cyan(`当前用户 ${username} 可以发布新包`));
    } else {
      console.log(chalk.yellow(`\n⚠️  无法检查维护者信息: ${error.message}`));
      console.log(chalk.yellow(`继续发布流程（请确保你有发布权限）...`));
    }
  }

  console.log(chalk.green('\n✅ npm认证检查通过'));
} catch (error) {
  console.error(chalk.red(`\n检查认证时出错: ${error.message}`));
  process.exit(1);
}
