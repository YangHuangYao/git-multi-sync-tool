// test/unit/config-loader.test.js
const configLoader = require('../../dist/lib/config-loader').default;
const fs = require('fs-extra');
const path = require('path');
const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');

describe('ConfigLoader', () => {
  const testDir = path.join(__dirname, 'test-temp');

  beforeEach(() => {
    // 创建测试目录
    fs.ensureDirSync(testDir);
  });

  afterEach(() => {
    // 清理测试目录
    fs.removeSync(testDir);
  });

  it('应该正确解析配置文件', () => {
    // 创建测试配置文件
    const configContent = `
# 测试配置文件
https://github.com/user/repo1.git
https://gitee.com/user/repo1.git
[backup] https://gitlab.com/user/repo1.git
`;

    fs.writeFileSync(path.join(testDir, '.git-remotes.txt'), configContent);

    const config = configLoader.loadConfig(testDir);

    assert.strictEqual(config.exists, true);
    assert.strictEqual(config.remotes.length, 3);
    assert.strictEqual(config.remotes[0].name, 'repo1');
    assert.strictEqual(config.remotes[1].name, 'remote2');
    assert.strictEqual(config.remotes[2].name, 'backup');
  });

  it('应该验证配置文件格式', () => {
    const invalidConfig = `
无效的URL
http://invalid-url
`;

    fs.writeFileSync(path.join(testDir, '.git-remotes.txt'), invalidConfig);

    const validation = configLoader.validateConfig(testDir);
    assert.strictEqual(validation.valid, false);
  });
});
