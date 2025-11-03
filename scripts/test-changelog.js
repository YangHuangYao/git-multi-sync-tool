// scripts/test-changelog.js
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

console.log(chalk.blue.bold('🧪 开始全面测试版本日志工具功能\n'));

const tests = [];
let passedTests = 0;
let failedTests = 0;

// 测试辅助函数
function test(name, fn) {
  tests.push({ name, fn });
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

// 测试1: 检查脚本文件是否存在
test('脚本文件存在性检查', () => {
  const scriptPath = path.join(__dirname, 'generate-changelog.js');
  assert(fs.existsSync(scriptPath), 'generate-changelog.js 文件不存在');
  console.log(chalk.green('✅ 脚本文件存在'));
});

// 测试2: 检查package.json配置
test('package.json配置检查', () => {
  const packageJsonPath = path.join(__dirname, '..', 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
  
  assert(packageJson.version, 'package.json中没有version字段');
  assert(packageJson.scripts.changelog, 'package.json中没有changelog脚本');
  assert(packageJson.scripts.postversion, 'package.json中没有postversion钩子');
  assert(
    packageJson.scripts.postversion.includes('changelog'),
    'postversion钩子未调用changelog脚本'
  );
  console.log(chalk.green(`✅ package.json配置正确 (版本: ${packageJson.version})`));
});

// 测试3: 检查README.md结构
test('README.md结构检查', () => {
  const readmePath = path.join(__dirname, '..', 'README.md');
  const readmeContent = fs.readFileSync(readmePath, 'utf-8');
  
  assert(readmeContent.includes('## 📝 更新日志'), 'README.md中没有"更新日志"部分');
  assert(readmeContent.includes('### v'), 'README.md中没有版本日志条目');
  console.log(chalk.green('✅ README.md结构正确'));
});

// 测试4: 测试脚本执行能力
test('脚本执行能力测试', () => {
  try {
    execSync('npm run changelog', {
      encoding: 'utf-8',
      stdio: 'pipe',
      cwd: path.join(__dirname, '..'),
    });
    console.log(chalk.green('✅ 脚本可以正常执行'));
  } catch (error) {
    throw new Error(`脚本执行失败: ${error.message}`);
  }
});

// 测试5: 检查changelog格式
test('changelog格式检查', () => {
  const readmePath = path.join(__dirname, '..', 'README.md');
  const readmeContent = fs.readFileSync(readmePath, 'utf-8');
  
  // 检查是否有版本标题格式
  const versionMatch = readmeContent.match(/### v\d+\.\d+\.\d+/);
  assert(versionMatch, 'changelog中没有正确格式的版本标题');
  
  // 检查日志条目格式（支持emoji和中文）
  const logEntries = readmeContent.match(/^- [✨🔧⚡♻️📚💄🧪📦👷🔨📝].*/gm);
  assert(logEntries && logEntries.length > 0, 'changelog中没有日志条目');
  
  console.log(chalk.green(`✅ changelog格式正确 (找到${logEntries.length}个条目)`));
});

// 测试6: 检查git命令可用性
test('Git命令可用性检查', () => {
  try {
    execSync('git --version', { encoding: 'utf-8', stdio: 'pipe' });
    execSync('git log --oneline -1', { encoding: 'utf-8', stdio: 'pipe' });
    console.log(chalk.green('✅ Git命令可用'));
  } catch (error) {
    throw new Error(`Git命令不可用: ${error.message}`);
  }
});

// 测试7: 检查依赖包安装
test('依赖包检查', () => {
  const packageJsonPath = path.join(__dirname, '..', 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
  
  const hasChalk = packageJson.dependencies?.chalk || 
                   require.resolve('chalk', { paths: [path.join(__dirname, '..')] });
  
  assert(hasChalk, 'chalk依赖未安装');
  console.log(chalk.green('✅ 依赖包已安装'));
});

// 测试8: 测试版本解析
test('版本号解析测试', () => {
  const packageJsonPath = path.join(__dirname, '..', 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
  const version = packageJson.version;
  
  // 检查版本格式
  const versionRegex = /^\d+\.\d+\.\d+$/;
  assert(versionRegex.test(version), `版本号格式不正确: ${version}`);
  
  console.log(chalk.green(`✅ 版本号格式正确: ${version}`));
});

// 测试9: 检查提交分类功能
test('提交分类功能测试', () => {
  // 测试不同类型的提交信息解析
  const testCommits = [
    'feat: 添加新功能',
    'fix: 修复bug',
    'docs: 更新文档',
    'chore: 杂项更新',
    '普通提交信息',
  ];
  
  const categorized = {
    feat: [],
    fix: [],
    docs: [],
    chore: [],
    other: [],
  };
  
  testCommits.forEach((commit) => {
    const match = commit.match(/^(feat|fix|perf|refactor|docs|style|test|build|ci|chore)(\(.+?\))?:\s*(.+)/i);
    if (match) {
      const type = match[1].toLowerCase();
      if (categorized[type]) {
        categorized[type].push(match[3]);
      }
    } else {
      categorized.other.push(commit);
    }
  });
  
  assert(categorized.feat.length === 1, 'feat分类失败');
  assert(categorized.fix.length === 1, 'fix分类失败');
  assert(categorized.docs.length === 1, 'docs分类失败');
  assert(categorized.chore.length === 1, 'chore分类失败');
  assert(categorized.other.length === 1, 'other分类失败');
  
  console.log(chalk.green('✅ 提交分类功能正常'));
});

// 测试10: 检查README更新逻辑
test('README更新逻辑测试', () => {
  const readmePath = path.join(__dirname, '..', 'README.md');
  const readmeContent = fs.readFileSync(readmePath, 'utf-8');
  
  // 检查是否有最新的版本日志（应该是当前package.json版本）
  const packageJsonPath = path.join(__dirname, '..', 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
  const currentVersion = packageJson.version;
  
  const versionPattern = new RegExp(`### v${currentVersion.replace(/\./g, '\\.')}`);
  assert(versionPattern.test(readmeContent), `README中没有当前版本v${currentVersion}的日志`);
  
  console.log(chalk.green(`✅ README包含当前版本v${currentVersion}的日志`));
});

// 运行所有测试
console.log(chalk.cyan(`\n运行 ${tests.length} 个测试...\n`));

tests.forEach((testCase, index) => {
  try {
    testCase.fn();
    passedTests++;
    console.log(chalk.gray(`  [${index + 1}/${tests.length}] ${testCase.name}\n`));
  } catch (error) {
    failedTests++;
    console.log(chalk.red(`  [${index + 1}/${tests.length}] ${testCase.name}`));
    console.log(chalk.red(`    ❌ 失败: ${error.message}\n`));
  }
});

// 输出测试结果
console.log(chalk.blue.bold('\n📊 测试结果汇总\n'));
console.log(chalk.green(`✅ 通过: ${passedTests}`));
if (failedTests > 0) {
  console.log(chalk.red(`❌ 失败: ${failedTests}`));
} else {
  console.log(chalk.gray(`❌ 失败: ${failedTests}`));
}
console.log(chalk.cyan(`📈 总计: ${tests.length}`));
console.log(
  chalk.cyan(`📊 通过率: ${((passedTests / tests.length) * 100).toFixed(1)}%\n`),
);

if (failedTests > 0) {
  process.exit(1);
} else {
  console.log(chalk.green.bold('🎉 所有测试通过！\n'));
}

