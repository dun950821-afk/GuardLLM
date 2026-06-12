import { sql } from "drizzle-orm";
import { pgTable, varchar, text, timestamp, boolean, integer, decimal, jsonb, index, serial, uuid } from "drizzle-orm/pg-core";

// ============================================
// 系统表 - 必须保留，禁止删除
// ============================================
export const healthCheck = pgTable("health_check", {
	id: serial().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});

// ============================================
// 18. 文档扫描任务表
// ============================================
export const documentScanTasks = pgTable(
	"document_scan_tasks",
	{
		id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
		fileName: varchar("file_name", { length: 500 }).notNull(),
		fileType: varchar("file_type", { length: 50 }).notNull(), // txt, pdf, docx, png, jpg, etc.
		fileSize: integer("file_size"),
		fileKey: varchar("file_key", { length: 500 }), // 对象存储中的文件 key
		policyId: varchar("policy_id", { length: 36 }).notNull().references(() => policyProfiles.id),
		status: varchar("status", { length: 20 }).notNull().default("pending"), // pending, parsing, detecting, completed, failed
		statusMessage: text("status_message"),
		extractedText: text("extracted_text"),
		parsedChunks: jsonb("parsed_chunks").$type<Array<{
			index: number;
			content: string;
			startLine: number;
			endLine: number;
			startOffset: number;
			endOffset: number;
		}>>().default([]),
		ocrEnabled: boolean("ocr_enabled").default(false),
		ocrResults: jsonb("ocr_results").$type<Array<{
			pageNumber: number;
			text: string;
		}>>().default([]),
		overallScore: integer("overall_score"),
		finalAction: varchar("final_action", { length: 20 }), // allow, warn, block
		findingsCount: integer("findings_count").default(0),
		whitelistMatched: jsonb("whitelist_matched"),
		skippedDimensions: jsonb("skipped_dimensions"),
		errorMessage: text("error_message"),
		// 预览和定位相关
		previewHtml: text("preview_html"), // 保留格式的HTML预览
		plainLines: jsonb("plain_lines").$type<Array<{
			lineNumber: number;
			text: string;
			startOffset: number;
			endOffset: number;
		}>>().default([]),
		parseMeta: jsonb("parse_meta").$type<{
			hasTables?: boolean;
			hasImages?: boolean;
			totalLines?: number;
			totalChars?: number;
		}>().default({}),
		createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
		completedAt: timestamp("completed_at", { withTimezone: true }),
	},
	(table) => [
		index("document_scan_tasks_policy_id_idx").on(table.policyId),
		index("document_scan_tasks_status_idx").on(table.status),
		index("document_scan_tasks_created_at_idx").on(table.createdAt),
	]
);

// ============================================
// 19. 文档扫描风险发现表
// ============================================
export const documentScanFindings = pgTable(
	"document_scan_findings",
	{
		id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
		taskId: uuid("task_id").notNull().references(() => documentScanTasks.id, { onDelete: "cascade" }),
		chunkIndex: integer("chunk_index"),
		lineNumber: integer("line_number"),
		startOffset: integer("start_offset"),
		endOffset: integer("end_offset"),
		locationStatus: varchar("location_status", { length: 20 }).default("located"), // located, not_found
		// 维度信息
		dimensionId: uuid("dimension_id"),
		dimensionCode: varchar("dimension_code", { length: 100 }),
		dimensionName: varchar("dimension_name", { length: 200 }),
		// 规则信息
		ruleId: uuid("rule_id"),
		ruleName: varchar("rule_name", { length: 200 }),
		ruleType: varchar("rule_type", { length: 20 }), // keyword, regex, semantic, llm
		// 风险评估
		score: integer("score").notNull(),
		severity: varchar("severity", { length: 20 }).notNull(), // low, medium, high, critical
		action: varchar("action", { length: 20 }).notNull(), // allow, warn, block, mask, rewrite
		// 证据
		evidence: jsonb("evidence").$type<string[]>().default([]),
		maskedEvidence: jsonb("masked_evidence").$type<string[]>().default([]),
		// 说明
		reason: text("reason"),
		suggestion: text("suggestion"),
		// 白名单
		whitelistMatched: jsonb("whitelist_matched"),
		skippedDimensions: jsonb("skipped_dimensions"),
		// 状态
		status: varchar("status", { length: 20 }).default("open").notNull(), // open, accepted, ignored
		ignoreReason: varchar("ignore_reason", { length: 50 }), // false_positive, test_data, education, acceptable, other
		ignoreNote: text("ignore_note"),
		ignoredAt: timestamp("ignored_at", { withTimezone: true }),
		ignoredBy: varchar("ignored_by", { length: 100 }),
		createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
	},
	(table) => [
		index("document_scan_findings_task_id_idx").on(table.taskId),
		index("document_scan_findings_dimension_code_idx").on(table.dimensionCode),
		index("document_scan_findings_status_idx").on(table.status),
		index("document_scan_findings_severity_idx").on(table.severity),
	]
);

// ============================================
// 1. 模型供应商配置表
// ============================================
export const llmProviders = pgTable(
	"llm_providers",
	{
		id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
		name: varchar("name", { length: 100 }).notNull().unique(),
		displayName: varchar("display_name", { length: 200 }).notNull(),
		providerType: varchar("provider_type", { length: 50 }).notNull(), // 'openai_compatible', 'coze', 'ollama', 'custom'
		baseUrl: varchar("base_url", { length: 500 }),
		apiKeyEncrypted: text("api_key_encrypted"),
		defaultModel: varchar("default_model", { length: 100 }),
		useCase: varchar("use_case", { length: 20 }), // 'target', 'judge', 'both', 'ocr'
		isEnabled: boolean("is_enabled").default(true).notNull(),
		isDefaultTarget: boolean("is_default_target").default(false).notNull(),
		isDefaultJudge: boolean("is_default_judge").default(false).notNull(),
		avgLatencyMs: integer("avg_latency_ms"),
		lastTestAt: timestamp("last_test_at", { withTimezone: true }),
		lastTestSuccess: boolean("last_test_success"),
		configJson: jsonb("config_json"),
		createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true }),
		createdBy: varchar("created_by", { length: 100 }).default("system").notNull(),
	},
	(table) => [
		index("llm_providers_name_idx").on(table.name),
		index("llm_providers_is_enabled_idx").on(table.isEnabled),
	]
);

// ============================================
// 2. 策略方案表
// ============================================
export const policyProfiles = pgTable(
	"policy_profiles",
	{
		id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
		name: varchar("name", { length: 100 }).notNull().unique(),
		description: text("description"),
		isDefault: boolean("is_default").default(false).notNull(),
		isActive: boolean("is_active").default(true).notNull(),
		version: integer("version").default(1).notNull(),
		tags: jsonb("tags").$type<string[]>().default([]),
		metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
		// 策略升级配置
		escalationEnabled: boolean("escalation_enabled").default(false).notNull(),
		escalationThreshold: integer("escalation_threshold").default(5).notNull(), // 连续警告次数阈值
		escalationTargetPolicyId: varchar("escalation_target_policy_id", { length: 36 }).references(() => policyProfiles.id), // 升级到的目标策略ID
		deescalationThreshold: integer("deescalation_threshold").default(1).notNull(), // 降级需要连续allow次数
		escalationCooldownMinutes: integer("escalation_cooldown_minutes").default(30).notNull(), // 升级后冷却期（分钟）
		createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true }),
		createdBy: varchar("created_by", { length: 100 }).default("system").notNull(),
	},
	(table) => [
		index("policy_profiles_name_idx").on(table.name),
		index("policy_profiles_is_default_idx").on(table.isDefault),
		index("policy_profiles_is_active_idx").on(table.isActive),
	]
);

// ============================================
// 3. 策略规则表
// ============================================
export const policyRules = pgTable(
	"policy_rules",
	{
		id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
		policyId: varchar("policy_id", { length: 36 }).notNull().references(() => policyProfiles.id, { onDelete: "cascade" }),
		dimension: varchar("dimension", { length: 50 }).notNull(), // 'prompt_injection', 'pii_leak', 'malicious_code', 'violence_hate', 'illegal_content'
		enabled: boolean("enabled").default(true).notNull(),
		warnEnabled: boolean("warn_enabled").default(true).notNull(), // 是否启用警告
		blockEnabled: boolean("block_enabled").default(true).notNull(), // 是否启用阻断
		warnThreshold: decimal("warn_threshold", { precision: 5, scale: 2 }).default("50.00").notNull(),
		blockThreshold: decimal("block_threshold", { precision: 5, scale: 2 }).default("80.00").notNull(),
		autoMask: boolean("auto_mask").default(false).notNull(),
		autoRewrite: boolean("auto_rewrite").default(false).notNull(),
		createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
	},
	(table) => [
		index("policy_rules_policy_id_idx").on(table.policyId),
		index("policy_rules_dimension_idx").on(table.dimension),
	]
);

// ============================================
// 4. 关键词分类表
// ============================================
export const keywordCategories = pgTable(
	"keyword_categories",
	{
		id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
		policyId: varchar("policy_id", { length: 36 }).notNull().references(() => policyProfiles.id, { onDelete: "cascade" }),
		name: varchar("name", { length: 100 }).notNull(),
		dimension: varchar("dimension", { length: 50 }).notNull(),
		description: text("description"),
		priority: integer("priority").default(100).notNull(),
		enabled: boolean("enabled").default(true).notNull(),
		createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
	},
	(table) => [
		index("keyword_categories_policy_id_idx").on(table.policyId),
		index("keyword_categories_dimension_idx").on(table.dimension),
	]
);

// ============================================
// 5. 自定义关键词规则表
// ============================================
export const keywordRules = pgTable(
	"keyword_rules",
	{
		id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
		policyId: varchar("policy_id", { length: 36 }).notNull().references(() => policyProfiles.id, { onDelete: "cascade" }),
		categoryId: varchar("category_id", { length: 36 }).references(() => keywordCategories.id, { onDelete: "set null" }),
		dimension: varchar("dimension", { length: 50 }).notNull(),
		keyword: varchar("keyword", { length: 500 }).notNull(),
		score: decimal("score", { precision: 5, scale: 2 }).default("90.00").notNull(),
		matchType: varchar("match_type", { length: 20 }).default("exact").notNull(), // 'exact', 'prefix', 'suffix', 'regex'
		caseSensitive: boolean("case_sensitive").default(false).notNull(),
		enabled: boolean("enabled").default(true).notNull(),
		description: text("description"),
		tags: jsonb("tags").$type<string[]>().default([]),
		createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
	},
	(table) => [
		index("keyword_rules_policy_id_idx").on(table.policyId),
		index("keyword_rules_category_id_idx").on(table.categoryId),
		index("keyword_rules_dimension_idx").on(table.dimension),
		index("keyword_rules_keyword_idx").on(table.keyword),
	]
);

// ============================================
// 6. 策略版本历史表
// ============================================
export const policyVersions = pgTable(
	"policy_versions",
	{
		id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
		policyId: varchar("policy_id", { length: 36 }).notNull().references(() => policyProfiles.id, { onDelete: "cascade" }),
		version: integer("version").notNull(),
		snapshot: jsonb("snapshot").notNull(),
		changeSummary: text("change_summary"),
		changedBy: varchar("changed_by", { length: 100 }),
		createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
	},
	(table) => [
		index("policy_versions_policy_id_idx").on(table.policyId),
	]
);

// ============================================
// 7. 检测会话表
// ============================================
export const detectionSessions = pgTable(
	"detection_sessions",
	{
		id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
		userId: varchar("user_id", { length: 100 }),
		userPrompt: text("user_prompt").notNull(),
		mockModelOutput: text("mock_model_output"),
		finalResponse: text("final_response"),
		inputAction: varchar("input_action", { length: 20 }), // 'block', 'warn', 'allow', 'mask', 'rewrite'
		inputScore: decimal("input_score", { precision: 5, scale: 2 }),
		inputSummary: text("input_summary"),
		outputAction: varchar("output_action", { length: 20 }),
		outputScore: decimal("output_score", { precision: 5, scale: 2 }),
		outputSummary: text("output_summary"),
		finalAction: varchar("final_action", { length: 20 }),
		policyId: varchar("policy_id", { length: 36 }).references(() => policyProfiles.id),
		targetProviderId: varchar("target_provider_id", { length: 36 }).references(() => llmProviders.id, ),
		judgeProviderId: varchar("judge_provider_id", { length: 36 }).references(() => llmProviders.id, ),
		durationMs: integer("duration_ms"),
		// 白名单命中信息
		whitelistMatched: jsonb("whitelist_matched").$type<{
			id: string;
			name: string;
			policyScope: string;
			dimensionScope: string;
			dimensionCodes: string[];
			effect: string;
		}>(),
		skippedDimensions: jsonb("skipped_dimensions").$type<Array<{
			dimensionCode: string;
			dimensionName: string;
			whitelistId: string;
			whitelistName: string;
			effect: string;
		}>>().default([]),
		createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
	},
	(table) => [
		index("detection_sessions_user_id_idx").on(table.userId),
		index("detection_sessions_final_action_idx").on(table.finalAction),
		index("detection_sessions_created_at_idx").on(table.createdAt),
		index("detection_sessions_policy_id_idx").on(table.policyId),
	]
);

// ============================================
// 8. 检测记录表
// ============================================
export const detectionRecords = pgTable(
	"detection_records",
	{
		id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
		sessionId: varchar("session_id", { length: 36 }).notNull().references(() => detectionSessions.id, { onDelete: "cascade" }),
		direction: varchar("direction", { length: 10 }).notNull(), // 'input', 'output'
		rawText: text("raw_text").notNull(),
		maskedText: text("masked_text"),
		rewrittenText: text("rewritten_text"),
		overallScore: decimal("overall_score", { precision: 5, scale: 2 }),
		confidence: decimal("confidence", { precision: 3, scale: 2 }),
		action: varchar("action", { length: 20 }),
		processingAction: varchar("processing_action", { length: 20 }), // 'none', 'mask', 'rewrite'
		summary: text("summary"),
		ruleLatencyMs: integer("rule_latency_ms"),
		cozeLatencyMs: integer("coze_latency_ms"),
		totalLatencyMs: integer("total_latency_ms"),
		createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
	},
	(table) => [
		index("detection_records_session_id_idx").on(table.sessionId),
		index("detection_records_direction_idx").on(table.direction),
		index("detection_records_action_idx").on(table.action),
	]
);

// ============================================
// 9. 风险明细表
// ============================================
export const riskFindings = pgTable(
	"risk_findings",
	{
		id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
		recordId: varchar("record_id", { length: 36 }).notNull().references(() => detectionRecords.id, { onDelete: "cascade" }),
		dimension: varchar("dimension", { length: 50 }).notNull(),
		score: decimal("score", { precision: 5, scale: 2 }),
		confidence: decimal("confidence", { precision: 3, scale: 2 }),
		severity: varchar("severity", { length: 20 }), // 'critical', 'high', 'medium', 'low'
		matchedRules: jsonb("matched_rules").$type<string[]>(),
		evidence: jsonb("evidence").$type<string[]>(),
		reason: text("reason"),
		suggestion: text("suggestion"),
		createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
	},
	(table) => [
		index("risk_findings_record_id_idx").on(table.recordId),
		index("risk_findings_dimension_idx").on(table.dimension),
		index("risk_findings_severity_idx").on(table.severity),
	]
);

// ============================================
// 10. 测试用例表
// ============================================
export const testCases = pgTable(
	"test_cases",
	{
		id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
		title: varchar("title", { length: 200 }).notNull(),
		description: text("description"),
		category: varchar("category", { length: 50 }).notNull(), // 'normal_qa', 'prompt_injection', 'pii_leak', etc.
		inputText: text("input_text").notNull(),
		outputText: text("output_text"),
		expectedAction: varchar("expected_action", { length: 20 }),
		expectedDimensions: jsonb("expected_dimensions").$type<string[]>(),
		expectedScoreMin: decimal("expected_score_min", { precision: 5, scale: 2 }),
		expectedScoreMax: decimal("expected_score_max", { precision: 5, scale: 2 }),
		severity: varchar("severity", { length: 20 }),
		enabled: boolean("enabled").default(true).notNull(),
		createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
	},
	(table) => [
		index("test_cases_category_idx").on(table.category),
		index("test_cases_enabled_idx").on(table.enabled),
	]
);

// ============================================
// 11. 批量评估任务表
// ============================================
export const evaluationRuns = pgTable(
	"evaluation_runs",
	{
		id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
		userId: varchar("user_id", { length: 100 }),
		policyId: varchar("policy_id", { length: 36 }).references(() => policyProfiles.id),
		testCaseIds: jsonb("test_case_ids").$type<string[]>().notNull(),
		status: varchar("status", { length: 20 }).default("pending").notNull(), // 'pending', 'running', 'completed', 'failed'
		totalCases: integer("total_cases").notNull(),
		completedCases: integer("completed_cases").default(0).notNull(),
		accuracy: decimal("accuracy", { precision: 5, scale: 2 }),
		falsePositiveRate: decimal("false_positive_rate", { precision: 5, scale: 2 }),
		falseNegativeRate: decimal("false_negative_rate", { precision: 5, scale: 2 }),
		recall: decimal("recall", { precision: 5, scale: 2 }),
		f1Score: decimal("f1_score", { precision: 5, scale: 2 }),
		startedAt: timestamp("started_at", { withTimezone: true }),
		completedAt: timestamp("completed_at", { withTimezone: true }),
		createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
	},
	(table) => [
		index("evaluation_runs_user_id_idx").on(table.userId),
		index("evaluation_runs_status_idx").on(table.status),
		index("evaluation_runs_policy_id_idx").on(table.policyId),
	]
);

// ============================================
// 12. 检测维度表（可自定义维度）
// ============================================
export const detectionDimensions = pgTable(
	"detection_dimensions",
	{
		id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
		code: varchar("code", { length: 50 }).notNull().unique(),
		name: varchar("name", { length: 100 }).notNull(),
		description: text("description"),
		category: varchar("category", { length: 50 }),
		weight: decimal("weight", { precision: 5, scale: 2 }).default("1.00").notNull(),
		priority: integer("priority").default(100).notNull(),
		enabled: boolean("enabled").default(true).notNull(),
		isSystem: boolean("is_system").default(false).notNull(),
		config: jsonb("config").$type<Record<string, unknown>>().default({}),
		createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
	},
	(table) => [
		index("detection_dimensions_code_idx").on(table.code),
		index("detection_dimensions_enabled_idx").on(table.enabled),
	]
);

// ============================================
// 13. 规则组表
// ============================================
export const ruleGroups = pgTable(
	"rule_groups",
	{
		id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
		dimensionId: varchar("dimension_id", { length: 36 }).notNull().references(() => detectionDimensions.id, { onDelete: "cascade" }),
		name: varchar("name", { length: 100 }).notNull(),
		description: text("description"),
		logic: varchar("logic", { length: 10 }).default("OR").notNull(),
		score: decimal("score", { precision: 5, scale: 2 }).default("50.00").notNull(),
		priority: integer("priority").default(100).notNull(),
		enabled: boolean("enabled").default(true).notNull(),
		createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
	},
	(table) => [
		index("rule_groups_dimension_id_idx").on(table.dimensionId),
	]
);

// ============================================
// 14. 检测规则表
// ============================================
export const detectionRules = pgTable(
	"detection_rules",
	{
		id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
		dimensionId: varchar("dimension_id", { length: 36 }).notNull().references(() => detectionDimensions.id, { onDelete: "cascade" }),
		groupId: varchar("group_id", { length: 36 }).references(() => ruleGroups.id, { onDelete: "set null" }),
		name: varchar("name", { length: 100 }).notNull(),
		type: varchar("type", { length: 20 }).notNull(), // keyword, regex, semantic, llm
		pattern: text("pattern"),
		matchType: varchar("match_type", { length: 20 }).default("contains").notNull(),
		caseSensitive: boolean("case_sensitive").default(false).notNull(),
		score: decimal("score", { precision: 5, scale: 2 }).default("50.00").notNull(),
		confidence: decimal("confidence", { precision: 5, scale: 2 }).default("80.00").notNull(),
		priority: integer("priority").default(100).notNull(),
		enabled: boolean("enabled").default(true).notNull(),
		description: text("description"),
		suggestion: text("suggestion"), // 修复建议
		config: jsonb("config").$type<Record<string, unknown>>().default({}),
		tags: jsonb("tags").$type<string[]>().default([]),
		createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
	},
	(table) => [
		index("detection_rules_dimension_id_idx").on(table.dimensionId),
		index("detection_rules_group_id_idx").on(table.groupId),
		index("detection_rules_type_idx").on(table.type),
	]
);

// ============================================
// 15. 白名单规则表
// ============================================
export const whitelistRules = pgTable(
	"whitelist_rules",
	{
		id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
		// 兼容旧字段，新逻辑优先使用 policyScope 和 dimensionScope
		policyId: varchar("policy_id", { length: 36 }).references(() => policyProfiles.id, { onDelete: "cascade" }),
		dimensionId: varchar("dimension_id", { length: 36 }).references(() => detectionDimensions.id, { onDelete: "cascade" }),
		// 新增字段
		name: varchar("name", { length: 200 }),
		description: text("description"),
		policyScope: varchar("policy_scope", { length: 20 }).default("specific").notNull(), // 'all' | 'specific'
		dimensionScope: varchar("dimension_scope", { length: 20 }).default("specific").notNull(), // 'all' | 'specific'
		dimensionCodes: jsonb("dimension_codes").$type<string[]>().default([]),
		priority: integer("priority").default(100).notNull(),
		// 匹配规则
		pattern: text("pattern").notNull(),
		matchType: varchar("match_type", { length: 20 }).default("contains").notNull(),
		caseSensitive: boolean("case_sensitive").default(false).notNull(),
		enabled: boolean("enabled").default(true).notNull(),
		createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true }),
	},
	(table) => [
		index("whitelist_rules_policy_id_idx").on(table.policyId),
		index("whitelist_rules_dimension_id_idx").on(table.dimensionId),
		index("whitelist_rules_policy_scope_idx").on(table.policyScope),
		index("whitelist_rules_dimension_scope_idx").on(table.dimensionScope),
		index("whitelist_rules_enabled_idx").on(table.enabled),
		index("whitelist_rules_priority_idx").on(table.priority),
	]
);

// ============================================
// 15.1 白名单规则-策略关联表
// 当 policyScope = 'specific' 时，通过此表关联多个策略
// ============================================
export const whitelistRulePolicies = pgTable(
	"whitelist_rule_policies",
	{
		id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()::text`),
		whitelistRuleId: varchar("whitelist_rule_id", { length: 36 }).notNull().references(() => whitelistRules.id, { onDelete: "cascade" }),
		policyId: varchar("policy_id", { length: 36 }).notNull().references(() => policyProfiles.id, { onDelete: "cascade" }),
		createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
	},
	(table) => [
		index("whitelist_rule_policies_whitelist_rule_id_idx").on(table.whitelistRuleId),
		index("whitelist_rule_policies_policy_id_idx").on(table.policyId),
	]
);

// ============================================
// 16. 策略维度配置表
// ============================================
export const policyDimensionConfig = pgTable(
	"policy_dimension_config",
	{
		id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
		policyId: varchar("policy_id", { length: 36 }).notNull().references(() => policyProfiles.id, { onDelete: "cascade" }),
		dimensionId: varchar("dimension_id", { length: 36 }).notNull().references(() => detectionDimensions.id, { onDelete: "cascade" }),
		enabled: boolean("enabled").default(true).notNull(),
		warnEnabled: boolean("warn_enabled").default(true).notNull(),
		blockEnabled: boolean("block_enabled").default(true).notNull(),
		warnThreshold: integer("warn_threshold").default(50).notNull(),
		blockThreshold: integer("block_threshold").default(80).notNull(),
		autoMask: boolean("auto_mask").default(false).notNull(),
		autoRewrite: boolean("auto_rewrite").default(false).notNull(),
		customWeight: decimal("custom_weight", { precision: 5, scale: 2 }),
		actionConfig: jsonb("action_config").$type<{
			low?: string;
			medium?: string;
			high?: string;
			enableMask?: boolean;
			enableRewrite?: boolean;
			fallbackMessage?: string;
		}>().default({}),
		createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
	},
	(table) => [
		index("policy_dimension_config_policy_id_idx").on(table.policyId),
		index("policy_dimension_config_dimension_id_idx").on(table.dimensionId),
	]
);

// ============================================
// 17. Agent运行日志表
// ============================================
export const agentTraces = pgTable(
	"agent_traces",
	{
		id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
		recordId: varchar("record_id", { length: 36 }).references(() => detectionRecords.id, { onDelete: "cascade" }),
		providerId: varchar("provider_id", { length: 36 }).references(() => llmProviders.id),
		workflowName: varchar("workflow_name", { length: 100 }),
		requestPayload: jsonb("request_payload"),
		responsePayload: jsonb("response_payload"),
		latencyMs: integer("latency_ms"),
		success: boolean("success").notNull(),
		errorMessage: text("error_message"),
		createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
	},
	(table) => [
		index("agent_traces_record_id_idx").on(table.recordId),
		index("agent_traces_provider_id_idx").on(table.providerId),
		index("agent_traces_created_at_idx").on(table.createdAt),
	]
);

// ============================================
// 18. 用户表
// ============================================
export const users = pgTable(
	"users",
	{
		id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
		username: varchar("username", { length: 50 }).notNull().unique(),
		nickname: varchar("nickname", { length: 100 }),
		email: varchar("email", { length: 255 }),
		password: varchar("password", { length: 255 }).notNull(), // 存储加密后的密码
		phone: varchar("phone", { length: 20 }),
		avatar: varchar("avatar", { length: 500 }),
		role: varchar("role", { length: 20 }).notNull().default("user"), // 'admin', 'user'
		status: varchar("status", { length: 20 }).notNull().default("active"), // 'active', 'disabled', 'locked'
		department: varchar("department", { length: 100 }),
		description: text("description"),
		lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
		lastLoginIp: varchar("last_login_ip", { length: 50 }),
		loginCount: integer("login_count").default(0),
		failedLoginCount: integer("failed_login_count").default(0),
		lockedUntil: timestamp("locked_until", { withTimezone: true }),
		passwordChangedAt: timestamp("password_changed_at", { withTimezone: true }),
		mustChangePassword: boolean("must_change_password").default(false),
		createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
		createdBy: varchar("created_by", { length: 36 }),
	},
	(table) => [
		index("users_username_idx").on(table.username),
		index("users_email_idx").on(table.email),
		index("users_role_idx").on(table.role),
		index("users_status_idx").on(table.status),
	]
);

// ============================================
// 19. 裁判模型配置表
// ============================================
export const policyJudgeConfigs = pgTable(
	"policy_judge_configs",
	{
		id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
		policyId: varchar("policy_id", { length: 36 }).notNull().references(() => policyProfiles.id, { onDelete: "cascade" }),

		// 基础配置
		enabled: boolean("enabled").default(false).notNull(),
		providerId: varchar("provider_id", { length: 36 }).references(() => llmProviders.id),
		mode: varchar("mode", { length: 20 }).default("conservative").notNull(), // conservative, balanced, review_only
		triggerMode: varchar("trigger_mode", { length: 20 }).default("risk_or_semantic").notNull(), // risk_only, risk_or_semantic, always

		// 触发条件
		triggerThreshold: integer("trigger_threshold").default(40).notNull(), // 规则分数达到此值触发
		judgeThreshold: integer("judge_threshold").default(70).notNull(), // 裁判判断阈值
		weight: decimal("weight", { precision: 3, scale: 2 }).default("0.50").notNull(), // 平衡模式权重

		// 适用范围
		applyToInput: boolean("apply_to_input").default(true).notNull(),
		applyToOutput: boolean("apply_to_output").default(true).notNull(),
		enabledDimensions: jsonb("enabled_dimensions").$type<string[]>().default([]), // 适用的维度code列表
		semanticDimensions: jsonb("semantic_dimensions").$type<string[]>().default([]), // 需要语义增强的维度

		// 超时与失败处理
		timeoutMs: integer("timeout_ms").default(8000).notNull(),
		fallbackAction: varchar("fallback_action", { length: 20 }).default("rule").notNull(), // rule, allow, block
		failClosedForHighRisk: boolean("fail_closed_for_high_risk").default(true).notNull(),

		// 数据保护
		maxTextLength: integer("max_text_length").default(6000).notNull(),
		maskPiiBeforeJudge: boolean("mask_pii_before_judge").default(true).notNull(),
		blockExternalForSecrets: boolean("block_external_for_secrets").default(true).notNull(),

		createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
	},
	(table) => [
		index("policy_judge_configs_policy_id_idx").on(table.policyId),
		index("policy_judge_configs_enabled_idx").on(table.enabled),
	]
);

// ============================================
// 20. 裁判模型调用记录表
// ============================================
export const judgeModelInvocations = pgTable(
	"judge_model_invocations",
	{
		id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),

		// 关联信息
		sessionId: varchar("session_id", { length: 36 }),
		policyId: varchar("policy_id", { length: 36 }).references(() => policyProfiles.id),
		providerId: varchar("provider_id", { length: 36 }).references(() => llmProviders.id),

		// 输入信息
		direction: varchar("direction", { length: 10 }), // input, output
		modelName: varchar("model_name", { length: 100 }),
		promptVersion: varchar("prompt_version", { length: 20 }),
		inputHash: varchar("input_hash", { length: 64 }),
		textLength: integer("text_length"),

		// 规则检测结果
		ruleScore: integer("rule_score"),
		ruleAction: varchar("rule_action", { length: 20 }),
		ruleFindings: jsonb("rule_findings").$type<Array<{
			dimension: string;
			dimensionName: string;
			score: number;
			action: string;
			reason: string;
		}>>().default([]),

		// 裁判模型结果
		judgeScore: integer("judge_score"),
		judgeConfidence: decimal("judge_confidence", { precision: 3, scale: 2 }),
		judgeAction: varchar("judge_action", { length: 20 }),
		judgeReason: text("judge_reason"),
		judgeDimensions: jsonb("judge_dimensions").$type<Array<{
			dimensionCode: string;
			dimensionName: string;
			hasRisk: boolean;
			score: number;
			confidence: number;
			reason: string;
		}>>().default([]),

		// 规则复核
		ruleReview: jsonb("rule_review").$type<{
			agreeWithRules: boolean;
			falsePositiveSuspected: boolean;
			falseNegativeSuspected: boolean;
			explanation: string;
		}>(),

		// 原始响应与解析
		rawResponse: jsonb("raw_response"),
		parseError: text("parse_error"),
		errorMessage: text("error_message"),

		// 性能指标
		latencyMs: integer("latency_ms"),
		promptTokens: integer("prompt_tokens"),
		completionTokens: integer("completion_tokens"),
		totalTokens: integer("total_tokens"),

		// 决策影响
		usedInDecision: boolean("used_in_decision").default(false).notNull(),
		decisionMode: varchar("decision_mode", { length: 20 }),
		finalScore: integer("final_score"),
		finalAction: varchar("final_action", { length: 20 }),

		createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
	},
	(table) => [
		index("judge_model_invocations_session_id_idx").on(table.sessionId),
		index("judge_model_invocations_policy_id_idx").on(table.policyId),
		index("judge_model_invocations_created_at_idx").on(table.createdAt),
	]
);


// ============================================
// 21. 评估结果表
// ============================================
export const evaluationResults = pgTable(
	"evaluation_results",
	{
		id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
		runId: varchar("run_id", { length: 36 }).notNull().references(() => evaluationRuns.id, { onDelete: "cascade" }),
		testCaseId: varchar("test_case_id", { length: 36 }).notNull().references(() => testCases.id, { onDelete: "cascade" }),
		expectedAction: varchar("expected_action", { length: 20 }),
		actualAction: varchar("actual_action", { length: 20 }),
		actualScore: integer("actual_score"),
		isCorrect: boolean("is_correct").notNull(),
		findings: jsonb("findings").$type<Array<{
			dimension: string;
			dimensionName: string;
			score: number;
			action: string;
			reason: string;
		}>>().default([]),
		createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
	},
	(table) => [
		index("evaluation_results_run_id_idx").on(table.runId),
		index("evaluation_results_test_case_id_idx").on(table.testCaseId),
	]
);

// ============================================
// 22. 用户策略状态表（策略升级功能）
// ============================================
export const userPolicyStates = pgTable(
	"user_policy_states",
	{
		id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
		userId: varchar("user_id", { length: 100 }).notNull(),
		sessionId: varchar("session_id", { length: 100 }).notNull(), // 浏览器会话ID
		originalPolicyId: varchar("original_policy_id", { length: 36 }).notNull().references(() => policyProfiles.id), // 原始策略
		currentPolicyId: varchar("current_policy_id", { length: 36 }).notNull().references(() => policyProfiles.id), // 当前生效策略
		consecutiveWarningCount: integer("consecutive_warning_count").default(0).notNull(), // 连续警告计数
		consecutiveAllowCount: integer("consecutive_allow_count").default(0).notNull(), // 连续放行计数（用于降级）
		isEscalated: boolean("is_escalated").default(false).notNull(), // 是否已升级
		escalatedAt: timestamp("escalated_at", { withTimezone: true }), // 升级时间
		lastDetectionAction: varchar("last_detection_action", { length: 20 }), // 最近一次检测动作
		createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
	},
	(table) => [
		index("user_policy_states_user_id_idx").on(table.userId),
		index("user_policy_states_session_id_idx").on(table.sessionId),
		index("user_policy_states_current_policy_id_idx").on(table.currentPolicyId),
	]
);
