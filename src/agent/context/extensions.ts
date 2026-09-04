/**
 * P3.5 — Context Extension Points
 *
 * Extension points for future context enrichment without modifying core.
 */

import type { TaskContext } from "../task-context.js";

/** Context extension interface */
export interface ContextExtension {
  /** Unique extension identifier */
  id: string;

  /** Human-readable name */
  name: string;

  /** Description of what this extension provides */
  description: string;

  /** Version */
  version: string;

  /** Dependencies on other extensions */
  dependencies: string[];

  /**
   * Enrich task context with additional data
   * Called during task routing before skill selection
   */
  enrichContext?(task: any, context: any): Promise<ContextEnrichment>;

  /**
   * Modify task routing decision
   * Called after skill selection, before execution
   */
  modifyRouting?(task: any, route: any): Promise<RoutingModification>;

  /**
   * Enhance verification criteria
   * Called during verification planning
   */
  enhanceVerification?(plan: any, context: any): Promise<VerificationEnhancement>;

  /**
   * Provide recovery strategies
   * Called when recovery is needed
   */
  provideRecoveryStrategies?(context: any, error: Error): Promise<any[]>;

  /**
   * Enrich task context with project-specific data
   */
  enrichProjectContext?(projectMap: any): Promise<any>;

  /** Extension metadata */
  metadata: ExtensionMetadata;
}

/** Context enrichment result */
export interface ContextEnrichment {
  /** Additional context data */
  data: Record<string, any>;

  /** Confidence in the enrichment (0-1) */
  confidence: number;

  /** Source of the enrichment */
  source: string;

  /** Expiration timestamp (optional) */
  expiresAt?: number;
}

/** Routing modification */
export interface RoutingModification {
  /** Modified skill selection */
  skillSelection?: any;

  /** Modified tool groups */
  toolGroups?: string[];

  /** Additional constraints */
  constraints?: any[];

  /** Reason for modification */
  reason: string;
}

/** Verification enhancement */
export interface VerificationEnhancement {
  /** Additional verification criteria */
  criteria: string[];

  /** Additional tools for verification */
  tools: string[];

  /** Modified success criteria */
  successCriteria?: string[];
}

/** Extension metadata */
export interface ExtensionMetadata {
  /** Author */
  author: string;

  /** License */
  license: string;

  /** Homepage */
  homepage?: string;

  /** Repository */
  repository?: string;

  /** Keywords */
  keywords: string[];

  /** Minimum MYNO version */
  minVersion: string;

  /** Maximum MYNO version (exclusive) */
  maxVersion?: string;

  /** Supported platforms */
  platforms: string[];

  /** Required permissions */
  permissions: string[];
}

/** Extension registry */
export class ExtensionRegistry {
  private extensions: Map<string, ContextExtension> = new Map();
  private loadOrder: string[] = [];

  /**
   * Register an extension
   */
  register(extension: ContextExtension): void {
    if (this.extensions.has(extension.id)) {
      throw new Error(`Extension ${extension.id} already registered`);
    }

    // Check dependencies
    for (const dep of extension.dependencies) {
      if (!this.extensions.has(dep)) {
        throw new Error(`Extension ${extension.id} depends on ${dep} which is not registered`);
      }
    }

    this.extensions.set(extension.id, extension);
    this.loadOrder.push(extension.id);

    // Sort by dependencies (topological sort would be better)
    this.sortByDependencies();
  }

  /**
   * Unregister an extension
   */
  unregister(id: string): boolean {
    const ext = this.extensions.get(id);
    if (!ext) return false;

    // Check if other extensions depend on this
    for (const other of this.extensions.values()) {
      if (other.dependencies.includes(id)) {
        throw new Error(`Cannot unregister ${id}: required by ${other.id}`);
      }
    }

    this.extensions.delete(id);
    this.loadOrder = this.loadOrder.filter((eid) => eid !== id);
    return true;
  }

  /**
   * Get extension by ID
   */
  get(id: string): ContextExtension | undefined {
    return this.extensions.get(id);
  }

  /**
   * Get all extensions
   */
  getAll(): ContextExtension[] {
    return Array.from(this.extensions.values());
  }

  /**
   * Get extensions in load order
   */
  getLoadOrder(): string[] {
    return [...this.loadOrder];
  }

  /**
   * Apply all context enrichments
   */
  async enrichContext(task: any, context: any): Promise<any> {
    let enrichedContext = { ...context };

    for (const id of this.loadOrder) {
      const ext = this.extensions.get(id);
      if (ext?.enrichContext) {
        const enrichment = await ext.enrichContext(task, enrichedContext);
        if (enrichment) {
          enrichedContext = { ...enrichedContext, ...enrichment.data };
        }
      }
    }

    return enrichedContext;
  }

  /**
   * Apply routing modifications
   */
  async modifyRouting(task: any, route: any): Promise<any> {
    let modifiedRoute = { ...route };

    for (const id of this.loadOrder) {
      const ext = this.extensions.get(id);
      if (ext?.modifyRouting) {
        const modification = await ext.modifyRouting(task, modifiedRoute);
        if (modification) {
          if (modification.skillSelection) modifiedRoute.skillSelection = modification.skillSelection;
          if (modification.toolGroups) modifiedRoute.toolGroups = modification.toolGroups;
          if (modification.constraints) modifiedRoute.constraints = [...(modifiedRoute.constraints || []), ...modification.constraints];
        }
      }
    }

    return modifiedRoute;
  }

  /**
   * Apply verification enhancements
   */
  async enhanceVerification(plan: any, context: any): Promise<any> {
    let enhanced = { ...plan };

    for (const id of this.loadOrder) {
      const ext = this.extensions.get(id);
      if (ext?.enhanceVerification) {
        const enhancement = await ext.enhanceVerification(enhanced, context);
        if (enhancement) {
          if (enhancement.criteria) enhanced.criteria = [...(enhanced.criteria || []), ...enhancement.criteria];
          if (enhancement.tools) enhanced.tools = [...(enhanced.tools || []), ...enhancement.tools];
          if (enhancement.successCriteria) enhanced.successCriteria = [...(enhanced.successCriteria || []), ...enhancement.successCriteria];
        }
      }
    }

    return enhanced;
  }

  /**
   * Get recovery strategies from extensions
   */
  async getRecoveryStrategies(context: any, error: Error): Promise<any[]> {
    const strategies: any[] = [];

    for (const id of this.loadOrder) {
      const ext = this.extensions.get(id);
      if (ext?.provideRecoveryStrategies) {
        const strategies_ = await ext.provideRecoveryStrategies(context, error);
        strategies.push(...strategies_);
      }
    }

    return strategies;
  }

  private sortByDependencies(): void {
    // Simple topological sort
    const visited = new Set<string>();
    const visiting = new Set<string>();
    const result: string[] = [];

    const visit = (id: string) => {
      if (visited.has(id)) return;
      if (visiting.has(id)) throw new Error(`Circular dependency detected involving ${id}`);

      visiting.add(id);
      const ext = this.extensions.get(id);
      if (ext) {
        for (const dep of ext.dependencies) {
          visit(dep);
        }
      }
      visiting.delete(id);
      visited.add(id);
      result.push(id);
    };

    for (const id of this.loadOrder) {
      visit(id);
    }

    this.loadOrder = result;
  }
}

/**
 * Default extension registry instance
 */
export const defaultExtensionRegistry = new ExtensionRegistry();

/**
 * Register a context extension
 */
export function registerExtension(extension: ContextExtension): void {
  defaultExtensionRegistry.register(extension);
}

/**
 * Get context extension by ID
 */
export function getExtension(id: string): ContextExtension | undefined {
  return defaultExtensionRegistry.get(id);
}

/**
 * Enrich context using all registered extensions
 */
export async function enrichContext(task: any, context: any): Promise<any> {
  return defaultExtensionRegistry.enrichContext(task, context);
}

/**
 * Modify routing using all registered extensions
 */
export async function modifyRouting(task: any, route: any): Promise<any> {
  return defaultExtensionRegistry.modifyRouting(task, route);
}

/**
 * Enhance verification using all registered extensions
 */
export async function enhanceVerification(plan: any, context: any): Promise<any> {
  return defaultExtensionRegistry.enhanceVerification(plan, context);
}

/**
 * Get recovery strategies from all registered extensions
 */
export async function getRecoveryStrategies(context: any, error: Error): Promise<any[]> {
  return defaultExtensionRegistry.getRecoveryStrategies(context, error);
}

/**
 * Creates an extension registry
 */
export function createExtensionRegistry(): ExtensionRegistry {
  return new ExtensionRegistry();
}