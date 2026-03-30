# RHMCP 测试文档

## 快速开始

```bash
# 安装依赖
npm install

# 运行测试
npm test

# 运行覆盖率测试
npm run test:coverage

# 监视模式
npm run test:watch
```

## 代码质量

```bash
npm run lint          # 运行 ESLint
npm run lint:fix      # 自动修复
npm run format        # 格式化代码
npm run format:check  # 检查格式
```

## 测试结构

```
tests/
├── api-client.test.ts      # API 客户端测试
├── config-loader.test.ts   # 配置加载测试
├── server.test.ts          # 服务器测试
├── tools.test.ts           # 工具执行测试
├── storage.test.ts         # 存储模块测试
├── validators.test.ts      # 参数验证测试
├── fixtures.ts             # 测试数据
├── mock-fetch.ts           # Fetch Mock
├── mock-fs.ts              # 文件系统 Mock
└── setup.ts                # 测试配置
```