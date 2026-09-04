/**
 * P3.5 — UI/UX Intelligence Engine
 *
 * Analyzes UI for design quality, usability, accessibility, and design system compliance.
 * All scores derived from actual UI hierarchy data.
 */

import type { ProjectMap, ScreenGuiSnapshot } from "../project-map/types.js";

/**
 * UI/UX Intelligence Engine
 * Analyzes UI for design quality, usability, accessibility, and design system compliance
 */
export class UIUXIntelligenceEngine {
  async analyzeUI(projectMap: any): Promise<any> {
    const screenGuis = projectMap.uiHierarchy?.screenGuis || [];
    const allUIElements = this.collectAllUIElements(screenGuis);

    const components = this.analyzeComponents(allUIElements);
    const designSystem = this.analyzeDesignSystem(allUIElements);
    const accessibility = this.analyzeAccessibility(allUIElements);
    const responsiveness = this.analyzeResponsiveness(allUIElements);
    const interactions = this.analyzeInteractions(allUIElements);

    const qualityScore = this.calculateUIQuality(components, designSystem, accessibility, responsiveness);

    return {
      qualityScore,
      components,
      designSystem,
      accessibility,
      responsiveness,
      interactions,
      recommendations: this.generateUIRecommendations(components, designSystem, accessibility, responsiveness, interactions),
    };
  }

  private collectAllUIElements(screenGuis: any[]): any[] {
    const elements: any[] = [];
    for (const gui of screenGuis) {
      this.collectUIElements(gui.root || gui, elements);
    }
    return elements;
  }

  private collectUIElements(element: any, collection: any[]): void {
    if (!element) return;
    collection.push(element);
    const children = element.children || [];
    for (const child of children) {
      this.collectUIElements(child, collection);
    }
  }

  private analyzeComponents(elements: any[]): any {
    const issues: any[] = [];
    const componentCounts: Record<string, number> = {};

    for (const el of elements) {
      const className = el.className || "Unknown";
      componentCounts[className] = (componentCounts[className] || 0) + 1;

      // Check for TextLabel without TextScaled
      if (className === "TextLabel" && el.properties?.TextScaled === false) {
        issues.push({ severity: "info", description: `TextLabel "${el.name}" may not scale for mobile`, element: el.name });
      }

      // Check for small touch targets
      if (className === "TextButton" || className === "ImageButton") {
        const size = el.properties?.Size;
        if (size && (size.X?.Scale < 0.05 || size.Y?.Scale < 0.05)) {
          issues.push({ severity: "warning", description: `Button "${el.name}" may be too small for mobile touch`, element: el.name });
        }
      }
    }

    const score = Math.max(0, Math.min(100, 80 - issues.filter((i: any) => i.severity === "warning").length * 5));

    return { count: elements.length, componentCounts, issues, score };
  }

  private analyzeDesignSystem(elements: any[]): any {
    const colors = new Set<string>();
    const fonts = new Set<string>();
    const issues: any[] = [];

    for (const el of elements) {
      if (el.properties?.TextColor3) {
        const c = el.properties.TextColor3;
        colors.add(`${Math.round(c.R * 255)},${Math.round(c.G * 255)},${Math.round(c.B * 255)}`);
      }
      if (el.properties?.Font) {
        fonts.add(el.properties.Font);
      }
    }

    if (colors.size > 15) {
      issues.push({ severity: "warning", description: `${colors.size} unique colors — consider a consistent palette` });
    }
    if (fonts.size > 5) {
      issues.push({ severity: "info", description: `${fonts.size} unique fonts — consider font consistency` });
    }

    const score = Math.max(0, Math.min(100,
      85 - (colors.size > 15 ? 15 : 0) - (fonts.size > 5 ? 10 : 0)
    ));

    return { colorPalette: { count: colors.size, consistent: colors.size <= 10 }, typography: { fontCount: fonts.size, consistent: fonts.size <= 3 }, score, issues };
  }

  private analyzeAccessibility(elements: any[]): any {
    const issues: any[] = [];
    let hasText = false;
    let textElementsWithoutContrast = 0;

    for (const el of elements) {
      if (el.className === "TextLabel" || el.className === "TextButton") {
        hasText = true;
        const textColor = el.properties?.TextColor3;
        const bgColor = el.properties?.BackgroundColor3;
        if (textColor && bgColor) {
          const contrast = this.calculateContrast(textColor, bgColor);
          if (contrast < 4.5) {
            textElementsWithoutContrast++;
          }
        }
      }
    }

    if (textElementsWithoutContrast > 0) {
      issues.push({ severity: "warning", description: `${textElementsWithoutContrast} text elements with low contrast ratio (< 4.5)` });
    }

    const score = Math.max(0, Math.min(100,
      80 - (textElementsWithoutContrast > 3 ? 20 : textElementsWithoutContrast * 5)
    ));

    return { score, issues, hasTextElements: hasText };
  }

  private analyzeResponsiveness(elements: any[]): any {
    const issues: any[] = [];
    let usesAbsolutePositioning = 0;
    let usesScalePositioning = 0;

    for (const el of elements) {
      const pos = el.properties?.Position;
      if (pos) {
        if (pos.X && typeof pos.X.Scale === "number" && pos.X.Scale > 0) usesScalePositioning++;
        if (pos.X && typeof pos.X.Offset === "number" && pos.X.Offset > 100) usesAbsolutePositioning++;
      }
    }

    if (usesAbsolutePositioning > 5) {
      issues.push({ severity: "warning", description: `${usesAbsolutePositioning} elements use large absolute offsets — may break on mobile` });
    }

    const score = Math.max(0, Math.min(100,
      80 - (usesAbsolutePositioning > 10 ? 20 : usesAbsolutePositioning > 5 ? 10 : 0)
    ));

    return { score, issues, usesAbsolutePositioning, usesScalePositioning };
  }

  private analyzeInteractions(elements: any[]): any {
    const buttons = elements.filter(el => el.className === "TextButton" || el.className === "ImageButton");
    const issues: any[] = [];

    if (buttons.length === 0) {
      issues.push({ severity: "info", description: "No interactive buttons found in UI" });
    }

    const score = Math.max(0, Math.min(100, buttons.length > 0 ? 80 : 60));

    return { score, buttonCount: buttons.length, issues };
  }

  private calculateUIQuality(components: any, designSystem: any, accessibility: any, responsiveness: any): number {
    const scores = [components.score, designSystem.score, accessibility.score, responsiveness.score].filter(s => typeof s === "number");
    if (scores.length === 0) return 50;
    return Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length);
  }

  private calculateContrast(c1: any, c2: any): number {
    const l1 = 0.2126 * (c1.R || 0) + 0.7152 * (c1.G || 0) + 0.0722 * (c1.B || 0);
    const l2 = 0.2126 * (c2.R || 0) + 0.7152 * (c2.G || 0) + 0.0722 * (c2.B || 0);
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    return (lighter + 0.05) / (darker + 0.05);
  }

  private generateUIRecommendations(components: any, designSystem: any, accessibility: any, responsiveness: any, interactions: any): any[] {
    const recs: any[] = [];
    for (const issue of components.issues || []) {
      recs.push({ priority: issue.severity, description: issue.description, category: "ui-component" });
    }
    for (const issue of accessibility.issues || []) {
      recs.push({ priority: issue.severity, description: issue.description, category: "accessibility" });
    }
    for (const issue of responsiveness.issues || []) {
      recs.push({ priority: issue.severity, description: issue.description, category: "responsive" });
    }
    return recs;
  }
}

export function createUIUXIntelligence(): UIUXIntelligenceEngine {
  return new UIUXIntelligenceEngine();
}