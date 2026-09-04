/**
 * P3.5 — Responsive UI Intelligence Engine
 *
 * Analyzes UI for responsiveness across different screen sizes and devices.
 * All scores derived from actual UI element properties.
 */

import type { ProjectMap } from "../project-map/types.js";

/**
 * Responsive UI Intelligence Engine
 * Analyzes UI for responsiveness across different screen sizes and devices
 */
export class ResponsiveUIEngine {
  async analyzeResponsiveness(projectMap: any): Promise<any> {
    const screenGuis = projectMap.uiHierarchy?.screenGuis || [];
    const elements = this.collectAllElements(screenGuis);

    const breakpoints = this.analyzeBreakpoints(elements);
    const layouts = this.analyzeLayouts(elements);
    const scaling = this.analyzeScaling(elements);
    const touchTargets = this.analyzeTouchTargets(elements);
    const safeAreas = this.analyzeSafeAreas(elements);

    const score = this.calculateResponsiveScore(breakpoints, layouts, scaling, touchTargets, safeAreas);
    const issues = [...breakpoints.issues, ...layouts.issues, ...scaling.issues, ...touchTargets.issues, ...safeAreas.issues];

    return {
      score,
      breakpoints,
      layouts,
      scaling,
      touchTargets,
      safeAreas,
      issues,
      recommendations: this.generateRecommendations(issues),
    };
  }

  private collectAllElements(screenGuis: any[]): any[] {
    const elements: any[] = [];
    for (const gui of screenGuis) {
      this.collectElements(gui.root || gui, elements);
    }
    return elements;
  }

  private collectElements(element: any, collection: any[]): void {
    if (!element) return;
    collection.push(element);
    for (const child of element.children || []) {
      this.collectElements(child, collection);
    }
  }

  private analyzeBreakpoints(elements: any[]): any {
    const issues: any[] = [];
    let absoluteCount = 0;
    let scaleCount = 0;

    for (const el of elements) {
      const pos = el.properties?.Position;
      const size = el.properties?.Size;
      if (pos?.X && typeof pos.X.Offset === "number" && Math.abs(pos.X.Offset) > 100) absoluteCount++;
      if (size?.X && typeof size.X.Scale === "number" && size.X.Scale > 0.3) scaleCount++;
    }

    if (absoluteCount > elements.length * 0.3 && elements.length > 5) {
      issues.push({ severity: "warning", description: `${absoluteCount}/${elements.length} elements use large absolute positioning` });
    }

    const mobileCompatible = scaleCount > absoluteCount || elements.length < 3;

    return { mobileCompatible, absoluteCount, scaleCount, issues };
  }

  private analyzeLayouts(elements: any[]): any {
    const issues: any[] = [];
    let hasUIListLayout = false;
    let hasUIGridLayout = false;

    for (const el of elements) {
      if (el.className === "UIListLayout") hasUIListLayout = true;
      if (el.className === "UIGridLayout") hasUIGridLayout = true;
    }

    if (!hasUIListLayout && !hasUIGridLayout && elements.length > 10) {
      issues.push({ severity: "info", description: "No UIListLayout or UIGridLayout found — consider using layout constraints" });
    }

    return { hasUIListLayout, hasUIGridLayout, issues };
  }

  private analyzeScaling(elements: any[]): any {
    const issues: any[] = [];
    let hasUIScale = false;
    let hasUIAspectRatio = false;

    for (const el of elements) {
      if (el.className === "UIScale") hasUIScale = true;
      if (el.className === "UIAspectRatioConstraint") hasUIAspectRatio = true;
    }

    if (!hasUIScale && elements.length > 5) {
      issues.push({ severity: "warning", description: "No UIScale found — UI may not scale properly across devices" });
    }

    return { hasUIScale, hasUIAspectRatio, issues };
  }

  private analyzeTouchTargets(elements: any[]): any {
    const issues: any[] = [];
    const MIN_TOUCH_SIZE = 44; // Roblox studs minimum for touch

    for (const el of elements) {
      if (el.className === "TextButton" || el.className === "ImageButton") {
        const size = el.properties?.Size;
        if (size) {
          const xScale = size.X?.Scale || 0;
          const yScale = size.Y?.Scale || 0;
          // Assume viewport ~100 studs wide for scale estimation
          const estimatedSize = Math.max(xScale * 100, yScale * 100);
          if (estimatedSize < MIN_TOUCH_SIZE && estimatedSize > 0) {
            issues.push({ severity: "warning", description: `Button "${el.name}" may be too small for touch (${estimatedSize.toFixed(0)} < ${MIN_TOUCH_SIZE})` });
          }
        }
      }
    }

    return { issues, violations: issues.length };
  }

  private analyzeSafeAreas(elements: any[]): any {
    const issues: any[] = [];
    // Check if any UI elements extend beyond typical safe areas
    for (const el of elements) {
      const pos = el.properties?.Position;
      if (pos?.X && typeof pos.X.Offset === "number" && pos.X.Offset < -50) {
        issues.push({ severity: "info", description: `Element "${el.name}" may be outside safe area (negative X offset)` });
      }
    }
    return { issues };
  }

  private calculateResponsiveScore(breakpoints: any, layouts: any, scaling: any, touchTargets: any, safeAreas: any): number {
    let score = 80;
    if (breakpoints.mobileCompatible) score += 10;
    if (scaling.hasUIScale) score += 5;
    if (layouts.hasUIListLayout || layouts.hasUIGridLayout) score += 5;
    score -= touchTargets.violations * 3;
    score -= safeAreas.issues.length * 2;
    return Math.max(0, Math.min(100, score));
  }

  private generateRecommendations(issues: any[]): any[] {
    return issues.map(i => ({ priority: i.severity, description: i.description, category: "responsive" }));
  }
}

export function createResponsiveUIEngine(): ResponsiveUIEngine {
  return new ResponsiveUIEngine();
}