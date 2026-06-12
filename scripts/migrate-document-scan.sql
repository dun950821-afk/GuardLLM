-- ============================================
-- 文档检测功能迁移脚本
-- 执行前请备份数据库
-- ============================================

-- 1. 创建文档扫描任务表
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

-- 1.1 创建文档任务表索引
CREATE INDEX IF NOT EXISTS document_scan_tasks_policy_id_idx ON document_scan_tasks(policy_id);
CREATE INDEX IF NOT EXISTS document_scan_tasks_status_idx ON document_scan_tasks(status);
CREATE INDEX IF NOT EXISTS document_scan_tasks_created_at_idx ON document_scan_tasks(created_at);

-- 2. 创建文档扫描风险发现表
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

-- 2.1 创建风险发现表索引
CREATE INDEX IF NOT EXISTS document_scan_findings_task_id_idx ON document_scan_findings(task_id);
CREATE INDEX IF NOT EXISTS document_scan_findings_dimension_code_idx ON document_scan_findings(dimension_code);
CREATE INDEX IF NOT EXISTS document_scan_findings_status_idx ON document_scan_findings(status);
CREATE INDEX IF NOT EXISTS document_scan_findings_severity_idx ON document_scan_findings(severity);

-- 3. 添加字段注释
COMMENT ON TABLE document_scan_tasks IS '文档扫描任务表';
COMMENT ON COLUMN document_scan_tasks.status IS '任务状态: pending, parsing, detecting, completed, failed';
COMMENT ON COLUMN document_scan_tasks.parsed_chunks IS '文档分片数组，每片包含 content, startLine, endLine 等';
COMMENT ON COLUMN document_scan_tasks.overall_score IS '文档总风险分 (0-100)';
COMMENT ON COLUMN document_scan_tasks.final_action IS '最终动作: allow, warn, block, mask, rewrite';

COMMENT ON TABLE document_scan_findings IS '文档扫描风险发现表';
COMMENT ON COLUMN document_scan_findings.chunk_index IS '所在分片索引';
COMMENT ON COLUMN document_scan_findings.line_number IS '所在行号';
COMMENT ON COLUMN document_scan_findings.severity IS '严重程度: low, medium, high, critical';
COMMENT ON COLUMN document_scan_findings.action IS '处理动作: allow, warn, block, mask, rewrite';
COMMENT ON COLUMN document_scan_findings.status IS '状态: open, accepted, ignored';

-- 完成
SELECT '文档检测功能迁移完成' AS status;
