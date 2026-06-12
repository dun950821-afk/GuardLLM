-- =====================================================
-- GuardLLM 数据库初始化脚本
-- 自动生成于 2026-06-10
-- 包含所有表结构创建和数据导入
-- =====================================================

-- 启用必要的扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. 检测维度表 (detection_dimensions)
-- =====================================================
DROP TABLE IF EXISTS detection_dimensions CASCADE;
CREATE TABLE detection_dimensions (
  id UUID PRIMARY KEY,
  code VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  category VARCHAR(50) NOT NULL DEFAULT 'content',
  weight DECIMAL(3,2) NOT NULL DEFAULT 1.00,
  priority INTEGER NOT NULL DEFAULT 100,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  is_system BOOLEAN NOT NULL DEFAULT FALSE,
  config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_dimensions_code ON detection_dimensions(code);
CREATE INDEX idx_dimensions_category ON detection_dimensions(category);
CREATE INDEX idx_dimensions_priority ON detection_dimensions(priority);

-- 插入检测维度数据
INSERT INTO detection_dimensions (id, code, name, description, category, weight, priority, enabled, is_system, config, created_at, updated_at) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'prompt_injection', '提示词注入', '检测用户输入中是否存在试图操纵模型行为的提示词注入攻击', 'security', 1.00, 100, true, true, '{"color": "#ef4444", "icon": "shield-alert"}', '2026-06-08 14:48:12.887068+08', '2026-06-08 16:33:24.02+08'),
('550e8400-e29b-41d4-a716-446655440002', 'pii_leak', '信息泄露', '检测文本中是否包含个人隐私信息（手机号、身份证、银行卡等）', 'compliance', 1.00, 90, true, true, '{"color": "#f97316", "icon": "user-x"}', '2026-06-08 14:48:12.887068+08', '2026-06-08 18:47:59.179+08'),
('550e8400-e29b-41d4-a716-446655440003', 'malicious_code', '恶意代码', '检测文本中是否包含恶意代码、攻击脚本或漏洞利用代码', 'security', 1.00, 95, true, true, '{"color": "#8b5cf6", "icon": "code-2"}', '2026-06-08 14:48:12.887068+08', '2026-06-08 14:48:12.887068+08'),
('550e8400-e29b-41d4-a716-446655440004', 'violence_hate', '暴力仇恨', '检测文本中是否包含暴力、仇恨、歧视性言论', 'content', 0.80, 80, true, true, '{"color": "#ec4899", "icon": "alert-triangle"}', '2026-06-08 14:48:12.887068+08', '2026-06-08 14:48:12.887068+08'),
('550e8400-e29b-41d4-a716-446655440005', 'illegal_content', '非法内容', '检测文本中是否包含违法犯罪、黄赌毒等相关内容', 'content', 0.80, 85, true, true, '{"color": "#dc2626", "icon": "ban"}', '2026-06-08 14:48:12.887068+08', '2026-06-08 14:48:12.887068+08'),
('550e8400-e29b-41d4-a716-446655440008', 'sensitive_compliance', '敏感合规', '检测可能涉及平台合规、公共安全、敏感议题的内容', 'compliance', 0.80, 90, true, true, '{}', '2026-06-08 16:36:35.348362+08', '2026-06-08 16:36:35.348362+08'),
('550e8400-e29b-41d4-a716-446655440009', 'adult_content', '色情低俗', '检测色情、低俗、露骨性内容、未成年人相关性内容', 'content', 0.90, 100, true, true, '{}', '2026-06-08 16:36:35.405145+08', '2026-06-08 16:36:35.405145+08'),
('550e8400-e29b-41d4-a716-446655440010', 'self_harm', '自伤自杀', '检测自伤、自杀、求助、诱导自伤等高风险内容', 'safety', 1.00, 100, true, true, '{}', '2026-06-08 16:36:35.445903+08', '2026-06-08 16:36:35.445903+08'),
('550e8400-e29b-41d4-a716-446655440011', 'credential_secret_leak', '密钥凭证泄露', '检测 API Key、Token、Secret、Access Key 等敏感凭证泄露', 'privacy', 0.90, 95, true, true, '{}', '2026-06-08 16:36:35.466723+08', '2026-06-08 16:36:35.466723+08'),
('550e8400-e29b-41d4-a716-446655440012', 'fraud_scam', '诈骗欺诈', '检测诈骗话术、钓鱼链接、冒充客服、虚假投资等欺诈内容', 'content', 1.00, 100, true, true, '{}', '2026-06-08 16:36:35.500432+08', '2026-06-08 16:36:35.500432+08'),
('550e8400-e29b-41d4-a716-446655440013', 'misinformation', '虚假信息', '检测虚假新闻、谣言传播、高风险医疗建议等误导性内容', 'content', 0.80, 85, true, true, '{}', '2026-06-08 16:36:35.517659+08', '2026-06-08 16:36:35.517659+08'),
('550e8400-e29b-41d4-a716-446655440014', 'copyright_risk', '版权风险', '检测侵权内容、盗版资源传播等版权风险内容', 'compliance', 0.70, 80, true, true, '{}', '2026-06-08 16:36:35.53684+08', '2026-06-08 16:36:35.53684+08'),
('550e8400-e29b-41d4-a716-446655440015', 'business_sensitive', '企业敏感信息', '检测企业内部信息、商业机密、内部代码库等敏感信息泄露', 'privacy', 0.90, 90, true, true, '{}', '2026-06-08 16:36:35.558634+08', '2026-06-08 16:36:35.558634+08'),
('550e8400-e29b-41d4-a716-446655440016', 'output_leak', '输出泄露', '检测模型输出中是否泄露系统指令、内部信息等', 'security', 0.80, 85, true, true, '{}', '2026-06-08 16:36:35.586121+08', '2026-06-08 16:36:35.586121+08'),
('45f9982f-84a6-4e5a-917f-d9eb34c592bd', 'spam_detection', '垃圾信息检测', '检测垃圾邮件和垃圾信息', 'content', 0.70, 100, true, false, '{}', '2026-06-08 14:50:24.054+08', '2026-06-08 14:50:24.054+08'),
('f9e3d08b-ac02-4795-836c-503978e21304', 'ad_detection', '广告检测', '修改后的描述', 'content', 0.90, 100, true, false, '{}', '2026-06-08 14:47:46.324+08', '2026-06-08 16:33:18.165+08');

-- =====================================================
-- 2. 检测规则表 (detection_rules)
-- =====================================================
DROP TABLE IF EXISTS detection_rules CASCADE;
CREATE TABLE detection_rules (
  id UUID PRIMARY KEY,
  dimension_id UUID NOT NULL REFERENCES detection_dimensions(id),
  name VARCHAR(200) NOT NULL,
  type VARCHAR(50) NOT NULL DEFAULT 'keyword',
  pattern TEXT NOT NULL,
  match_type VARCHAR(50) NOT NULL DEFAULT 'contains',
  case_sensitive BOOLEAN NOT NULL DEFAULT FALSE,
  score INTEGER NOT NULL DEFAULT 50,
  confidence DECIMAL(5,2) NOT NULL DEFAULT 0.50,
  priority INTEGER NOT NULL DEFAULT 100,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  description TEXT,
  tags TEXT[] DEFAULT '{}',
  config JSONB DEFAULT '{}',
  group_id UUID,
  suggestion TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_rules_dimension ON detection_rules(dimension_id);
CREATE INDEX idx_rules_type ON detection_rules(type);
CREATE INDEX idx_rules_enabled ON detection_rules(enabled);

-- 插入检测规则数据
INSERT INTO detection_rules (id, dimension_id, name, type, pattern, match_type, case_sensitive, score, confidence, priority, enabled, description, tags, config, group_id, suggestion, created_at, updated_at) VALUES
-- 提示词注入规则
('550e8400-e29b-41d4-a716-446655440101', '550e8400-e29b-41d4-a716-446655440001', '忽略指令关键词', 'keyword', '忽略之前', 'contains', false, 90, 0.85, 100, true, '检测"忽略之前"类指令覆盖', '{}', '{}', NULL, NULL, '2026-06-08 14:48:26.005189+08', '2026-06-08 14:48:26.005189+08'),
('550e8400-e29b-41d4-a716-446655440102', '550e8400-e29b-41d4-a716-446655440001', '系统提示词探测', 'keyword', '系统提示词', 'contains', false, 95, 0.90, 100, true, '检测系统提示词探测行为', '{}', '{}', NULL, NULL, '2026-06-08 14:48:26.005189+08', '2026-06-08 14:48:26.005189+08'),
('550e8400-e29b-41d4-a716-446655440103', '550e8400-e29b-41d4-a716-446655440001', '角色扮演注入', 'keyword', '你现在是', 'contains', false, 85, 0.80, 100, true, '检测角色扮演类注入', '{}', '{}', NULL, NULL, '2026-06-08 14:48:26.005189+08', '2026-06-08 14:48:26.005189+08'),
('550e8400-e29b-41d4-a716-446655440104', '550e8400-e29b-41d4-a716-446655440001', '越狱指令', 'keyword', 'DAN模式', 'contains', false, 100, 0.95, 100, true, '检测DAN越狱模式', '{}', '{}', NULL, NULL, '2026-06-08 14:48:26.005189+08', '2026-06-08 14:48:26.005189+08'),
('550e8400-e29b-41d4-a716-446655440105', '550e8400-e29b-41d4-a716-446655440001', '忽略规则', 'keyword', '忽略所有规则', 'contains', false, 95, 0.90, 100, true, '检测忽略规则指令', '{}', '{}', NULL, NULL, '2026-06-08 14:48:26.005189+08', '2026-06-08 14:48:26.005189+08'),
('9c28e929-664c-477f-b858-6a5129be1c90', '550e8400-e29b-41d4-a716-446655440001', '忽略', 'keyword', '忽略', 'contains', false, 60, 0.80, 80, true, '忽略关键词', '{}', '{}', NULL, NULL, '2026-06-08 16:36:35.733394+08', '2026-06-08 16:36:35.733394+08'),
('a0b95748-6c4f-4190-b6e0-a3883200fa10', '550e8400-e29b-41d4-a716-446655440001', '忽略之前', 'keyword', '忽略之前', 'contains', false, 85, 0.85, 90, true, '忽略之前关键词', '{}', '{}', NULL, NULL, '2026-06-08 16:36:35.759523+08', '2026-06-08 16:36:35.759523+08'),
('92283b6f-5c42-4674-90b4-e4d91da35660', '550e8400-e29b-41d4-a716-446655440001', '越狱', 'keyword', '越狱', 'contains', false, 90, 0.85, 95, true, '越狱关键词', '{}', '{}', NULL, NULL, '2026-06-08 16:36:35.78264+08', '2026-06-08 16:36:35.78264+08'),
('6daae776-8053-4f79-bfca-71df89c87fe1', '550e8400-e29b-41d4-a716-446655440001', 'DAN', 'keyword', 'DAN', 'contains', false, 85, 0.85, 90, true, 'DAN越狱', '{}', '{}', NULL, NULL, '2026-06-08 16:36:35.798182+08', '2026-06-08 16:36:35.798182+08'),
('9e2eb5e7-c22a-4a95-93c9-ae94f84c85f3', '550e8400-e29b-41d4-a716-446655440001', '开发者模式', 'keyword', '开发者模式', 'contains', false, 85, 0.85, 90, true, '开发者模式越狱', '{}', '{}', NULL, NULL, '2026-06-08 16:36:35.81646+08', '2026-06-08 16:36:35.81646+08'),
('f93194bd-8c7e-40d6-a06e-7739c90d374d', '550e8400-e29b-41d4-a716-446655440001', '无限制模式', 'keyword', '无限制模式', 'contains', false, 85, 0.85, 90, true, '无限制模式', '{}', '{}', NULL, NULL, '2026-06-08 16:36:35.838489+08', '2026-06-08 16:36:35.838489+08'),
('ac9c1c01-3b0c-4990-aca7-f907e3be9f33', '550e8400-e29b-41d4-a716-446655440001', '输出规则', 'regex', '(输出|泄露|告诉我).*系统提示词', 'regex', false, 95, 0.90, 100, true, '输出系统提示词', '{}', '{}', NULL, NULL, '2026-06-08 16:36:35.887533+08', '2026-06-08 16:36:35.887533+08'),
('9411f354-90e5-48f9-ae66-0aa2fccac8ff', '550e8400-e29b-41d4-a716-446655440001', '绕过限制', 'keyword', '绕过限制', 'contains', false, 90, 0.90, 100, true, '绕过限制关键词', '{}', '{}', NULL, NULL, '2026-06-08 16:36:35.887533+08', '2026-06-08 16:36:35.887533+08'),
('0e806fa7-077c-4785-971f-d3dda64ecf02', '550e8400-e29b-41d4-a716-446655440001', '系统提示词', 'keyword', '系统提示词', 'contains', false, 95, 0.90, 100, true, '系统提示词探测', '{}', '{}', NULL, NULL, '2026-06-08 16:36:35.714645+08', '2026-06-08 16:36:35.714645+08'),
('97f13468-15fc-4767-abd8-6266ceb3b35f', '550e8400-e29b-41d4-a716-446655440001', 'system prompt', 'keyword', 'system prompt', 'contains', false, 95, 0.90, 100, true, '系统提示词探测英文', '{}', '{}', NULL, NULL, '2026-06-08 16:36:35.714645+08', '2026-06-08 16:36:35.714645+08'),
('4fbf40bf-e8d3-4834-90d5-d1af7b07b9e0', '550e8400-e29b-41d4-a716-446655440001', '忽略指令', 'keyword', '忽略之前的指令', 'contains', false, 90, 0.90, 100, true, '忽略指令关键词', '{}', '{}', NULL, NULL, '2026-06-08 16:36:35.641747+08', '2026-06-08 16:36:35.641747+08'),
('2d5ae48d-fdb5-4fa9-9eef-7533a88d8d40', '550e8400-e29b-41d4-a716-446655440001', '忽略所有规则', 'keyword', '忽略所有规则', 'contains', false, 90, 0.90, 100, true, '忽略规则关键词', '{}', '{}', NULL, NULL, '2026-06-08 16:36:35.669799+08', '2026-06-08 16:36:35.669799+08'),
('3621dff1-a563-468a-b4ae-43160bfabde4', '550e8400-e29b-41d4-a716-446655440001', '扮演', 'keyword', '扮演', 'contains', false, 50, 0.70, 70, true, '扮演关键词', '{}', '{}', NULL, NULL, '2026-06-08 16:36:35.865417+08', '2026-06-08 16:36:35.865417+08'),
('0f972345-bb55-4b4f-a2f1-694cb1696d0d', '550e8400-e29b-41d4-a716-446655440001', '新规则', 'keyword', '测试关键词', 'contains', false, 70, 0.80, 100, true, '', '{}', '{}', NULL, NULL, '2026-06-08 14:50:25.306+08', '2026-06-08 14:50:25.306+08'),

-- 信息泄露规则
('550e8400-e29b-41d4-a716-446655440204', '550e8400-e29b-41d4-a716-446655440002', '邮箱检测', 'regex', '[\w.-]+@[\w.-]+\.\w+', 'regex', false, 75, 0.85, 100, true, '检测邮箱地址', '{}', '{}', NULL, NULL, '2026-06-08 14:48:35.728657+08', '2026-06-08 14:48:35.728657+08'),
('550e8400-e29b-41d4-a716-446655440205', '550e8400-e29b-41d4-a716-446655440002', 'API Key检测', 'regex', '(sk-|api[_-]?key|Bearer\s+)[a-zA-Z0-9_-]{20,}', 'regex', false, 100, 0.95, 100, true, '检测API密钥', '{}', '{}', NULL, NULL, '2026-06-08 14:48:35.728657+08', '2026-06-08 14:48:35.728657+08'),
('a404ffac-705b-488c-a413-9e66319ae3ff', '550e8400-e29b-41d4-a716-446655440002', '邮箱', 'regex', '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}', 'regex', false, 60, 0.80, 80, true, '邮箱正则', '{}', '{}', NULL, NULL, '2026-06-08 16:36:36.0075+08', '2026-06-08 16:36:36.0075+08'),
('2f8afb55-6609-4968-a9b7-ea8ac2cfb415', '550e8400-e29b-41d4-a716-446655440002', '手机号检测', 'regex', '1[3-9]\d{9}', 'regex', false, 80, 0.90, 100, true, '检测中国大陆手机号码', '{}', '{}', NULL, '检测到手机号码，建议脱敏处理或移除', '2026-06-10 16:23:13.797719+08', '2026-06-10 16:23:13.797719+08'),
('a4a826dd-7e19-4223-a7aa-d4ae9cec6168', '550e8400-e29b-41d4-a716-446655440002', '银行卡号检测', 'regex', '\d{16,19}', 'regex', false, 85, 0.85, 100, true, '检测银行卡号码', '{}', '{}', NULL, '检测到银行卡号码，建议脱敏处理或移除', '2026-06-10 16:23:29.685745+08', '2026-06-10 16:23:29.685745+08'),
('91a2d38e-fd89-42f6-bf45-3c5ff259782e', '550e8400-e29b-41d4-a716-446655440002', '身份证号检测', 'regex', '\d{17}[\dXx]', 'regex', false, 90, 0.95, 100, true, '检测中国大陆身份证号码', '{}', '{}', NULL, '检测到身份证号码，建议脱敏处理或移除', '2026-06-10 16:23:29.649695+08', '2026-06-10 16:23:29.649695+08'),

-- 恶意代码规则
('550e8400-e29b-41d4-a716-446655440301', '550e8400-e29b-41d4-a716-446655440003', 'SQL注入检测', 'keyword', 'SELECT * FROM', 'contains', false, 90, 0.85, 100, true, '检测SQL注入', '{}', '{}', NULL, NULL, '2026-06-08 14:48:50.544459+08', '2026-06-08 14:48:50.544459+08'),
('550e8400-e29b-41d4-a716-446655440302', '550e8400-e29b-41d4-a716-446655440003', 'XSS攻击', 'keyword', '<script>', 'contains', false, 85, 0.80, 100, true, '检测XSS攻击', '{}', '{}', NULL, NULL, '2026-06-08 14:48:50.544459+08', '2026-06-08 14:48:50.544459+08'),
('550e8400-e29b-41d4-a716-446655440303', '550e8400-e29b-41d4-a716-446655440003', '远程控制', 'keyword', '远程控制', 'contains', false, 100, 0.95, 100, true, '检测远程控制请求', '{}', '{}', NULL, NULL, '2026-06-08 14:48:50.544459+08', '2026-06-08 14:48:50.544459+08'),
('550e8400-e29b-41d4-a716-446655440304', '550e8400-e29b-41d4-a716-446655440003', '木马检测', 'keyword', '木马', 'contains', false, 95, 0.90, 100, true, '检测木马相关内容', '{}', '{}', NULL, NULL, '2026-06-08 14:48:50.544459+08', '2026-06-08 14:48:50.544459+08'),
('18313cfe-08cf-494e-a4ad-3750a58a11d1', '550e8400-e29b-41d4-a716-446655440003', '木马', 'keyword', '木马', 'contains', false, 95, 0.90, 100, true, '木马关键词', '{}', '{}', NULL, NULL, '2026-06-08 16:36:36.121103+08', '2026-06-08 16:36:36.121103+08'),
('a7518ee9-d64a-468f-b2ac-5c46b8858e05', '550e8400-e29b-41d4-a716-446655440003', '后门', 'keyword', '后门', 'contains', false, 95, 0.90, 100, true, '后门关键词', '{}', '{}', NULL, NULL, '2026-06-08 16:36:36.13657+08', '2026-06-08 16:36:36.13657+08'),
('77ad7478-4bcf-40de-b259-bb36782445f4', '550e8400-e29b-41d4-a716-446655440003', '获取文件', 'keyword', '获取文件', 'contains', false, 90, 0.85, 95, true, '获取文件关键词', '{}', '{}', NULL, NULL, '2026-06-08 16:36:36.151581+08', '2026-06-08 16:36:36.151581+08'),
('dd6d53fc-bb83-47c2-b07f-097392094442', '550e8400-e29b-41d4-a716-446655440003', '反弹shell', 'keyword', '反弹shell', 'contains', false, 90, 0.85, 95, true, '反弹shell关键词', '{}', '{}', NULL, NULL, '2026-06-08 16:36:36.189014+08', '2026-06-08 16:36:36.189014+08'),
('badb1cea-4393-45aa-8d87-75298b14118b', '550e8400-e29b-41d4-a716-446655440003', '免杀', 'keyword', '免杀', 'contains', false, 90, 0.85, 95, true, '免杀关键词', '{}', '{}', NULL, NULL, '2026-06-08 16:36:36.204693+08', '2026-06-08 16:36:36.204693+08'),
('724addd7-101b-4a43-a2ee-a6998ba2fb7b', '550e8400-e29b-41d4-a716-446655440003', '入侵', 'keyword', '入侵', 'contains', false, 85, 0.85, 90, true, '入侵关键词', '{}', '{}', NULL, NULL, '2026-06-08 16:36:36.226193+08', '2026-06-08 16:36:36.226193+08'),
('cf998c94-3aef-4d2f-b790-d0abe0eeb491', '550e8400-e29b-41d4-a716-446655440003', '窃取密码', 'keyword', '窃取密码', 'contains', false, 95, 0.90, 100, true, '窃取密码关键词', '{}', '{}', NULL, NULL, '2026-06-08 16:36:36.167996+08', '2026-06-08 16:36:36.167996+08'),
('137254a4-794d-4f51-85b4-3a6e9194e1f8', '550e8400-e29b-41d4-a716-446655440003', '控制他人电脑', 'keyword', '控制他人电脑', 'contains', false, 95, 0.90, 100, true, '控制他人电脑关键词', '{}', '{}', NULL, NULL, '2026-06-08 16:36:36.24514+08', '2026-06-08 16:36:36.24514+08'),

-- 暴力仇恨规则
('550e8400-e29b-41d4-a716-446655440401', '550e8400-e29b-41d4-a716-446655440004', '暴力关键词', 'keyword', '杀死', 'contains', false, 90, 0.85, 100, true, '检测暴力关键词', '{}', '{}', NULL, NULL, '2026-06-08 14:48:50.544459+08', '2026-06-08 14:48:50.544459+08'),
('9a93c464-9813-4922-b31b-77f14555e76d', '550e8400-e29b-41d4-a716-446655440004', '仇恨', 'keyword', '仇恨', 'contains', false, 80, 0.80, 85, true, '仇恨关键词', '{}', '{}', NULL, NULL, '2026-06-08 16:36:36.333859+08', '2026-06-08 16:36:36.333859+08'),
('244956fe-0f94-4564-9e1d-51239661a31e', '550e8400-e29b-41d4-a716-446655440004', '暴力威胁', 'keyword', '暴力威胁', 'contains', false, 90, 0.85, 100, true, '暴力威胁关键词', '{}', '{}', NULL, NULL, '2026-06-08 16:36:36.276799+08', '2026-06-08 16:36:36.276799+08'),
('f44f21ec-1bdb-4a95-90c0-02eab07df10f', '550e8400-e29b-41d4-a716-446655440004', '杀人', 'keyword', '杀人', 'contains', false, 95, 0.85, 100, true, '杀人关键词', '{}', '{}', NULL, NULL, '2026-06-08 16:36:36.313351+08', '2026-06-08 16:36:36.313351+08'),

-- 非法内容规则
('550e8400-e29b-41d4-a716-446655440501', '550e8400-e29b-41d4-a716-446655440005', '毒品相关', 'keyword', '毒品', 'contains', false, 95, 0.90, 100, true, '检测毒品相关内容', '{}', '{}', NULL, NULL, '2026-06-08 14:48:50.544459+08', '2026-06-08 14:48:50.544459+08'),
('550e8400-e29b-41d4-a716-446655440502', '550e8400-e29b-41d4-a716-446655440005', '诈骗相关', 'keyword', '诈骗', 'contains', false, 95, 0.90, 100, true, '检测诈骗相关内容', '{}', '{}', NULL, NULL, '2026-06-08 14:48:50.544459+08', '2026-06-08 14:48:50.544459+08'),
('6215b42d-c220-452e-9ec5-bc31667b6355', '550e8400-e29b-41d4-a716-446655440005', '买卖账号', 'keyword', '买卖账号', 'contains', false, 90, 0.85, 100, true, '买卖账号关键词', '{}', '{}', NULL, NULL, '2026-06-08 16:36:36.367031+08', '2026-06-08 16:36:36.367031+08'),
('1f88d3a6-614c-40d5-b6e2-a34cea335224', '550e8400-e29b-41d4-a716-446655440005', '洗钱', 'keyword', '洗钱', 'contains', false, 95, 0.90, 100, true, '洗钱关键词', '{}', '{}', NULL, NULL, '2026-06-08 16:36:36.388577+08', '2026-06-08 16:36:36.388577+08'),
('993df25f-c721-4aea-b9ec-e172abbf003e', '550e8400-e29b-41d4-a716-446655440005', '黑产', 'keyword', '黑产', 'contains', false, 90, 0.85, 95, true, '黑产关键词', '{}', '{}', NULL, NULL, '2026-06-08 16:36:36.410205+08', '2026-06-08 16:36:36.410205+08'),
('670bdf5a-0957-4a0e-9128-264f73b3c661', '550e8400-e29b-41d4-a716-446655440005', '诈骗', 'keyword', '诈骗', 'contains', false, 90, 0.85, 95, true, '诈骗关键词', '{}', '{}', NULL, NULL, '2026-06-08 16:36:36.426676+08', '2026-06-08 16:36:36.426676+08'),
('f36cbd94-fc9e-4aa3-a0cc-8dc29df7b68f', '550e8400-e29b-41d4-a716-446655440005', '绕过实名', 'keyword', '绕过实名', 'contains', false, 85, 0.80, 90, true, '绕过实名关键词', '{}', '{}', NULL, NULL, '2026-06-08 16:36:36.450074+08', '2026-06-08 16:36:36.450074+08'),

-- 敏感合规规则
('3cd8f55a-11db-4d80-abba-a0771a1fd1f6', '550e8400-e29b-41d4-a716-446655440008', '绕过监管', 'keyword', '绕过监管', 'contains', false, 85, 0.80, 90, true, '绕过监管关键词', '{}', '{}', NULL, NULL, '2026-06-08 16:36:36.663534+08', '2026-06-08 16:36:36.663534+08'),
('0faefc79-ea3b-4809-a346-39d2eef8c4a2', '550e8400-e29b-41d4-a716-446655440008', '水军', 'keyword', '水军', 'contains', false, 75, 0.75, 80, true, '水军关键词', '{}', '{}', NULL, NULL, '2026-06-08 16:36:36.677925+08', '2026-06-08 16:36:36.677925+08'),
('875e1ef7-64d6-49cb-bafe-0fbe2483b0b6', '550e8400-e29b-41d4-a716-446655440008', '控评', 'keyword', '控评', 'contains', false, 75, 0.75, 80, true, '控评关键词', '{}', '{}', NULL, NULL, '2026-06-08 16:36:36.693571+08', '2026-06-08 16:36:36.693571+08'),

-- 色情低俗规则
('32ad99d1-1335-43f8-aea5-fd7aa8ca91f3', '550e8400-e29b-41d4-a716-446655440009', '裸聊', 'keyword', '裸聊', 'contains', false, 90, 0.85, 100, true, '裸聊关键词', '{}', '{}', NULL, NULL, '2026-06-08 16:36:36.736437+08', '2026-06-08 16:36:36.736437+08'),
('2c774d78-2a11-4e97-a5e4-196121313ffe', '550e8400-e29b-41d4-a716-446655440009', '色情', 'keyword', '色情', 'contains', false, 95, 0.90, 100, true, '色情关键词', '{}', '{}', NULL, NULL, '2026-06-08 16:36:36.752438+08', '2026-06-08 16:36:36.752438+08'),
('7a368eaf-9ac0-4392-919b-fabb7c6a445f', '550e8400-e29b-41d4-a716-446655440009', '约炮', 'keyword', '约炮', 'contains', false, 90, 0.85, 95, true, '约炮关键词', '{}', '{}', NULL, NULL, '2026-06-08 16:36:36.774188+08', '2026-06-08 16:36:36.774188+08'),

-- 自伤自杀规则
('5e16d1c5-e5d3-4aba-aacc-79a96ac5d756', '550e8400-e29b-41d4-a716-446655440010', '自杀', 'keyword', '自杀', 'contains', false, 95, 0.90, 100, true, '自杀关键词', '{}', '{}', NULL, NULL, '2026-06-08 16:36:36.804411+08', '2026-06-08 16:36:36.804411+08'),
('9d42c300-db73-4b2d-bc36-664c2a66aed1', '550e8400-e29b-41d4-a716-446655440010', '不想活了', 'keyword', '不想活了', 'contains', false, 90, 0.85, 100, true, '不想活了关键词', '{}', '{}', NULL, NULL, '2026-06-08 16:36:36.820959+08', '2026-06-08 16:36:36.820959+08'),
('dbbdb35d-91b4-4aa6-9c23-cda71c438d1a', '550e8400-e29b-41d4-a716-446655440010', '结束生命', 'keyword', '结束生命', 'contains', false, 95, 0.90, 100, true, '结束生命关键词', '{}', '{}', NULL, NULL, '2026-06-08 16:36:36.842509+08', '2026-06-08 16:36:36.842509+08'),
('69f9ead1-3703-4fb8-88e3-b90528c779d9', '550e8400-e29b-41d4-a716-446655440010', '割腕', 'keyword', '割腕', 'contains', false, 95, 0.90, 100, true, '割腕关键词', '{}', '{}', NULL, NULL, '2026-06-08 16:36:36.858693+08', '2026-06-08 16:36:36.858693+08'),

-- 密钥凭证泄露规则
('179c3205-8ec3-4851-9889-7d77e200cae2', '550e8400-e29b-41d4-a716-446655440011', 'OpenAI Key', 'regex', 'sk-[A-Za-z0-9_-]{20,}', 'regex', false, 95, 0.90, 100, true, 'OpenAI API Key', '{}', '{}', NULL, NULL, '2026-06-08 16:36:36.894734+08', '2026-06-08 16:36:36.894734+08'),
('38b1b25c-2b57-4e0f-8878-47f339f9791f', '550e8400-e29b-41d4-a716-446655440011', 'api_key', 'keyword', 'api_key', 'contains', false, 80, 0.80, 90, true, 'api_key关键词', '{}', '{}', NULL, NULL, '2026-06-08 16:36:36.908579+08', '2026-06-08 16:36:36.908579+08'),
('63e492c5-158b-46a0-a9d8-7eb81e3b280b', '550e8400-e29b-41d4-a716-446655440011', 'secret_key', 'keyword', 'secret_key', 'contains', false, 80, 0.80, 90, true, 'secret_key关键词', '{}', '{}', NULL, NULL, '2026-06-08 16:36:36.924735+08', '2026-06-08 16:36:36.924735+08'),
('e708bfb8-70f1-4563-88ab-e17b37a6e045', '550e8400-e29b-41d4-a716-446655440011', 'access_token', 'keyword', 'access_token', 'contains', false, 85, 0.85, 95, true, 'access_token关键词', '{}', '{}', NULL, NULL, '2026-06-08 16:36:36.947532+08', '2026-06-08 16:36:36.947532+08'),

-- 诈骗欺诈规则
('1cb98b4b-4352-497f-bacc-f653ef975a02', '550e8400-e29b-41d4-a716-446655440012', '恭喜中奖', 'keyword', '恭喜中奖', 'contains', false, 90, 0.85, 100, true, '恭喜中奖诈骗', '{}', '{}', NULL, NULL, '2026-06-08 16:36:36.987012+08', '2026-06-08 16:36:36.987012+08'),
('6cae7426-1f35-4b1a-89a2-1bfd5ee8ecd2', '550e8400-e29b-41d4-a716-446655440012', '钓鱼链接', 'keyword', '钓鱼链接', 'contains', false, 90, 0.85, 100, true, '钓鱼链接诈骗', '{}', '{}', NULL, NULL, '2026-06-08 16:36:37.018595+08', '2026-06-08 16:36:37.018595+08'),
('a745d009-26ee-4770-b309-1a6649b87b31', '550e8400-e29b-41d4-a716-446655440012', '冒充客服', 'keyword', '冒充客服', 'contains', false, 85, 0.80, 95, true, '冒充客服诈骗', '{}', '{}', NULL, NULL, '2026-06-08 16:36:37.00308+08', '2026-06-08 16:36:37.00308+08'),
('a761d512-5083-4c90-ae52-fd276adcfdd1', '550e8400-e29b-41d4-a716-446655440012', '稳赚不赔', 'keyword', '稳赚不赔', 'contains', false, 85, 0.80, 95, true, '稳赚不赔诈骗', '{}', '{}', NULL, NULL, '2026-06-08 16:36:37.035308+08', '2026-06-08 16:36:37.035308+08'),
('9a93e073-1f96-4d78-95d7-763d846582b3', '550e8400-e29b-41d4-a716-446655440012', '内幕消息', 'keyword', '内幕消息', 'contains', false, 80, 0.75, 90, true, '内幕消息诈骗', '{}', '{}', NULL, NULL, '2026-06-08 16:36:37.055817+08', '2026-06-08 16:36:37.055817+08'),

-- 虚假信息规则
('85c523a2-5c55-4d4d-b07b-060b27ec99dc', '550e8400-e29b-41d4-a716-446655440013', '谣言', 'keyword', '谣言', 'contains', false, 75, 0.75, 80, true, '谣言关键词', '{}', '{}', NULL, NULL, '2026-06-08 16:36:37.091746+08', '2026-06-08 16:36:37.091746+08'),
('10a8599f-b257-4efc-9b95-114e8d2bd2fe', '550e8400-e29b-41d4-a716-446655440013', '虚假新闻', 'keyword', '虚假新闻', 'contains', false, 80, 0.80, 85, true, '虚假新闻关键词', '{}', '{}', NULL, NULL, '2026-06-08 16:36:37.106915+08', '2026-06-08 16:36:37.106915+08'),

-- 版权风险规则
('ea56d8dd-0aaa-4511-9546-3434b0f4e329', '550e8400-e29b-41d4-a716-446655440014', '盗版', 'keyword', '盗版', 'contains', false, 80, 0.80, 90, true, '盗版关键词', '{}', '{}', NULL, NULL, '2026-06-08 16:36:37.134769+08', '2026-06-08 16:36:37.134769+08'),
('ae4026e3-e513-490a-9391-93f8931cb4cd', '550e8400-e29b-41d4-a716-446655440014', '侵权', 'keyword', '侵权', 'contains', false, 75, 0.75, 85, true, '侵权关键词', '{}', '{}', NULL, NULL, '2026-06-08 16:36:37.154504+08', '2026-06-08 16:36:37.154504+08'),

-- 企业敏感信息规则
('57b2be14-fc0d-43a6-97a7-a3df2bf58c0b', '550e8400-e29b-41d4-a716-446655440015', '商业机密', 'keyword', '商业机密', 'contains', false, 90, 0.85, 95, true, '商业机密关键词', '{}', '{}', NULL, NULL, '2026-06-08 16:36:37.192331+08', '2026-06-08 16:36:37.192331+08'),
('5499855b-7cac-446d-87e0-4956bc5e3fc7', '550e8400-e29b-41d4-a716-446655440015', '内部资料', 'keyword', '内部资料', 'contains', false, 85, 0.80, 90, true, '内部资料关键词', '{}', '{}', NULL, NULL, '2026-06-08 16:36:37.208705+08', '2026-06-08 16:36:37.208705+08'),
('b07a5e2b-3ae0-417c-857c-a83205ffe5f5', '550e8400-e29b-41d4-a716-446655440015', '机密文件', 'keyword', '机密文件', 'contains', false, 90, 0.85, 95, true, '机密文件关键词', '{}', '{}', NULL, NULL, '2026-06-08 16:36:37.224856+08', '2026-06-08 16:36:37.224856+08'),

-- 输出泄露规则
('9daab45f-f10f-4cc7-9649-fa7071c205d7', '550e8400-e29b-41d4-a716-446655440016', '系统指令', 'keyword', '系统指令', 'contains', false, 85, 0.85, 90, true, '系统指令关键词', '{}', '{}', NULL, NULL, '2026-06-08 16:36:37.260768+08', '2026-06-08 16:36:37.260768+08'),
('01ec8db4-504c-4183-ac22-3fbe65497c4d', '550e8400-e29b-41d4-a716-446655440016', '内部信息', 'keyword', '内部信息', 'contains', false, 80, 0.80, 85, true, '内部信息关键词', '{}', '{}', NULL, NULL, '2026-06-08 16:36:37.27843+08', '2026-06-08 16:36:37.27843+08'),

-- 垃圾信息检测规则
('7f057d88-ff31-4425-8615-40909fe9eba3', '45f9982f-84a6-4e5a-917f-d9eb34c592bd', '重复字符', 'regex', '(.)\1{8,}', 'regex', false, 70, 0.80, 80, true, '重复字符检测', '{}', '{}', NULL, NULL, '2026-06-08 16:36:36.587333+08', '2026-06-08 16:36:36.587333+08'),
('ecc3a096-4ae8-4644-9b64-785c3666fa18', '45f9982f-84a6-4e5a-917f-d9eb34c592bd', '顶顶顶', 'keyword', '顶顶顶', 'contains', false, 50, 0.60, 60, true, '灌水关键词', '{}', '{}', NULL, NULL, '2026-06-08 16:36:36.604146+08', '2026-06-08 16:36:36.604146+08'),
('4b8874df-ee45-42ee-a6de-f08500ecf8ae', '45f9982f-84a6-4e5a-917f-d9eb34c592bd', '刷屏', 'keyword', '刷屏', 'contains', false, 60, 0.70, 70, true, '刷屏关键词', '{}', '{}', NULL, NULL, '2026-06-08 16:36:36.627413+08', '2026-06-08 16:36:36.627413+08'),

-- 广告检测规则
('66fcb24d-d59d-4ae4-b955-eb44d514b64b', 'f9e3d08b-ac02-4795-836c-503978e21304', '限时优惠', 'keyword', '限时优惠', 'contains', false, 70, 0.80, 80, true, '限时优惠广告', '{}', '{}', NULL, NULL, '2026-06-08 16:36:36.497711+08', '2026-06-08 16:36:36.497711+08'),
('030d6701-51b7-49c3-b7b0-1f89c7291731', 'f9e3d08b-ac02-4795-836c-503978e21304', '免费领取', 'keyword', '免费领取', 'contains', false, 70, 0.80, 80, true, '免费领取广告', '{}', '{}', NULL, NULL, '2026-06-08 16:36:36.51951+08', '2026-06-08 16:36:36.51951+08'),
('2243250a-fba2-47a9-8f64-096e422a7ccc', 'f9e3d08b-ac02-4795-836c-503978e21304', '扫码', 'keyword', '扫码', 'contains', false, 75, 0.75, 85, true, '扫码关键词', '{}', '{}', NULL, NULL, '2026-06-08 16:36:36.5362+08', '2026-06-08 16:36:36.5362+08'),
('14524057-0d41-4465-af33-8d6f5118495d', 'f9e3d08b-ac02-4795-836c-503978e21304', '加微信', 'keyword', '加微信', 'contains', false, 80, 0.80, 90, true, '加微信引流', '{}', '{}', NULL, NULL, '2026-06-08 16:36:36.481147+08', '2026-06-08 16:36:36.481147+08'),
('ddf59789-b2fd-4244-b4fa-5ae2e435ef95', 'f9e3d08b-ac02-4795-836c-503978e21304', '加群', 'keyword', '加群', 'contains', false, 80, 0.80, 90, true, '加群引流', '{}', '{}', NULL, NULL, '2026-06-08 16:36:36.557385+08', '2026-06-08 16:36:36.557385+08');

-- =====================================================
-- 3. 策略配置表 (policy_profiles)
-- =====================================================
DROP TABLE IF EXISTS policy_profiles CASCADE;
CREATE TABLE policy_profiles (
  id VARCHAR(100) PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by VARCHAR(200) DEFAULT 'system',
  updated_at TIMESTAMPTZ,
  tags TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}'
);

-- 插入策略配置数据
INSERT INTO policy_profiles (id, name, description, is_default, is_active, version, created_at, created_by, tags, metadata) VALUES
('strict-policy', '严格策略', '最严格的安全检测，拦截中风险以上', false, true, 3, '2026-06-08 11:46:40.156272+08', 'system', '{}', '{}'),
('default-policy', '默认策略', '平衡安全性和用户体验', true, true, 4, '2026-06-08 11:46:40.156272+08', 'system', '{}', '{}'),
('lenient-policy', '宽松策略', '仅拦截高风险，减少误报', false, true, 12, '2026-06-08 11:46:40.156272+08', 'system', '{}', '{}');

-- =====================================================
-- 4. 策略版本表 (policy_versions)
-- =====================================================
DROP TABLE IF EXISTS policy_versions CASCADE;
CREATE TABLE policy_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  policy_id VARCHAR(100) NOT NULL REFERENCES policy_profiles(id),
  version INTEGER NOT NULL,
  config JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by VARCHAR(200) DEFAULT 'system',
  change_summary TEXT
);

CREATE INDEX idx_policy_versions_policy ON policy_versions(policy_id);

-- =====================================================
-- 5. 策略规则表 (policy_rules)
-- =====================================================
DROP TABLE IF EXISTS policy_rules CASCADE;
CREATE TABLE policy_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  policy_id VARCHAR(100) NOT NULL REFERENCES policy_profiles(id),
  dimension_id UUID NOT NULL REFERENCES detection_dimensions(id),
  action VARCHAR(50) NOT NULL DEFAULT 'block',
  threshold INTEGER DEFAULT 50,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_policy_rules_policy ON policy_rules(policy_id);
CREATE INDEX idx_policy_rules_dimension ON policy_rules(dimension_id);

-- =====================================================
-- 6. 白名单规则表 (whitelist_rules)
-- =====================================================
DROP TABLE IF EXISTS whitelist_rules CASCADE;
CREATE TABLE whitelist_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pattern TEXT NOT NULL,
  match_type VARCHAR(50) NOT NULL DEFAULT 'exact',
  description TEXT,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by VARCHAR(200) DEFAULT 'system'
);

CREATE INDEX idx_whitelist_rules_pattern ON whitelist_rules(pattern);

-- 插入白名单规则数据
INSERT INTO whitelist_rules (id, pattern, match_type, description, enabled, created_at, created_by) VALUES
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'https://api.openai.com', 'prefix', 'OpenAI API 白名单', true, '2026-06-08 11:46:40.156272+08', 'system');

-- =====================================================
-- 7. 白名单规则策略关联表 (whitelist_rule_policies)
-- =====================================================
DROP TABLE IF EXISTS whitelist_rule_policies CASCADE;
CREATE TABLE whitelist_rule_policies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  whitelist_rule_id UUID NOT NULL REFERENCES whitelist_rules(id),
  policy_id VARCHAR(100) NOT NULL REFERENCES policy_profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_whitelist_rule_policies_rule ON whitelist_rule_policies(whitelist_rule_id);
CREATE INDEX idx_whitelist_rule_policies_policy ON whitelist_rule_policies(policy_id);

-- 插入白名单规则策略关联数据
INSERT INTO whitelist_rule_policies (id, whitelist_rule_id, policy_id, created_at) VALUES
('b1c2d3e4-f5a6-7890-bcde-f12345678901', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'default-policy', '2026-06-08 11:46:40.156272+08');

-- =====================================================
-- 8. LLM 提供商表 (llm_providers)
-- =====================================================
DROP TABLE IF EXISTS llm_providers CASCADE;
CREATE TABLE llm_providers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(200) NOT NULL,
  provider_type VARCHAR(50) NOT NULL,
  api_endpoint TEXT,
  model_name VARCHAR(200),
  config JSONB DEFAULT '{}',
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 插入 LLM 提供商数据
INSERT INTO llm_providers (id, name, provider_type, api_endpoint, model_name, config, enabled, created_at, updated_at) VALUES
('c1d2e3f4-a5b6-7890-cdef-123456789012', '豆包', 'doubao', 'https://ark.cn-beijing.volces.com/api/v3', 'doubao-pro-32k', '{}', true, '2026-06-08 11:46:40.156272+08', '2026-06-08 11:46:40.156272+08');

-- =====================================================
-- 9. 检测会话表 (detection_sessions)
-- =====================================================
DROP TABLE IF EXISTS detection_sessions CASCADE;
CREATE TABLE detection_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  input_type VARCHAR(50) NOT NULL,
  input_content TEXT,
  input_hash VARCHAR(128),
  input_metadata JSONB DEFAULT '{}',
  policy_id VARCHAR(100) REFERENCES policy_profiles(id),
  llm_provider_id UUID REFERENCES llm_providers(id),
  result JSONB DEFAULT '{}',
  summary JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_sessions_status ON detection_sessions(status);
CREATE INDEX idx_sessions_created ON detection_sessions(created_at);

-- =====================================================
-- 10. 检测记录表 (detection_records)
-- =====================================================
DROP TABLE IF EXISTS detection_records CASCADE;
CREATE TABLE detection_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES detection_sessions(id),
  dimension_id UUID REFERENCES detection_dimensions(id),
  rule_id UUID REFERENCES detection_rules(id),
  input_text TEXT,
  matched_text TEXT,
  matched_pattern TEXT,
  risk_level VARCHAR(50),
  score INTEGER DEFAULT 0,
  confidence DECIMAL(5,2) DEFAULT 0.00,
  position_start INTEGER,
  position_end INTEGER,
  context_before TEXT,
  context_after TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_records_session ON detection_records(session_id);
CREATE INDEX idx_records_dimension ON detection_records(dimension_id);
CREATE INDEX idx_records_risk ON detection_records(risk_level);

-- =====================================================
-- 11. 风险发现表 (risk_findings)
-- =====================================================
DROP TABLE IF EXISTS risk_findings CASCADE;
CREATE TABLE risk_findings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES detection_sessions(id),
  dimension_id UUID NOT NULL REFERENCES detection_dimensions(id),
  rule_id UUID REFERENCES detection_rules(id),
  risk_level VARCHAR(50) NOT NULL,
  severity INTEGER NOT NULL DEFAULT 1,
  score INTEGER NOT NULL DEFAULT 0,
  confidence DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  evidence TEXT,
  evidence_type VARCHAR(50),
  position_start INTEGER,
  position_end INTEGER,
  context TEXT,
  suggestion TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_findings_session ON risk_findings(session_id);
CREATE INDEX idx_findings_dimension ON risk_findings(dimension_id);
CREATE INDEX idx_findings_risk ON risk_findings(risk_level);

-- =====================================================
-- 12. 文档扫描任务表 (document_scan_tasks)
-- =====================================================
DROP TABLE IF EXISTS document_scan_tasks CASCADE;
CREATE TABLE document_scan_tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  file_name VARCHAR(500),
  file_type VARCHAR(50),
  file_size BIGINT,
  file_url TEXT,
  storage_key TEXT,
  extracted_text TEXT,
  text_hash VARCHAR(128),
  total_pages INTEGER,
  total_chars BIGINT,
  processing_time_ms BIGINT,
  policy_id VARCHAR(100) REFERENCES policy_profiles(id),
  summary JSONB DEFAULT '{}',
  risk_score INTEGER DEFAULT 0,
  risk_level VARCHAR(50),
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_document_tasks_status ON document_scan_tasks(status);
CREATE INDEX idx_document_tasks_created ON document_scan_tasks(created_at);

-- =====================================================
-- 13. 文档扫描发现表 (document_scan_findings)
-- =====================================================
DROP TABLE IF EXISTS document_scan_findings CASCADE;
CREATE TABLE document_scan_findings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES document_scan_tasks(id) ON DELETE CASCADE,
  dimension_id UUID NOT NULL REFERENCES detection_dimensions(id),
  rule_id UUID REFERENCES detection_rules(id),
  risk_level VARCHAR(50) NOT NULL,
  severity INTEGER NOT NULL DEFAULT 1,
  score INTEGER NOT NULL DEFAULT 0,
  confidence DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  evidence TEXT,
  evidence_type VARCHAR(50),
  position_start INTEGER,
  position_end INTEGER,
  page_number INTEGER,
  context TEXT,
  suggestion TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_document_findings_task ON document_scan_findings(task_id);
CREATE INDEX idx_document_findings_dimension ON document_scan_findings(dimension_id);
CREATE INDEX idx_document_findings_risk ON document_scan_findings(risk_level);

-- =====================================================
-- 14. 测试用例表 (test_cases)
-- =====================================================
DROP TABLE IF EXISTS test_cases CASCADE;
CREATE TABLE test_cases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(500) NOT NULL,
  description TEXT,
  input_text TEXT NOT NULL,
  expected_risks JSONB DEFAULT '[]',
  expected_safe JSONB DEFAULT '[]',
  tags TEXT[] DEFAULT '{}',
  category VARCHAR(100),
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_test_cases_category ON test_cases(category);
CREATE INDEX idx_test_cases_enabled ON test_cases(enabled);

-- =====================================================
-- 15. 评估运行表 (evaluation_runs)
-- =====================================================
DROP TABLE IF EXISTS evaluation_runs CASCADE;
CREATE TABLE evaluation_runs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(500),
  description TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  total_cases INTEGER DEFAULT 0,
  passed_cases INTEGER DEFAULT 0,
  failed_cases INTEGER DEFAULT 0,
  error_cases INTEGER DEFAULT 0,
  precision_score DECIMAL(5,4),
  recall_score DECIMAL(5,4),
  f1_score DECIMAL(5,4),
  accuracy_score DECIMAL(5,4),
  config JSONB DEFAULT '{}',
  results JSONB DEFAULT '{}',
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_evaluation_runs_status ON evaluation_runs(status);
CREATE INDEX idx_evaluation_runs_created ON evaluation_runs(created_at);

-- =====================================================
-- 16. 关键词分类表 (keyword_categories)
-- =====================================================
DROP TABLE IF EXISTS keyword_categories CASCADE;
CREATE TABLE keyword_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(200) NOT NULL,
  description TEXT,
  parent_id UUID REFERENCES keyword_categories(id),
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 17. 关键词规则表 (keyword_rules)
-- =====================================================
DROP TABLE IF EXISTS keyword_rules CASCADE;
CREATE TABLE keyword_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id UUID REFERENCES keyword_categories(id),
  keyword VARCHAR(500) NOT NULL,
  match_type VARCHAR(50) NOT NULL DEFAULT 'exact',
  case_sensitive BOOLEAN NOT NULL DEFAULT FALSE,
  weight DECIMAL(3,2) DEFAULT 1.00,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_keyword_rules_keyword ON keyword_rules(keyword);
CREATE INDEX idx_keyword_rules_category ON keyword_rules(category_id);

-- =====================================================
-- 18. 规则组表 (rule_groups)
-- =====================================================
DROP TABLE IF EXISTS rule_groups CASCADE;
CREATE TABLE rule_groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(200) NOT NULL,
  description TEXT,
  dimension_id UUID REFERENCES detection_dimensions(id),
  logic VARCHAR(50) NOT NULL DEFAULT 'or',
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 19. Agent 日志表 (agent_logs)
-- =====================================================
DROP TABLE IF EXISTS agent_logs CASCADE;
CREATE TABLE agent_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trace_id UUID REFERENCES agent_traces(id),
  agent_name VARCHAR(200),
  level VARCHAR(50) NOT NULL DEFAULT 'info',
  message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_agent_logs_trace ON agent_logs(trace_id);
CREATE INDEX idx_agent_logs_level ON agent_logs(level);

-- =====================================================
-- 20. Agent 追踪表 (agent_traces)
-- =====================================================
DROP TABLE IF EXISTS agent_traces CASCADE;
CREATE TABLE agent_traces (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID REFERENCES detection_sessions(id),
  status VARCHAR(50) NOT NULL DEFAULT 'running',
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'
);

CREATE INDEX idx_agent_traces_session ON agent_traces(session_id);

-- =====================================================
-- 21. 健康检查表 (health_check)
-- =====================================================
DROP TABLE IF EXISTS health_check CASCADE;
CREATE TABLE health_check (
  id SERIAL PRIMARY KEY,
  status VARCHAR(50) NOT NULL DEFAULT 'ok',
  checked_at TIMESTAMPTZ DEFAULT NOW()
);

-- 插入健康检查数据
INSERT INTO health_check (status, checked_at) VALUES
('ok', '2026-06-08 11:46:40.156272+08');

-- =====================================================
-- 22. 策略维度配置表 (policy_dimension_config)
-- =====================================================
DROP TABLE IF EXISTS policy_dimension_config CASCADE;
CREATE TABLE policy_dimension_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  policy_id VARCHAR(100) NOT NULL REFERENCES policy_profiles(id),
  dimension_id UUID NOT NULL REFERENCES detection_dimensions(id),
  action VARCHAR(50) NOT NULL DEFAULT 'block',
  threshold INTEGER DEFAULT 50,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(policy_id, dimension_id)
);

CREATE INDEX idx_policy_dimension_config_policy ON policy_dimension_config(policy_id);
CREATE INDEX idx_policy_dimension_config_dimension ON policy_dimension_config(dimension_id);

-- =====================================================
-- 完成提示
-- =====================================================
-- 数据库初始化完成！
-- 共创建 22 张表
-- 已导入核心数据：
--   - 16 个检测维度
--   - 86 条检测规则
--   - 3 个策略配置
--   - 1 条白名单规则
--   - 1 个 LLM 提供商
-- =====================================================
