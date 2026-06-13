/**
 * 数据库访问适配器
 * 提供类似 Supabase 风格的 API，内部使用 Drizzle ORM
 */

import { db } from '@/storage/database/shared/db';
import {
  detectionDimensions,
  detectionRules,
  ruleGroups,
  detectionSessions,
  detectionRecords,
  riskFindings,
  policyProfiles,
  policyRules,
  whitelistRules,
  whitelistRulePolicies,
  llmProviders,
  policyDimensionConfig,
  agentTraces,
  testCases,
  evaluationRuns,
  evaluationResults,
  keywordCategories,
  keywordRules,
  policyVersions,
  documentScanTasks,
  documentScanFindings,
  users,
  policyJudgeConfigs,
  judgeModelInvocations,
  userPolicyStates,
} from '@/storage/database/shared/schema';
import { eq, and, or, desc, asc, sql, inArray, isNotNull, isNull, lt, gt, gte, lte, like, ilike, not, ne } from 'drizzle-orm';

// 表名到 schema 的映射
const tableMap: Record<string, any> = {
  'detection_dimensions': detectionDimensions,
  'detection_rules': detectionRules,
  'rule_groups': ruleGroups,
  'detection_sessions': detectionSessions,
  'detection_records': detectionRecords,
  'risk_findings': riskFindings,
  'policy_profiles': policyProfiles,
  'policy_rules': policyRules,
  'whitelist_rules': whitelistRules,
  'whitelist_rule_policies': whitelistRulePolicies,
  'llm_providers': llmProviders,
  'policy_dimension_config': policyDimensionConfig,
  'agent_traces': agentTraces,
  'test_cases': testCases,
  'evaluation_runs': evaluationRuns,
  'evaluation_results': evaluationResults,
  'keyword_categories': keywordCategories,
  'keyword_rules': keywordRules,
  'policy_versions': policyVersions,
  'document_scan_tasks': documentScanTasks,
  'document_scan_findings': documentScanFindings,
  'users': users,
  'policy_judge_configs': policyJudgeConfigs,
  'judge_model_invocations': judgeModelInvocations,
  'user_policy_states': userPolicyStates,
};

// snake_case 转 camelCase
function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

// camelCase 转 snake_case
function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

// 获取 schema 字段（支持 snake_case 和 camelCase 输入）
function getSchemaField(schema: any, columnName: string): any {
  // 直接尝试 camelCase（Drizzle schema 属性名）
  if (schema[columnName]) {
    return schema[columnName];
  }
  // 转换 snake_case 到 camelCase
  const camelName = snakeToCamel(columnName);
  if (schema[camelName]) {
    return schema[camelName];
  }
  return null;
}

// 查询构建器类
class QueryBuilder {
  private tableName: string;
  private schema: any;
  private conditions: any[] = [];
  private orderByClause: { column: string; direction: 'asc' | 'desc' }[] = [];
  private limitValue: number | null = null;
  private offsetValue: number | null = null;
  private selectFields: string[] = ['*'];
  private countMode: 'exact' | 'estimated' | null = null;
  private headOnly: boolean = false;
  private singleResult: boolean = false;
  private operationType: 'select' | 'insert' | 'update' | 'delete' = 'select';
  private insertData: any = null;
  private updateData: any = null;

  constructor(tableName: string) {
    this.tableName = tableName;
    this.schema = tableMap[tableName];
    if (!this.schema) {
      throw new Error(`Unknown table: ${tableName}`);
    }
  }

  select(fields: string | string[], options?: { count?: 'exact' | 'estimated'; head?: boolean }) {
    if (typeof fields === 'string') {
      this.selectFields = fields === '*' ? ['*'] : [fields];
    } else {
      this.selectFields = fields;
    }
    if (options?.count) {
      this.countMode = options.count;
    }
    if (options?.head) {
      this.headOnly = true;
    }
    return this;
  }

  eq(column: string, value: any) {
    if (value !== undefined && value !== null) {
      const field = getSchemaField(this.schema, column);
      if (field) {
        this.conditions.push(eq(field, value));
      } else {
        console.warn(`Field "${column}" not found in table "${this.tableName}"`);
      }
    }
    return this;
  }

  neq(column: string, value: any) {
    if (value !== undefined && value !== null) {
      const field = getSchemaField(this.schema, column);
      if (field) {
        this.conditions.push(ne(field, value));
      }
    }
    return this;
  }

  gte(column: string, value: any) {
    if (value !== undefined && value !== null) {
      const field = getSchemaField(this.schema, column);
      if (field) {
        this.conditions.push(gte(field, value));
      } else {
        console.warn(`Field "${column}" not found in table "${this.tableName}"`);
      }
    }
    return this;
  }

  lte(column: string, value: any) {
    if (value !== undefined && value !== null) {
      const field = getSchemaField(this.schema, column);
      if (field) {
        this.conditions.push(lte(field, value));
      }
    }
    return this;
  }

  gt(column: string, value: any) {
    if (value !== undefined && value !== null) {
      const field = getSchemaField(this.schema, column);
      if (field) {
        this.conditions.push(gt(field, value));
      }
    }
    return this;
  }

  lt(column: string, value: any) {
    if (value !== undefined && value !== null) {
      const field = getSchemaField(this.schema, column);
      if (field) {
        this.conditions.push(lt(field, value));
      }
    }
    return this;
  }

  like(column: string, pattern: string) {
    if (pattern) {
      const field = getSchemaField(this.schema, column);
      if (field) {
        this.conditions.push(like(field, pattern));
      }
    }
    return this;
  }

  ilike(column: string, pattern: string) {
    if (pattern) {
      const field = getSchemaField(this.schema, column);
      if (field) {
        this.conditions.push(ilike(field, pattern));
      }
    }
    return this;
  }

  in(column: string, values: any[]) {
    if (values && values.length > 0) {
      const field = getSchemaField(this.schema, column);
      if (field) {
        this.conditions.push(inArray(field, values));
      }
    }
    return this;
  }

  isNull(column: string) {
    const field = getSchemaField(this.schema, column);
    if (field) {
      this.conditions.push(isNull(field));
    }
    return this;
  }

  isNotNull(column: string) {
    const field = getSchemaField(this.schema, column);
    if (field) {
      this.conditions.push(isNotNull(field));
    }
    return this;
  }

  order(column: string, options?: { ascending?: boolean }) {
    const orderFn = options?.ascending ? asc : desc;
    this.orderByClause.push({
      column,
      direction: options?.ascending ? 'asc' : 'desc',
    });
    return this;
  }

  limit(count: number) {
    this.limitValue = count;
    return this;
  }

  offset(count: number) {
    this.offsetValue = count;
    return this;
  }

  range(start: number, end: number) {
    this.offsetValue = start;
    this.limitValue = end - start + 1;
    return this;
  }

  single() {
    this.singleResult = true;
    this.limitValue = 1;
    return this.execute();
  }

  maybeSingle() {
    this.singleResult = true;
    this.limitValue = 1;
    return this.execute();
  }

  async execute() {
    try {
      // 构建查询
      let query: any = null;

      // 过滤掉无效的条件（undefined 或 null）
      const validConditions = this.conditions.filter(c => c !== undefined && c !== null);

      if (this.headOnly) {
        // 只获取计数，不返回数据
        const result = await db
          .select({ count: sql<number>`count(*)` })
          .from(this.schema)
          .where(validConditions.length > 0 ? and(...validConditions) : undefined);

        return {
          data: null,
          error: null,
          count: result[0]?.count || 0,
        };
      }

      // 正常查询
      query = db.select().from(this.schema);

      if (validConditions.length > 0) {
        query = query.where(and(...validConditions));
      }

      if (this.orderByClause.length > 0) {
        const orderClauses = this.orderByClause.map(o => {
          const orderFn = o.direction === 'asc' ? asc : desc;
          const field = getSchemaField(this.schema, o.column);
          if (!field) {
            console.warn(`Order field "${o.column}" not found in table "${this.tableName}"`);
            return null;
          }
          return orderFn(field);
        }).filter(Boolean);
        if (orderClauses.length > 0) {
          query = query.orderBy(...orderClauses);
        }
      }

      if (this.limitValue) {
        query = query.limit(this.limitValue);
      }

      if (this.offsetValue) {
        query = query.offset(this.offsetValue);
      }

      const data = await query;

      // 如果请求了 count，额外查询总数
      if (this.countMode) {
        const countResult = await db
          .select({ count: sql<number>`count(*)` })
          .from(this.schema)
          .where(validConditions.length > 0 ? and(...validConditions) : undefined);

        return {
          data,
          error: null,
          count: countResult[0]?.count || 0,
        };
      }

      if (this.singleResult && data.length > 0) {
        return {
          data: data[0],
          error: null,
        };
      }

      return {
        data,
        error: null,
        count: data.length,
      };
    } catch (error: any) {
      console.error(`Database query error for table ${this.tableName}:`, error);
      return {
        data: null,
        error: error.message || 'Unknown error',
        count: 0,
      };
    }
  }

  // 插入 - 返回 this 支持链式调用
  insert(data: any | any[]) {
    this.operationType = 'insert';
    this.insertData = Array.isArray(data) ? data : [data];
    return this;
  }

  // 实际执行插入
  async executeInsert() {
    try {
      if (!this.insertData || this.insertData.length === 0) {
        throw new Error('No data provided for insert');
      }
      // 转换 snake_case 字段名到 camelCase（匹配 Drizzle schema）
      const convertedData = this.insertData.map((item: Record<string, unknown>) => {
        const converted: Record<string, any> = {};
        for (const [key, value] of Object.entries(item)) {
          const camelKey = snakeToCamel(key);
          // 如果是 ISO 字符串格式的日期，转换为 Date 对象
          if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
            converted[camelKey] = new Date(value);
          } else {
            converted[camelKey] = value;
          }
        }
        return converted;
      });
      const result = await db.insert(this.schema).values(convertedData).returning();
      return {
        data: result,
        error: null,
      };
    } catch (error: any) {
      console.error(`Database insert error for table ${this.tableName}:`, error);
      return {
        data: null,
        error: error.message || 'Unknown error',
      };
    }
  }

  // 更新 - 返回 this 支持链式调用
  update(data: any) {
    this.operationType = 'update';
    this.updateData = data;
    return this;
  }

  // 实际执行更新
  async executeUpdate() {
    try {
      if (this.conditions.length === 0) {
        throw new Error('Update requires at least one condition');
      }
      // 转换 snake_case 字段名到 camelCase
      const convertedData: Record<string, any> = {};
      for (const [key, value] of Object.entries(this.updateData)) {
        const camelKey = snakeToCamel(key);
        // 如果是 ISO 字符串格式的日期，转换为 Date 对象
        if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
          convertedData[camelKey] = new Date(value);
        } else {
          convertedData[camelKey] = value;
        }
      }
      const result = await db
        .update(this.schema)
        .set(convertedData)
        .where(and(...this.conditions))
        .returning();
      return {
        data: result,
        error: null,
      };
    } catch (error: any) {
      console.error(`Database update error for table ${this.tableName}:`, error);
      return {
        data: null,
        error: error.message || 'Unknown error',
      };
    }
  }

  // 返回 this 以支持链式调用
  delete() {
    this.operationType = 'delete';
    return this;
  }

  // 实际执行删除
  async executeDelete() {
    try {
      if (this.conditions.length === 0) {
        throw new Error('Delete requires at least one condition');
      }
      const result = await db
        .delete(this.schema)
        .where(and(...this.conditions))
        .returning();
      return {
        data: result,
        error: null,
      };
    } catch (error: any) {
      console.error(`Database delete error for table ${this.tableName}:`, error);
      return {
        data: null,
        error: error.message || 'Unknown error',
      };
    }
  }

  // 使 thenable 以支持 await
  then(resolve: (value: any) => any, reject: (reason: any) => any) {
    if (this.operationType === 'delete') {
      return this.executeDelete().then(resolve, reject);
    }
    if (this.operationType === 'insert') {
      return this.executeInsert().then(resolve, reject);
    }
    if (this.operationType === 'update') {
      return this.executeUpdate().then(resolve, reject);
    }
    return this.execute().then(resolve, reject);
  }
}

// 数据库客户端
class DatabaseClient {
  from(tableName: string) {
    return new QueryBuilder(tableName);
  }
}

// 导出单例
const dbClient = new DatabaseClient();

export function getDb() {
  return dbClient;
}

// 导出辅助函数供直接使用
export function query<T = any>(table: string, options?: { 
  filter?: Record<string, any>; 
  single?: boolean;
  order?: { column: string; ascending?: boolean };
  limit?: number;
  offset?: number;
}) {
  const builder = new QueryBuilder(table);
  if (options?.filter) {
    Object.entries(options.filter).forEach(([key, value]) => {
      builder.eq(key, value);
    });
  }
  if (options?.order) {
    builder.order(options.order.column, { ascending: options.order.ascending });
  }
  if (options?.limit) {
    builder.limit(options.limit);
  }
  if (options?.offset) {
    builder.offset(options.offset);
  }
  if (options?.single) {
    return builder.single() as Promise<{ data: T | null; error: any; count?: number }>;
  }
  return builder.execute() as Promise<{ data: T[] | null; error: any; count?: number }>;
}

export async function update(table: string, id: string, data: any) {
  const builder = new QueryBuilder(table);
  builder.eq('id', id);
  return builder.update(data);
}

export async function remove(table: string, id: string) {
  const builder = new QueryBuilder(table);
  builder.eq('id', id);
  return builder.delete();
}

export async function insert(table: string, data: any) {
  const builder = new QueryBuilder(table);
  return builder.insert(data);
}

// 导出 Drizzle 实例供需要直接使用的场景（复杂查询）
export { db, eq, and, or, desc, asc, sql, inArray, lt, gt, gte, lte, like, ilike, isNull, isNotNull, not, ne };

// 导出 schema 供直接使用
export {
  detectionDimensions,
  detectionRules,
  ruleGroups,
  detectionSessions,
  detectionRecords,
  riskFindings,
  policyProfiles,
  policyRules,
  whitelistRules,
  whitelistRulePolicies,
  llmProviders,
  policyDimensionConfig,
  agentTraces,
  testCases,
  evaluationRuns,
  keywordCategories,
  keywordRules,
  policyVersions,
  documentScanTasks,
  documentScanFindings,
  users,
  userPolicyStates,
} from '@/storage/database/shared/schema';
