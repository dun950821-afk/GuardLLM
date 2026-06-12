-- GuardLLM 数据库初始化脚本
-- 此脚本在 PostgreSQL 容器首次启动时自动执行

-- 确保数据库存在（通常由 POSTGRES_DB 环境变量创建）
-- 这里我们创建扩展和初始配置

-- 启用 UUID 扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 创建 pgcrypto 扩展（用于加密功能）
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 授予用户权限
GRANT ALL PRIVILEGES ON DATABASE guardllm TO guardllm;

-- 创建文档扫描任务表
CREATE TABLE IF NOT EXISTS document_scan_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name VARCHAR(500) NOT NULL,
  file_type VARCHAR(50) NOT NULL,
  file_size INTEGER,
  policy_id VARCHAR(36) NOT NULL REFERENCES policy_profiles(id),
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  status_message TEXT,
  extracted_text TEXT,
  parsed_chunks JSONB DEFAULT '[]',
  ocr_enabled BOOLEAN DEFAULT FALSE,
  ocr_results JSONB DEFAULT '[]',
  overall_score INTEGER,
  final_action VARCHAR(20),
  findings_count INTEGER DEFAULT 0,
  whitelist_matched JSONB,
  skipped_dimensions JSONB,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- 创建文档扫描风险发现表
CREATE TABLE IF NOT EXISTS document_scan_findings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES document_scan_tasks(id) ON DELETE CASCADE,
  chunk_index INTEGER,
  line_number INTEGER,
  start_offset INTEGER,
  end_offset INTEGER,
  dimension_id UUID,
  dimension_code VARCHAR(100),
  dimension_name VARCHAR(200),
  rule_id UUID,
  rule_name VARCHAR(200),
  rule_type VARCHAR(20),
  score INTEGER NOT NULL,
  severity VARCHAR(20) NOT NULL,
  action VARCHAR(20) NOT NULL,
  evidence JSONB DEFAULT '[]',
  masked_evidence JSONB DEFAULT '[]',
  reason TEXT,
  suggestion TEXT,
  whitelist_matched JSONB,
  skipped_dimensions JSONB,
  status VARCHAR(20) DEFAULT 'open' NOT NULL,
  ignore_reason VARCHAR(50),
  ignore_note TEXT,
  ignored_at TIMESTAMP WITH TIME ZONE,
  ignored_by VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 创建索引
CREATE INDEX IF NOT EXISTS document_scan_tasks_policy_id_idx ON document_scan_tasks(policy_id);
CREATE INDEX IF NOT EXISTS document_scan_tasks_status_idx ON document_scan_tasks(status);
CREATE INDEX IF NOT EXISTS document_scan_tasks_created_at_idx ON document_scan_tasks(created_at);
CREATE INDEX IF NOT EXISTS document_scan_findings_task_id_idx ON document_scan_findings(task_id);
CREATE INDEX IF NOT EXISTS document_scan_findings_dimension_code_idx ON document_scan_findings(dimension_code);
CREATE INDEX IF NOT EXISTS document_scan_findings_status_idx ON document_scan_findings(status);
CREATE INDEX IF NOT EXISTS document_scan_findings_severity_idx ON document_scan_findings(severity);

-- 输出初始化完成信息
DO $$
BEGIN
    RAISE NOTICE 'GuardLLM database initialized successfully';
END $$;
