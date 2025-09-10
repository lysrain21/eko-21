Eko Twitter Insight Extension — 使用说明

概述
- 功能：
  - 抓取你在 X/Twitter 上“关注列表”中所有人最近 7 天的推文
  - 统计出现的词语频次（过滤无意义词、URL、数字等），只保留频次 ≥ 5 的关键词，并按降序输出
  - 抓取你最近 7 天的推文学习你的文风
  - 基于 Top3 关键词，仿照你的发文风格自动生成 1–3 条草稿
- 形态：Chrome 扩展（Side Panel 侧栏 + 背景页 + 内容脚本）

安装与构建
1) 安装依赖（在仓库根目录）
   - pnpm install
2) 构建扩展
   - pnpm --filter @eko-ai/twitter-insight-extension run build
   - 产物在 example/twitter-insight-extension/dist
3) 在 Chrome 加载
   - 打开 chrome://extensions
   - 打开“开发者模式” → “加载已解压的扩展程序” → 选择 dist 目录

使用流程
1) 登录 X/Twitter，并打开一个 x.com 页签（建议 Home 页面）
2) 打开扩展侧栏（Side Panel）
3) 在侧栏中配置 LLM：
   - Provider：anthropic / openai / google
   - Model：对应模型名
   - API Key：你的密钥（仅本地演示，生产建议采用后端代理）
   - Base URL（可选）：你的模型代理地址
4) 点击“Run”
   - 背景页会自动执行固定的工作流，无需输入 prompt：
     - analyze_following_keywords(minCount=5)
     - collect_my_posts()
     - LLM 生成围绕 Top3 关键词的 1–3 条草稿
   - 请保持 X/Twitter 页签处于活跃状态，内容脚本会滚动采集
5) 查看侧栏日志
   - 你会看到 Plan（工作流 XML）、工具调用日志、抓取统计与最终草稿
6) 如需中止，点击“Stop”
   - 会立即中止当前任务（调用 eko.abortTask）

注意事项
- 必须已登录 X/Twitter；采集时需要在 x.com 页签上
- DOM 选择器会随 X 界面变化而调整，若采集数量异常偏少，可：
  - 手动点击 Home → Following 再运行
  - 提交问题并附带控制台截图，我方可更新选择器
- API Key 安全：
  - 演示中 Key 存储在 chrome.storage.sync 中
  - 生产建议通过后端代理（填入 Base URL），前端不直接暴露 Key

验证结果
- 关注列表采集统计：日志中包含 postsCount 与 keywords（已按频次降序）
- 个人推文采集：日志显示我的 postsCount
- 草稿质量：风格应接近你最近的发文习惯（长度/语气/是否带表情或标签），可复制到 X 做二次润色

排障建议
- 未采集到数据：确认登录、确保在 x.com 页面；必要时手动切到 Following 标签
- 加载失败：在扩展详情页打开“Service Worker 检查视图”查看 background.js 日志
- 内容脚本调试：在 X 页面 DevTools → Sources → content.js 查看报错

目录说明
- public/manifest.json：Chrome 扩展清单（Manifest V3）
- src/sidebar：侧栏 UI（配置 LLM、启动/停止、查看日志）
- src/background：背景逻辑（Eko 初始化、任务运行、日志回传、终止任务）
- src/content：运行在 X 页面，用于滚动采集关注/个人推文
- src/agent/twitter_insight_agent.ts：自定义 Agent（两个工具 + 执行计划说明）

