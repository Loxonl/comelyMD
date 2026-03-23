# ComelyMD

![Version](https://img.shields.io/badge/version-v1.1.0-blue.svg)

基于 Go + SQLite 的极简 Markdown 分发平台。采用零依赖的设计，专门为各类低配核心云服务器提供轻巧私密的自动化文档环境托管。

## 功能列表

- **部署极简**：采用纯 Go（`CGO_ENABLED=0`）跨平台编译挂载，由服务端自动 CI 出包构建容器，最终资源开销极小。
- **无目录隔离**：通过无依赖架构下的随机 `Base62` 哈希生成高强度的独立链接访问分配，切断全站遍历。
- **自定义安全组合配置**：
  - 支持 **阅后即焚（单次拉取即销毁）** 功能选项。
  - 支持 **自动附加 4 位随机密码** 设定访问门槛。
  - 内置 **自动过期时限控制** 配置项（永不过期、5 分钟至 30 天可调档位）。
- **完善及灵活的共享支持**：
  - 点击密匙生成模块即可一键提取单独密码落板。
  - 搭载组合式快捷分离按键，支持分段 “仅复制链接” 或 “包含锁与密码整合文本提取” 发送选项。
- **丰富的渲染展现体验**：
  - 提供日 / 夜间自适应渲染的 Highlight 组合层解析，支持人工手动热调整。
  - 阅读页内嵌三大辅助系统浮窗：支持免阻断点击提取源版 `.md` 文本复制、生成源文档实体文件下载和调取高清截断边角界面的实体 PDF。

## 部署指南

当前架构已经全部转移至 Github Containers 预配库实现流水挂载，推荐所有系统使用者皆采用 `docker-compose` 控制：

### 一键运行环境部署
```bash
git clone https://github.com/Loxonl/comelyMD.git
cd comelyMD

# 免本地编译支持！请保障系统装配 Docker：
docker-compose pull
docker-compose up -d
```

> **系统覆盖迭代**：后续当您想取用和切换至更高版本的更新分支时仅需重复执行 `docker-compose pull && docker-compose up -d` 即可。

## 后端接口

核心服务暴露标准数据接口 API 支持跨平协议：

- `POST /api/pages`
  - Body 参量 (`FormData`):
    - `markdown`: (必备) 内容源载体
    - `is_burn`: (可选) 是否点燃单阅控制指令 -> `"true"`
    - `expire_time`: (可选) 失效阻断自动生命期 -> 枚举：`"5m", "1h", "6h", "24h", "7d", "30d"`
    - `with_password`: (可选) 提供四字符暗门校验开启参数 -> `"true"`

## 协议

详查参注：[MIT License](./LICENSE)
