# 柬聊广告任务、机器人消息投递与活动管理设计

## 背景

当前仓库已经具备以下基础：

- 管理后台已有 `群组管理`、`群主管理`、`财务报表分析`、`品牌配置` 等页面
- 后端已有 `group_product_orders`、`group_bot_alerts`、`group_bot_alert_deliveries`，并能把购买、退款、称呼提醒写入提醒记录
- 机器人提醒已经可以自动写入真实 `messages`，并投递到群主、管理、管理员、财务等目标接收席位

仍然缺少的闭环：

- “广告发送”目前只有后台操作入口，尚未形成完整的真实任务模型
- H5 仍是占位型 `MainShell`，不能像 Android / iOS 一样读取真实会话
- 活动管理栏尚未进入统一的数据模型与后台入口

本设计的目标是把以上三块统一为一套“事件中心 + 投递中心 + 活动中心”。

## 目标

本轮目标：

- 广告发送从页面按钮升级为真实后端任务
- 立即发送广告可真实投递为会话消息
- 定时发送广告先真实落库并可在后台追踪
- 机器人投递的消息在 H5、Android、iOS 前台会话中都可见
- 管理后台新增 `活动管理` 栏，包含：
  - 优惠活动
  - 签到活动
  - 大转盘活动
  - 邀请好友活动
  - 轮播图管理
  - 发红包

本轮不做：

- 完整的任务调度器服务或 cron 守护进程
- 红包、转盘、签到的用户端完整玩法页面
- 广告任务的审批流、撤回流、多级审核流

## 推荐方案

采用“统一事件中心”方案。

核心思路：

- 所有机器人触发事件、广告发送任务、活动通知都统一沉淀为后端事件和投递记录
- 所有最终用户可见内容都统一落到现有 `messages` / `conversations` 体系
- 三端前台继续复用现有会话接口，不新造第二套通知通道
- 管理后台只负责配置、建任务、查看状态，不直接承担消息投递逻辑

这样可以保证：

- 后端只维护一套可追踪、可回放、可审计的消息投递链路
- Android / iOS 几乎不需要额外协议改造
- H5 只需补齐真实会话壳，不必另外造机器人通知专页

## 架构概览

### 后端分层

- `group-bot.service.ts`
  - 负责购买、退款、称呼提醒等机器人事件
  - 负责提醒记录与最终消息投递

- 新增广告任务能力
  - 负责创建广告任务
  - 负责目标群组展开
  - 负责立即投递或定时待执行状态

- 新增活动中心能力
  - 统一保存活动配置
  - 后续供机器人任务、轮播图、红包等复用

- `messages` / `conversations`
  - 仍然是唯一的最终用户可见消息通道

### 前端分层

- `admin-desktop`
  - 创建广告任务
  - 查看广告任务状态
  - 管理活动配置
  - 仍作为唯一后台入口

- `web`
  - 从占位壳升级为真实会话壳
  - 展示机器人投递后的真实会话与消息

- `android` / `ios`
  - 继续走已有 `conversations/messages`
  - 通过会话内容直接看到机器人消息

## 数据模型

### 已有表继续沿用

- `group_product_orders`
- `group_bot_alerts`
- `group_bot_alert_deliveries`
- `conversations`
- `conversation_members`
- `messages`

### 新增广告任务表

#### `group_ad_tasks`

字段：

- `id`
- `content`
- `send_mode`
  - `NOW`
  - `CUSTOM`
- `scheduled_at`
- `enabled_scopes`
- `status`
  - `PENDING`
  - `PROCESSING`
  - `SCHEDULED`
  - `DONE`
  - `FAILED`
- `created_by`
- `created_at`

作用：

- 保存一次广告群发任务本身

#### `group_ad_task_targets`

字段：

- `id`
- `task_id`
- `conversation_id`
- `status`
  - `PENDING`
  - `DELIVERED`
  - `FAILED`
- `delivered_message_id`
- `created_at`

作用：

- 保存一次广告任务展开到每个目标群的投递状态

### 新增活动中心表

建议新增统一活动表 `activity_campaigns`，本轮字段保持最小：

- `id`
- `activity_type`
  - `DISCOUNT`
  - `CHECKIN`
  - `LUCKY_DRAW`
  - `INVITE`
  - `BANNER`
  - `RED_PACKET`
- `title`
- `content`
- `cover_url`
- `status`
  - `DRAFT`
  - `PUBLISHED`
  - `PAUSED`
- `start_at`
- `end_at`
- `config_json`
- `created_by`
- `created_at`
- `updated_at`

说明：

- 六类活动先共用一张活动中心表
- 差异化字段放入 `config_json`
- 这样比起六张独立表更适合当前阶段

## 广告任务执行流程

### 立即发送

1. 管理员在 `群组管理` 中勾选目标群组
2. 管理员填写广告内容
3. 管理员选择 `立即发送`
4. 后端创建 `group_ad_tasks`
5. 后端展开 `group_ad_task_targets`
6. 对每个目标群创建真实 `messages`
7. 更新目标群状态为 `DELIVERED`
8. 汇总更新任务状态为 `DONE`

### 自定义时间发送

1. 管理员勾选目标群组
2. 填写广告内容
3. 选择 `自定义时间发送`
4. 后端创建任务并记录 `scheduled_at`
5. 当前阶段任务状态置为 `SCHEDULED`
6. 后台可见，但本轮先不做独立调度进程

说明：

- 本轮的“定时发送”是“真实落库 + 后台可追踪”
- 下一轮再补真正的后台调度器或 cron 执行器

## 机器人消息投递

### 事件类型

- 购买产品
- 申请退款
- 叫群主
- 叫管理
- 叫管理员
- 叫财务
- 后续广告任务执行结果

### 投递目标

- 群主：群会话中的 `OWNER`
- 管理 / 管理员 / 财务：
  - 当前阶段使用系统席位用户：
    - `system-manager-desk`
    - `system-admin-desk`
    - `system-finance-desk`

### 投递方式

- 若目标用户与机器人没有现成 DM，会自动创建 DM
- 机器人以系统用户身份向对应 DM 写入真实 `messages`
- 同时写入 `group_bot_alert_deliveries`

## 前台会话可见

### H5

当前问题：

- `MainShell.tsx` 仍然只是占位壳

本轮改造：

- 新增真实会话列表读取
- 新增真实消息列表读取
- 登录后进入真实会话页
- 机器人投递消息出现在会话流中

### Android

当前已经走真实 `conversations/messages`。

本轮只需要：

- 确保系统机器人消息能在会话里正常显示
- 对标题为空的系统会话补默认标题，例如“群机器人提醒”

### iOS

当前也已经走真实会话接口。

本轮只需要：

- 确保机器人消息进入会话列表
- 对机器人会话增加更清晰的标题展示

## 管理后台设计

### 群组管理

保留并强化以下交互：

- 勾选目标群组
  - 勾选才发送
  - 不勾选不发送

- 发送时间
  - 立即发送
  - 自定义时间发送

- 机器人权限功能勾选
  - 欢迎语与入群引导
  - 敏感词拦截
  - 群广告发送
  - 购买提醒
  - 退款提醒
  - 称呼提醒

- 广告任务列表
  - 显示最近任务
  - 显示状态
  - 显示任务内容

### 活动管理

新增一级导航 `活动管理`，页面内先用六个模块卡片或标签页表示：

- 优惠活动
- 签到活动
- 大转盘活动
- 邀请好友活动
- 轮播图管理
- 发红包

本轮先做到后台配置能力：

- 创建活动
- 修改活动
- 上下线活动
- 查看活动状态

暂不做完整用户侧玩法流程。

## API 设计

### 已有接口继续沿用

- `GET /api/conversations`
- `GET /api/messages`
- `POST /api/messages`
- `POST /api/group-bot/purchase`
- `POST /api/group-bot/refund`
- `POST /api/group-bot/mention-alert`

### 广告任务接口

- `GET /api/admin/group-bot/ad-tasks`
- `POST /api/admin/group-bot/ad-tasks`

请求体：

```json
{
  "conversationIds": ["c1", "c2"],
  "content": "今晚 20:00 上线会员福利活动",
  "sendMode": "NOW",
  "scheduledAt": null,
  "enabledScopes": ["ADS", "MENTION_ALERTS"]
}
```

### 活动管理接口

本轮建议新增：

- `GET /api/admin/activity-campaigns`
- `POST /api/admin/activity-campaigns`
- `PUT /api/admin/activity-campaigns/:id`
- `POST /api/admin/activity-campaigns/:id/publish`
- `POST /api/admin/activity-campaigns/:id/pause`

## 错误处理

- 未登录：返回 `401`
- 非管理员调用后台接口：返回 `403`
- 广告任务缺少目标群或内容：返回 `400`
- 定时任务时间非法：返回 `400`
- 会话不存在：目标状态标记为 `FAILED`
- 机器人目标席位不存在：自动创建系统席位用户

## 测试

### 后端

- `group-bot` 路由测试补广告任务创建
- 广告任务立即发送后应创建目标消息
- 广告任务定时发送应进入 `SCHEDULED`
- 机器人投递后应写入 `group_bot_alert_deliveries`
- schema 测试补活动表和广告任务表

### 管理后台

- smoke 测试补 `活动管理` 导航
- 验证广告任务页面关键文案存在
- 验证活动管理页面关键模块存在

### H5

- 登录后进入真实会话壳
- 能看到会话列表
- 能看到机器人消息

## 范围控制

为了保证这一轮可以闭环，本轮交付标准定为：

- 广告任务立即发送真实可用
- 定时任务真实落库并后台可见
- 机器人消息能在 H5、Android、iOS 的真实会话里可见
- 活动管理后台入口和统一数据表落地

本轮不承诺：

- 定时任务自动到点执行
- 活动玩法前台完整上线
- 广告任务审批和撤回

## 迁移与兼容

- 不破坏现有购买、退款、称呼提醒接口
- 不改变 Android / iOS 已有会话协议
- H5 从占位壳升级到真实会话壳时，保持认证入口不变
- 管理后台继续保持单一入口，不再拆成多套后台

## 实施顺序

建议按以下顺序实施：

1. 补广告任务表与活动中心表
2. 补广告任务后端接口与立即投递
3. 补管理后台广告任务调用与状态展示
4. 补 H5 真实会话壳
5. 验证 Android / iOS 机器人消息展示
6. 补活动管理页面和后台接口

