-- 裁判模型配置表
CREATE TABLE IF NOT EXISTS policy_judge_configs (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
    policy_id VARCHAR(36) NOT NULL REFERENCES policy_profiles(id) ON DELETE CASCADE,
    enabled BOOLEAN NOT NULL DEFAULT false,
    provider_id VARCHAR(36) REFERENCES llm_providers(id) ON DELETE SET NULL,
    mode VARCHAR(20) NOT NULL DEFAULT 'conservative', -- 'conservative', 'balanced', 'review_only'
    trigger_mode VARCHAR(20) NOT NULL DEFAULT 'risk_or_semantic', -- 'risk_only', 'risk_or_semantic', 'always'
    trigger_threshold INTEGER NOT NULL DEFAULT 40,
    judge_threshold INTEGER NOT NULL DEFAULT 70,
    weight DECIMAL(3,2) NOT NULL DEFAULT 0.5,
    apply_to_input BOOLEAN NOT NULL DEFAULT true,
    apply_to_output BOOLEAN NOT NULL DEFAULT true,
    enabled_dimensions JSONB DEFAULT '[]'::jsonb,
    semantic_dimensions JSONB DEFAULT '[]'::jsonb,
    timeout_ms INTEGER NOT NULL DEFAULT 8000,
    fallback_action VARCHAR(20) NOT NULL DEFAULT 'rule', -- 'rule', 'allow', 'block'
    fail_closed_for_high_risk BOOLEAN NOT NULL DEFAULT true,
    max_text_length INTEGER NOT NULL DEFAULT 6000,
    mask_pii_before_judge BOOLEAN NOT NULL DEFAULT true,
    block_external_for_secrets BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(policy_id)
);

-- 裁判模型调用记录表
CREATE TABLE IF NOT EXISTS judge_model_invocations (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id VARCHAR(100),
    policy_id VARCHAR(36) REFERENCES policy_profiles(id) ON DELETE SET NULL,
    provider_id VARCHAR(36) REFERENCES llm_providers(id) ON DELETE SET NULL,
    direction VARCHAR(10) NOT NULL, -- 'input', 'output'
    model_name VARCHAR(100),
    prompt_version VARCHAR(20) DEFAULT 'v1',
    text_length INTEGER,
    rule_score INTEGER,
    rule_action VARCHAR(20),
    rule_findings JSONB DEFAULT '[]'::jsonb,
    judge_score INTEGER,
    judge_confidence DECIMAL(3,2),
    judge_action VARCHAR(20),
    judge_reason TEXT,
    judge_dimensions JSONB,
    rule_review JSONB,
    raw_response JSONB,
    parse_error TEXT,
    error_message TEXT,
    latency_ms INTEGER,
    used_in_decision BOOLEAN DEFAULT false,
    decision_mode VARCHAR(20),
    final_score INTEGER,
    final_action VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_policy_judge_configs_policy_id ON policy_judge_configs(policy_id);
CREATE INDEX IF NOT EXISTS idx_policy_judge_configs_enabled ON policy_judge_configs(enabled);
CREATE INDEX IF NOT EXISTS idx_judge_model_invocations_session_id ON judge_model_invocations(session_id);
CREATE INDEX IF NOT EXISTS idx_judge_model_invocations_policy_id ON judge_model_invocations(policy_id);
CREATE INDEX IF NOT EXISTS idx_judge_model_invocations_created_at ON judge_model_invocations(created_at);

-- 添加触发器自动更新 updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_policy_judge_configs_updated_at ON policy_judge_configs;
CREATE TRIGGER update_policy_judge_configs_updated_at
    BEFORE UPDATE ON policy_judge_configs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
