# 开发计划 - 太初国链H5重要功能更新

## 问题诊断

1. AI智能体点击导航缺少agentId参数 → 路由匹配失败 → 白屏
2. 管理后台嵌套在H5内 → 需要独立拆分

## 新增功能

1. **DID去中心化身份** - DID创建、VC凭证管理、链上身份验证
2. **AI电子名片** - 智能名片生成、分享、NFC、扫码交换

## 执行阶段

### Stage 1: 修复AI对话导航

- 修复AiBrain.tsx中的导航，传递agentId参数
- 修复AiChatDetail.tsx中的路由参数处理
- 补充完整的mock对话数据

### Stage 2: 并行开发新页面

- **Agent A**: DID去中心化身份页面 (src/pages/sub/DidIdentity.tsx)
- **Agent B**: AI电子名片页面 (src/pages/sub/AiBusinessCard.tsx)

### Stage 3: 管理后台独立

- 从App.tsx中移除admin路由
- 创建独立admin入口页面（在H5中作为链接跳转）
- 创建admin独立构建配置

### Stage 4: 入口整合

- 在"我的"页面添加DID身份入口
- 在"我的"页面添加AI电子名片入口
- 更新路由配置
- 构建+部署
