import { NextResponse } from "next/server";
import { db } from "@/storage/database/shared/db";
import { detectionDimensions, detectionRules } from "@/storage/database/shared/schema";
import { eq, and } from "drizzle-orm";
import { initializeDatabase, initDefaultPolicy } from "@/lib/detection/init-database";

// 确保此路由在 Node.js 运行时执行
export const runtime = 'nodejs';

// 获取所有检测维度
export async function GET() {
  try {
    // 先尝试从数据库获取维度
    let dimensions = await db
      .select({
        id: detectionDimensions.id,
        code: detectionDimensions.code,
        name: detectionDimensions.name,
        description: detectionDimensions.description,
        category: detectionDimensions.category,
        weight: detectionDimensions.weight,
        priority: detectionDimensions.priority,
        enabled: detectionDimensions.enabled,
        isSystem: detectionDimensions.isSystem,
        config: detectionDimensions.config,
        createdAt: detectionDimensions.createdAt,
        updatedAt: detectionDimensions.updatedAt,
      })
      .from(detectionDimensions);

    // 如果数据库为空，初始化默认数据
    if (!dimensions || dimensions.length === 0) {
      console.log("数据库维度为空，开始初始化默认数据...");
      await initializeDatabase();
      
      // 重新获取
      dimensions = await db
        .select({
          id: detectionDimensions.id,
          code: detectionDimensions.code,
          name: detectionDimensions.name,
          description: detectionDimensions.description,
          category: detectionDimensions.category,
          weight: detectionDimensions.weight,
          priority: detectionDimensions.priority,
          enabled: detectionDimensions.enabled,
          isSystem: detectionDimensions.isSystem,
          config: detectionDimensions.config,
          createdAt: detectionDimensions.createdAt,
          updatedAt: detectionDimensions.updatedAt,
        })
        .from(detectionDimensions);
    }

    // 检查是否所有16个系统维度都存在
    const systemDimensionCodes = [
      "prompt_injection", "pii_leak", "malicious_code", "violence_hate", "illegal_content",
      "ad_detection", "spam_detection", "sensitive_compliance", "adult_content", "self_harm",
      "credential_secret_leak", "fraud_scam", "misinformation", "copyright_risk",
      "business_sensitive", "output_leak"
    ];
    
    const existingCodes = dimensions.map(d => d.code);
    const missingCodes = systemDimensionCodes.filter(code => !existingCodes.includes(code));
    
    if (missingCodes.length > 0) {
      console.log(`缺少 ${missingCodes.length} 个系统维度，开始补充...`);
      await initializeDatabase();
      
      // 重新获取
      dimensions = await db
        .select({
          id: detectionDimensions.id,
          code: detectionDimensions.code,
          name: detectionDimensions.name,
          description: detectionDimensions.description,
          category: detectionDimensions.category,
          weight: detectionDimensions.weight,
          priority: detectionDimensions.priority,
          enabled: detectionDimensions.enabled,
          isSystem: detectionDimensions.isSystem,
          config: detectionDimensions.config,
          createdAt: detectionDimensions.createdAt,
          updatedAt: detectionDimensions.updatedAt,
        })
        .from(detectionDimensions);
    }

    // 确保策略配置也已初始化
    await initDefaultPolicy();

    // 获取每个维度的规则数量
    const dimensionsWithCounts = await Promise.all(
      dimensions.map(async (dim) => {
        try {
          const rules = await db
            .select({ id: detectionRules.id })
            .from(detectionRules)
            .where(eq(detectionRules.dimensionId, dim.id));
          
          return {
            ...dim,
            ruleCount: rules.length,
            groupCount: 0,
          };
        } catch {
          return {
            ...dim,
            ruleCount: 0,
            groupCount: 0,
          };
        }
      })
    );

    return NextResponse.json({
      success: true,
      data: dimensionsWithCounts,
    });
  } catch (error) {
    console.error("获取检测维度失败:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: "获取检测维度失败，请检查数据库连接。请确保已运行数据库迁移并初始化数据。" 
      },
      { status: 500 }
    );
  }
}

// 创建新的检测维度
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { code, name, description, category, weight, priority, enabled, config } = body;

    if (!code || !name) {
      return NextResponse.json(
        { success: false, error: "维度代码和名称不能为空" },
        { status: 400 }
      );
    }

    const [newDimension] = await db
      .insert(detectionDimensions)
      .values({
        code,
        name,
        description: description || "",
        category: category || "custom",
        weight: weight || 1.0,
        priority: priority || 100,
        enabled: enabled !== undefined ? enabled : true,
        isSystem: false,
        config: config || {},
      })
      .returning();

    return NextResponse.json({
      success: true,
      data: {
        ...newDimension,
        ruleCount: 0,
        groupCount: 0,
      },
    });
  } catch (error) {
    console.error("创建检测维度失败:", error);
    return NextResponse.json(
      { success: false, error: "创建检测维度失败" },
      { status: 500 }
    );
  }
}
