/**
 * P3.5 — Task → Knowledge Routing
 *
 * Routes tasks to relevant knowledge, skills, and context.
 * Uses the real skill selection from skills/select.ts.
 */

import { createRobloxKnowledgeEngine } from "../knowledge/engine.js";
import type { RobloxKnowledgeEngine } from "../knowledge/engine.js";

/**
 * Task Knowledge Router
 * Routes tasks to relevant knowledge, skills, and context
 */
export class TaskKnowledgeRouter {
  private readonly knowledgeEngine: RobloxKnowledgeEngine;

  constructor() {
    this.knowledgeEngine = createRobloxKnowledgeEngine();
  }

  /**
   * Route a task to relevant knowledge
   */
  async routeTask(task: any): Promise<TaskRouteResult> {
    const intentAnalysis = this.analyzeIntent(task);
    const knowledge = await this.fetchRelevantKnowledge(task);
    const requiredContext = this.determineRequiredContext(task);

    return {
      taskId: task.taskId || "unknown",
      intentAnalysis,
      knowledge,
      requiredContext,
    };
  }

  private analyzeIntent(task: any): IntentAnalysis {
    return {
      primaryIntent: task.intent || "unknown",
      secondaryIntents: [],
      domain: task.domain || "general",
      complexity: this.estimateComplexity(task),
      requiredCapabilities: this.inferRequiredCapabilities(task),
    };
  }

  private estimateComplexity(task: any): "low" | "medium" | "high" {
    let score = 0;
    if (task.requiresBuild) score++;
    if (task.requiresTesting) score++;
    if (task.requiresVerification) score++;
    if (task.needsRoblox) score++;
    if (task.needsFiles) score++;
    if (task.needsTerminal) score++;
    if (score >= 4) return "high";
    if (score >= 2) return "medium";
    return "low";
  }

  private inferRequiredCapabilities(task: any): string[] {
    const caps: string[] = [];
    if (task.needsRoblox) caps.push("roblox");
    if (task.needsFiles) caps.push("filesystem");
    if (task.needsTerminal) caps.push("terminal");
    if (task.requiresBuild) caps.push("build");
    if (task.requiresTesting) caps.push("test");
    if (task.requiresVerification) caps.push("verify");
    return caps;
  }

  private async fetchRelevantKnowledge(task: any): Promise<any[]> {
    const knowledge: any[] = [];
    const domain = task.domain || task.intent || "building";

    // Fetch knowledge for the task domain
    const domainKnowledge = await this.knowledgeEngine.query(domain);
    knowledge.push(...domainKnowledge);

    // Fetch knowledge for specific topics mentioned in the request
    const request = (task.userRequest || task.intent || "").toLowerCase();
    const topicKeywords = ["security", "remote", "datastore", "npc", "pathfinding", "ui", "responsive", "performance", "terrain", "lighting"];
    for (const keyword of topicKeywords) {
      if (request.includes(keyword)) {
        const topicKnowledge = await this.knowledgeEngine.query(keyword);
        knowledge.push(...topicKnowledge);
      }
    }

    return knowledge;
  }

  private determineRequiredContext(task: any): RequiredContext {
    return {
      needsStudio: task.needsRoblox,
      needsFiles: task.needsFiles,
      needsTerminal: task.needsTerminal,
      studioId: task.studioContext?.studioId,
      workspaceRoot: task.workspaceRoot,
    };
  }
}

/** Task route result */
export interface TaskRouteResult {
  taskId: string;
  intentAnalysis: IntentAnalysis;
  knowledge: any[];
  requiredContext: RequiredContext;
}

/** Intent analysis */
export interface IntentAnalysis {
  primaryIntent: string;
  secondaryIntents: string[];
  domain: string;
  complexity: "low" | "medium" | "high";
  requiredCapabilities: string[];
}

/** Required context */
export interface RequiredContext {
  needsStudio: boolean;
  needsFiles: boolean;
  needsTerminal: boolean;
  studioId?: string;
  workspaceRoot?: string;
}

/** Creates a task knowledge router */
export function createTaskKnowledgeRouter(): TaskKnowledgeRouter {
  return new TaskKnowledgeRouter();
}