# 策略规则配置功能优化方案

## 一、问题分析

### 1.1 当前实现状态

**后端已实现**：
- `PUT /api/policies` 支持更新规则的 `warn_threshold`、`block_threshold`、`auto_mask`、`auto_rewrite`
- 检测引擎 (`dynamic-engine.ts`) 正确读取策略配置
- 根据阈值决定动作：`score >= blockThreshold → block`, `score >= warnThreshold → warn`
- `autoMask=true` 时返回 'mask' 动作
- `autoRewrite=true` 时返回 'rewrite' 动作

**问题点**：
1. **前端字段名与 API 不匹配**：
   - API 返回 `snake_case`：`warn_threshold`, `block_threshold`, `auto_mask`, `auto_rewrite`
   - 前端接口定义使用 `snake_case`，但检测引擎使用 `camelCase`：`warnThreshold`, `blockThreshold`
   
2. **缺少自动脱敏/改写的实际处理逻辑**：
   - 检测引擎只返回动作类型，没有实际执行脱敏或改写操作
   - 需要 LLM 或规则引擎来处理敏感内容

3. **UI 交互体验问题**：
   - 阈值滑块范围不明确（0-100？）
   - 没有保存成功/失败的反馈提示
   - 规则配置修改后需要清除缓存

## 二、优化方案

### 2.1 字段名统一（已完成部分）

**目标**：确保前后端字段名一致

| 数据库字段 | API 返回字段 | 前端使用字段 | 检测引擎字段 |
|-----------|------------|------------|------------|
| `warn_threshold` | `warn_threshold` | `warn_threshold` | `warnThreshold` |
| `block_threshold` | `block_threshold` | `block_threshold` | `blockThreshold` |
| `auto_mask` | `auto_mask` | `auto_mask` | `autoMask` |
| `auto_rewrite` | `auto_rewrite` | `auto_rewrite` | `autoRewrite` |

**检测引擎已处理映射**：
```typescript
// dynamic-engine.ts 第368-371行
warnThreshold: parseFloat(rule.warnThreshold) || 50,
blockThreshold: parseFloat(rule.blockThreshold) || 80,
autoMask: rule.autoMask || false,
autoRewrite: rule.autoRewrite || false,
```

### 2.2 自动脱敏功能实现

**功能描述**：当 `auto_mask=true` 且检测分数达到警告阈值时，自动对敏感内容进行脱敏处理。

**实现方案**：

```typescript
// 在检测引擎中添加脱敏处理
function maskSensitiveContent(text: string, findings: Finding[]): string {
  let maskedText = text;
  for (const finding of findings) {
    if (finding.evidence) {
      for (const evidence of finding.evidence) {
        // 用 *** 替换敏感内容
        maskedText = maskedText.replace(
          new RegExp(escapeRegex(evidence), 'gi'),
          '***'
        );
      }
    }
  }
  return maskedText;
}
```

**返回数据结构**：
```json
{
  "action": "mask",
  "processedText": "这是一条***内容，点击***产品",
  "maskedParts": [
    {"original": "广告", "replacement": "***"},
    {"original": "购买", "replacement": "***"}
  ]
}
```

### 2.3 安全改写功能实现

**功能描述**：当 `auto_rewrite=true` 且检测分数达到警告阈值时，调用 LLM 对内容进行安全改写。

**实现方案**：

```typescript
// 调用 LLM 进行安全改写
async function rewriteContent(text: string, findings: Finding[]): Promise<string> {
  const prompt = `请将以下内容中可能存在安全问题的部分进行改写，使其更加安全和合规。
保持原意不变，但移除可能存在风险的表述。

原文：${text}

发现的风险：${findings.map(f => f.reason).join('；')}

请直接输出改写后的内容：`;

  const response = await callLLM(prompt);
  return response;
}
```

**返回数据结构**：
```json
{
  "action": "rewrite",
  "processedText": "这是一条产品介绍内容，了解更多详情",
  "originalText": "这是一条广告内容，点击购买产品",
  "rewriteReason": "移除了诱导性广告词汇"
}
```

### 2.4 UI 交互优化

**阈值滑块改进**：
- 警告阈值范围：0-100，默认 60
- 阻断阈值范围：0-100，默认 85
- 阻断阈值必须 >= 警告阈值 + 5
- 滑块颜色：绿色（0-60）、黄色（60-85）、红色（85-100）

**保存反馈**：
- 保存成功：显示 Toast 提示"规则配置已保存"
- 保存失败：显示错误原因
- 保存中：禁用按钮，显示 loading 状态

**实时预览**：
- 输入测试文本，预览不同分数下的处理结果
- 显示阈值分界线和当前分数位置

## 三、实施步骤

### 阶段一：字段名统一和保存功能修复
1. 确认 API 返回字段名为 snake_case
2. 确认前端正确传递 snake_case 字段
3. 添加保存成功/失败的 Toast 提示
4. 添加阈值范围校验

### 阶段二：自动脱敏功能实现
1. 在检测引擎中实现 `maskSensitiveContent` 函数
2. 修改检测结果返回结构，添加 `processedText` 字段
3. 更新前端显示脱敏后的文本

### 阶段三：安全改写功能实现
1. 集成 LLM 调用能力
2. 实现 `rewriteContent` 函数
3. 添加改写结果的缓存机制
4. 更新前端显示改写后的文本

### 阶段四：UI/UX 优化
1. 改进阈值滑块交互
2. 添加实时预览功能
3. 优化开关样式和动画效果

## 四、数据流

```
用户输入文本
    ↓
检测引擎加载策略配置
    ↓
执行各维度检测规则
    ↓
计算总分和各维度分数
    ↓
根据阈值决定动作
    ├─ score >= blockThreshold → block
    ├─ score >= warnThreshold && autoMask → mask（执行脱敏）
    ├─ score >= warnThreshold && autoRewrite → rewrite（执行改写）
    └─ score >= warnThreshold → warn
    ↓
返回检测结果和处理后的文本
```

## 五、测试用例

### 5.1 阈值功能测试
```
场景1：分数 50，警告阈值 60，阻断阈值 85
期望：action = allow

场景2：分数 70，警告阈值 60，阻断阈值 85
期望：action = warn

场景3：分数 90，警告阈值 60，阻断阈值 85
期望：action = block
```

### 5.2 自动脱敏测试
```
场景：auto_mask = true，分数 = 70，警告阈值 = 60
输入："这是一条广告内容，点击购买产品"
期望输出：
{
  "action": "mask",
  "processedText": "这是一条***内容，点击***产品"
}
```

### 5.3 安全改写测试
```
场景：auto_rewrite = true，分数 = 70，警告阈值 = 60
输入："这是一条广告内容，点击购买产品"
期望输出：
{
  "action": "rewrite",
  "processedText": "这是一条产品介绍内容，了解更多详情"
}
```
