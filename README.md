# 🎨 ComelyMD

![Version](https://img.shields.io/badge/version-v1.2.0-blue.svg)
![Go](https://img.shields.io/badge/Go-1.21-00ADD8.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

极简、安全、美观的 Markdown 内容分享平台。基于 Go + SQLite，专为低配服务器设计。

---

## ✨ 功能特性

- 🔗 **极短链接** — Base62 随机 ID，独立访问，无法遍历
- 🔥 **阅后即焚** — 单次阅读后自动销毁
- 🔒 **密码保护** — 自动生成 4 位随机密码
- ⏱️ **自动过期** — 支持 5 分钟 ~ 30 天灵活时限
- 🌗 **暗/亮主题** — 跟随系统偏好，支持手动切换
- 📋 **一键操作** — 复制链接、复制链接+密码、点击复制密码
- 📄 **阅读增强** — 侧边栏快捷：复制内容 / 下载 .md / 导出 PDF
- 🎨 **现代 UI** — 自定义设计系统，品牌渐变色，无第三方 CSS 框架
- 🪶 **极致轻量** — 纯 Go 编译（CGO_ENABLED=0），Docker 镜像 < 20MB

## 🖥️ 页面预览

| 首页 | 阅读页 | 密码页 |
|------|--------|--------|
| 编辑器 + 配置面板 | Markdown 渲染 + 侧边工具 | 品牌渐变锁图标验证卡 |

## 🚀 部署

### Docker Compose（推荐）

```bash
git clone https://github.com/Loxonl/comelyMD.git
cd comelyMD

# 拉取预构建镜像并启动
docker-compose pull
docker-compose up -d
```

> 💡 **更新版本**：`docker-compose pull && docker-compose up -d`

### 本地开发

```bash
# 本地构建并启动（含热更新支持）
docker-compose -f docker-compose.dev.yml up -d --build

# 访问 http://localhost:18080
```

## 📡 API

```
POST /api/pages
Content-Type: multipart/form-data
```

| 参数 | 必填 | 说明 |
|------|------|------|
| `markdown` | ✅ | Markdown 内容 |
| `is_burn` | — | `"true"` 开启阅后即焚 |
| `with_password` | — | `"true"` 生成随机密码 |
| `expire_time` | — | `5m` `1h` `6h` `24h` `7d` `30d` |

**响应示例：**
```json
{
  "id": "aBcDeFgH",
  "url": "https://your-domain/p/aBcDeFgH",
  "pwd": "x9k2"
}
```

## 🛠️ 技术栈

| 组件 | 技术 |
|------|------|
| 后端 | Go 1.21 · net/http |
| 数据库 | SQLite（modernc.org/sqlite，纯 Go） |
| Markdown | Goldmark + Bluemonday |
| 代码高亮 | Highlight.js |
| 字体 | Inter + JetBrains Mono |
| 图标 | Font Awesome 6 |
| 部署 | Docker · GitHub Actions · GHCR |

## 📋 Roadmap

- [ ] Markdown 实时预览
- [ ] 多文件/标签页聚合分享
- [ ] 自定义短链接别名
- [ ] 访问统计（可选开启）

## 📄 协议

[MIT License](./LICENSE)
