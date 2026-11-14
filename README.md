# Tavo 第四面墙 · 角色直聊（v1.1.1）

> 非官方 Tavo 社区插件；已检查 manifest 必填字段和安装包结构，尚未在真实 Tavo App 中完成端侧测试。请先备份聊天。

## 功能

- **直接读取当前 Tavo 聊天**：通过 `tavo.message.find([], { role: 'assistant' })` 读取当前会话已经保存的 AI 回复，不必手工导出。
- **长期记忆读取**：读取 `tavo.memory.current()`，并在可用时读取归档的向量长记忆。
- **单窗口和手动选择**：从角色卡、角色卡标题和历史章节 NAME 字段尝试识别多个角色，选择其中一位进行第四面墙直聊，不生成多个会客窗口。
- **独立预设和文本清理**：角色讨论真正发生过的故事，而不是输出下一章；自动剔除思维链、章节头、NOTES 和好感度格式，只清理模型可见的历史摘录，不修改 Tavo 原消息。
- **不覆盖原聊天**：会客厅交谈保存在当前聊天专用文件 `fourthwall_direct_v11.json`，保留主线完整性。

## v1.1.1 修复

v1.1.0 的 Manifest v2 忘记声明 `localization`，Tavo v1.10 安装时出现“manifest 缺少 localization 声明”。此版补全 `localization.defaultLocale`、`localization.resources`，增加 `locales/en.json`、`locales/zh-CN.json` 和动态 UI 文案切换。

## 安装

1. 下载 [v1.1.1 安装包](dist/tavo-fourthwall-v1.1.1.tpg)。
2. Tavo → 设置 → 插件 → 安装 → 导入此 `.tpg` 文件并启用。
3. 开启 **高级渲染**，进入已有聊天，点击紫色 `✦`。
4. 选择人物，点击 **同步剧情** 后询问她/他已经发生的主线经历。

## 源码结构

```text
manifest.json
locales/en.json
locales/zh-CN.json
ui/panel.html
ui/panel.js
scripts/build.py
```

## 限制与隐私

此插件读取当前聊天中的人物卡、AI 回复和可访问的记忆。每次直聊生成会把部分精选内容交给你当前绑定的模型 API；它不额外运行第三方遥测服务器。自动检测角色名使用启发式规则，可能需要将来增强。**尚未经过真实 Tavo 端侧安装与运行验证**，安装失败或功能异常请提交 Issue。

官方参考：[Tavo 插件开发](https://docs.tavoai.dev/cn/guides/plugin-development/)、[TavoJS API](https://docs.tavoai.dev/cn/guides/javascript-api/)。

版权所有者：社区贡献者；项目未明确授权开源许可证。
