# 检测看板优化方案

## 一、当前问题分析

### 1.1 数据层面问题

| 问题 | 描述 | 状态 |
|------|------|------|
| ~~风险分布数据为空~~ | `risk_findings` 表有数据但 `stats` API 显示全为 0 | ✅ 已修复 |
| ~~历史记录缺少风险详情~~ | `/api/history` 返回 `findings: []` | ✅ 已修复 |
| ~~前端字段名不匹配~~ | 前端使用 `userPrompt`，API 返回 `inputText` | ✅ 已修复 |

### 1.2 功能层面问题

| 问题 | 描述 | 状态 |
|------|------|------|
| 缺少实时刷新 | 看板数据需要手动刷新 | ⏳ 待优化 |
| 趋势图太简单 | 仅显示 7 天柱状图 | ⏳ 待优化 |
| 缺少维度详情 | 点击维度无法查看详细风险记录 | ⏳ 待优化 |
| 缺少数据导出 | 无法导出统计数据或历史记录 | ⏳ 待优化 |

---

## 二、已完成的修复

### 2.1 修复历史记录 API 返回完整数据

**文件**: `/api/history/route.ts`

**改动**:
1. 关联查询 `detection_records` 和 `risk_findings` 表
2. 返回完整的风险明细数据，包括维度、分数、严重程度
3. 统一字段命名为 camelCase

**验证**: 
```bash
curl -s 'http://localhost:5000/api/history?limit=1'
# 返回包含 findings 数组的完整数据
```

### 2.2 修复前端页面字段映射

**文件**: `/app/history/page.tsx`

**改动**:
1. 更新 `Session` 接口匹配 API 返回格式
2. 使用 `inputText`/`outputText` 替代 `userPrompt`/`mockModelOutput`
3. 使用 `inputScore`/`outputScore` 替代嵌套的 `inputRecord`/`outputRecord` 对象
4. 增加策略名称、模型、延迟等信息展示

### 2.3 统计 API 数据验证

**当前数据状态**:
```json
{
  "totalDetections": "54",
  "todayDetections": "3",
  "actionDistribution": {
    "allow": 53,
    "block": 1
  },
  "riskDistribution": {
    "prompt_injection": 1
  },
  "blockRate": "1.85%",
  "avgLatency": 110
}
```

---

## 三、待优化功能

### 3.1 实时刷新与自动更新

**改动点**:
1. 添加自动刷新开关（每 30 秒）
2. 添加手动刷新按钮
3. 使用 SWR 或 React Query 管理数据

```typescript
// 新增功能
const [autoRefresh, setAutoRefresh] = useState(false);

useEffect(() => {
  if (autoRefresh) {
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }
}, [autoRefresh]);
```

### 3.2 增强趋势图

**改动点**:
1. 支持选择时间范围（7天/30天/90天）
2. 显示多条趋势线（总检测、拦截、警告）
3. 使用 Recharts 替代简单柱状图

### 3.3 风险维度详情

**改动点**:
1. 点击维度跳转到筛选的历史记录页面
2. 添加维度 Top 风险详情卡片
3. 显示维度风险分分布

### 3.4 数据导出功能

**改动点**:
1. 添加导出按钮（CSV/JSON）
2. 新增 `/api/stats/export` 接口
3. 支持自定义时间范围

---

## 四、实施优先级

| 优先级 | 任务 | 状态 |
|--------|------|------|
| P0 | 修复 history API 返回完整数据 | ✅ 已完成 |
| P0 | 修复前端字段映射 | ✅ 已完成 |
| P1 | 添加自动刷新功能 | ⏳ 待开发 |
| P1 | 增强趋势图（时间范围选择） | ⏳ 待开发 |
| P2 | 添加维度详情跳转 | ⏳ 待开发 |
| P2 | 添加数据导出 | ⏳ 待开发 |

---

## 五、验证结果

### 5.1 API 测试通过

- ✅ `/api/stats` 返回正确统计数据
- ✅ `/api/history` 返回完整历史记录含 findings
- ✅ `/api/detection-sessions` 正确写入检测会话
- ✅ `/api/policies/{id}/toggle` 策略启用/禁用正常

### 5.2 数据库验证

- ✅ `detection_sessions` 表有记录
- ✅ `detection_records` 表有关联记录
- ✅ `risk_findings` 表有风险明细

### 5.3 前端页面验证

- ✅ 历史记录页面正确显示风险维度
- ✅ 看板页面统计数据正确
- ✅ 策略配置页面启用/禁用功能正常
