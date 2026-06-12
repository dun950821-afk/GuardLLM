-- ============================================
-- 白名单功能迁移脚本
-- 执行前请备份数据库
-- ============================================

-- 0. 移除旧字段的 NOT NULL 约束（如果存在）
ALTER TABLE whitelist_rules ALTER COLUMN policy_id DROP NOT NULL;
ALTER TABLE whitelist_rules ALTER COLUMN dimension_id DROP NOT NULL;

-- 1. 为 whitelist_rules 表添加新字段
ALTER TABLE whitelist_rules 
ADD COLUMN IF NOT EXISTS name TEXT,
ADD COLUMN IF NOT EXISTS policy_scope VARCHAR(20) DEFAULT 'specific',
ADD COLUMN IF NOT EXISTS dimension_scope VARCHAR(20) DEFAULT 'specific',
ADD COLUMN IF NOT EXISTS dimension_codes JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 100,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 2. 迁移旧数据到新结构
-- 原 dimensionId = null 的记录迁移为全局白名单 (dimension_scope = 'all')
-- 原 dimensionId != null 的记录迁移为维度白名单 (dimension_scope = 'specific')
UPDATE whitelist_rules
SET 
  name = COALESCE(name, '白名单规则-' || LEFT(id::text, 8)),
  policy_scope = CASE WHEN policy_id IS NULL OR policy_id = '' THEN 'all' ELSE 'specific' END,
  dimension_scope = CASE WHEN dimension_id IS NULL THEN 'all' ELSE 'specific' END,
  dimension_codes = CASE 
    WHEN dimension_id IS NOT NULL THEN 
      (SELECT jsonb_agg(code) FROM detection_dimensions WHERE id = whitelist_rules.dimension_id)
    ELSE '[]'::jsonb
  END
WHERE name IS NULL OR dimension_codes IS NULL OR dimension_codes = '[]'::jsonb;

-- 3. 为 detection_sessions 表添加白名单命中信息字段
ALTER TABLE detection_sessions
ADD COLUMN IF NOT EXISTS whitelist_matched JSONB,
ADD COLUMN IF NOT EXISTS skipped_dimensions JSONB DEFAULT '[]';

-- 3.1 为 detection_records 表添加处理动作字段
ALTER TABLE detection_records
ADD COLUMN IF NOT EXISTS processing_action VARCHAR(20);

-- 4. 创建白名单规则-策略关联表
-- 注意：
--   whitelist_rule_id 使用 UUID 类型，匹配 whitelist_rules.id
--   policy_id 使用 VARCHAR 类型，匹配 policy_profiles.id（如 'default-policy'）
CREATE TABLE IF NOT EXISTS whitelist_rule_policies (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  whitelist_rule_id UUID NOT NULL REFERENCES whitelist_rules(id) ON DELETE CASCADE,
  policy_id VARCHAR(36) NOT NULL REFERENCES policy_profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(whitelist_rule_id, policy_id)
);

-- 4.1 如果表已存在且字段类型不匹配，需要转换
DO $$
BEGIN
  -- 检查 whitelist_rule_id 字段类型是否为 VARCHAR
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'whitelist_rule_policies' 
    AND column_name = 'whitelist_rule_id' 
    AND data_type = 'character varying'
  ) THEN
    -- 删除外键约束
    ALTER TABLE whitelist_rule_policies DROP CONSTRAINT IF EXISTS whitelist_rule_policies_policy_id_fkey;
    ALTER TABLE whitelist_rule_policies DROP CONSTRAINT IF EXISTS whitelist_rule_policies_whitelist_rule_id_fkey;
    -- 修改字段类型：whitelist_rule_id 从 VARCHAR 转为 UUID
    ALTER TABLE whitelist_rule_policies ALTER COLUMN whitelist_rule_id TYPE UUID USING whitelist_rule_id::UUID;
    -- policy_id 保持 VARCHAR（已经是正确的类型）
    -- 重新添加外键约束
    ALTER TABLE whitelist_rule_policies 
      ADD CONSTRAINT whitelist_rule_policies_whitelist_rule_id_fkey 
      FOREIGN KEY (whitelist_rule_id) REFERENCES whitelist_rules(id) ON DELETE CASCADE;
    ALTER TABLE whitelist_rule_policies 
      ADD CONSTRAINT whitelist_rule_policies_policy_id_fkey 
      FOREIGN KEY (policy_id) REFERENCES policy_profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 5. 迁移旧的 policyId 到 whitelist_rule_policies 表
-- 只有 policy_scope = 'specific' 的记录需要关联
INSERT INTO whitelist_rule_policies (id, whitelist_rule_id, policy_id)
SELECT gen_random_uuid()::text, id, policy_id
FROM whitelist_rules 
WHERE policy_id IS NOT NULL 
  AND policy_id != ''
  AND policy_scope = 'specific'
  AND NOT EXISTS (
    SELECT 1 FROM whitelist_rule_policies wrp WHERE wrp.whitelist_rule_id = whitelist_rules.id
  )
ON CONFLICT DO NOTHING;

-- 6. 创建索引
CREATE INDEX IF NOT EXISTS whitelist_rules_policy_scope_idx ON whitelist_rules(policy_scope);
CREATE INDEX IF NOT EXISTS whitelist_rules_dimension_scope_idx ON whitelist_rules(dimension_scope);
CREATE INDEX IF NOT EXISTS whitelist_rules_enabled_idx ON whitelist_rules(enabled);
CREATE INDEX IF NOT EXISTS whitelist_rules_priority_idx ON whitelist_rules(priority);
CREATE INDEX IF NOT EXISTS whitelist_rule_policies_whitelist_rule_id_idx ON whitelist_rule_policies(whitelist_rule_id);
CREATE INDEX IF NOT EXISTS whitelist_rule_policies_policy_id_idx ON whitelist_rule_policies(policy_id);

-- 7. 更新字段注释
COMMENT ON COLUMN whitelist_rules.policy_scope IS '策略范围: all=全部策略, specific=指定策略';
COMMENT ON COLUMN whitelist_rules.dimension_scope IS '维度范围: all=全部维度, specific=指定维度';
COMMENT ON COLUMN whitelist_rules.dimension_codes IS '适用维度编码数组，当 dimension_scope = specific 时使用';
COMMENT ON COLUMN whitelist_rules.priority IS '优先级，数值越大越先匹配';
COMMENT ON COLUMN detection_sessions.whitelist_matched IS '命中的白名单信息';
COMMENT ON COLUMN detection_sessions.skipped_dimensions IS '被跳过的维度列表';
COMMENT ON TABLE whitelist_rule_policies IS '白名单规则-策略关联表，当 policy_scope = specific 时使用';

-- 8. 为 llm_providers 表添加 use_case 字段（如果不存在）
ALTER TABLE llm_providers 
ADD COLUMN IF NOT EXISTS use_case VARCHAR(20) DEFAULT 'target';

COMMENT ON COLUMN llm_providers.use_case IS '用途: target=检测目标模型, judge=评审模型, both=两者皆可, ocr=仅OCR识别';

-- 完成
SELECT '白名单功能和模型用途迁移完成' AS status;
