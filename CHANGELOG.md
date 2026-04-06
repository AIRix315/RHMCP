# Changelog

All notable changes to this project will be documented in this file.

## [1.1.1] - 2026-04-06

### Added

- **新APP支持**: LTX23数字人系列(5个)、RTXVSR视频超分
- **OpenClaw Skill**: Agent智能决策层，支持场景映射和参数自动填充
- **安装验证清单**: docs/INSTALLATION_VERIFICATION.md

### Changed

- **ESLint配置优化**: 修复skills目录检查错误
- **APP列表更新**: references/apps.json新增7个官方APP

### Fixed

- **CI/CD构建问题**: ESLint配置修复，所有测试通过(90个)

---

## [1.0.0] - 2026-03-30

## [1.0.0] - 2026-03-30

### Added

#### Configuration System

- **New configuration format**: Separated config files into `service.json`, `apps.json`, and `.env`
- **Backward compatibility**: Auto-detect and migrate old `rhmcp-config.json` format
- **Environment variables**: Full support for `RUNNINGHUB_API_KEY`, `RUNNINGHUB_BASE_URL`, `RHMCP_CONFIG`
- **baseUrl auto-detection**: Automatic detection of account region (`.cn` or `.ai`)

#### CLI Commands

- **`rhmcp --update-apps`**: Update APP list from GitHub
- **`rhmcp --migrate`**: Migrate old config to new format
- **Improved help output**: Better usage documentation

#### Platform Support

- **OpenClaw MCP configuration**: Added `references/openclaw/` with example configs
- **OpenCode MCP configuration**: Added `references/opencode/` with example configs

#### Type Safety

- **BaseUrl type**: Union type `"auto" | "www.runninghub.cn" | "www.runninghub.ai"`
- **AppsConfig type**: Layered structure with `server` and `user` sections

### Changed

#### Package

- **Package name**: Changed from `rhmcp` to `runninghub-mcp`
- **Added dependency**: `dotenv` for environment variable support
- **Updated description**: Comprehensive platform support description

#### Architecture

- **Async config loading**: `loadConfig()` is now async to support auto-detection
- **Config validation**: Unified validation supporting both old and new formats
- **Loader refactoring**: Cleaner separation of concerns in `loader.ts`

### Fixed

- Type safety for optional `apps` in `RunningHubConfig`
- Proper handling of undefined values in config parsing
- Resource handling for merged apps list

### Deprecated

- `loadConfigSync()`: Use async `loadConfig()` instead

### Documentation

- **Updated README.md**: Installation and configuration guide
- **Updated CHANGELOG.md**: This file
- **Added config templates**: `config/service.example.json`, `config/apps.example.json`

---

## Configuration Migration Guide

### From old format (rhmcp-config.json) to new format:

```bash
# Automatic migration
rhmcp --migrate

# Or manually create files
# service.json - service configuration
# apps.json - APP configurations
# .env - API key
```

### Old format:

```json
{
  "apiKey": "your_key",
  "baseUrl": "www.runninghub.cn",
  "apps": { ... }
}
```

### New format:

**.env:**

```bash
RUNNINGHUB_API_KEY=your_key
```

**service.json:**

```json
{
  "baseUrl": "auto",
  "storage": { "mode": "local" },
  ...
}
```

**apps.json:**

```json
{
  "server": { ... },
  "user": { ... }
}
```

---

[1.0.0]: https://github.com/AIRix315/RHMCP/releases/tag/v1.0.0
