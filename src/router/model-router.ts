import { z } from "zod";

import type { AIProvider } from "../providers/provider.js";

export const ModelCapabilitySchema = z.enum([
  "chat",
  "planning",
  "coding",
  "debugging",
  "analysis",
]);

export type ModelCapability = z.infer<typeof ModelCapabilitySchema>;

const ModelConfigSchema = z.object({
  provider: z.string().min(1),
  model: z.string().min(1),
  capabilities: z.array(ModelCapabilitySchema),
});

export const ModelsConfigSchema = z.object({
  models: z.array(ModelConfigSchema),
});

export type ModelConfig = z.infer<typeof ModelConfigSchema>;

export class ModelRouter {
  private readonly providers = new Map<string, AIProvider>();
  private readonly models: ModelConfig[];

  constructor(models: unknown) {
    const parsed = ModelsConfigSchema.parse({ models });

    this.models = parsed.models;
  }

  registerProvider(provider: AIProvider): void {
    this.providers.set(provider.name, provider);
  }

  getModel(capability: ModelCapability): {
    provider: AIProvider;
    model: string;
  } {
    const config = this.models.find((entry) =>
      entry.capabilities.includes(capability),
    );

    if (!config) {
      throw new Error(
        `No model configured for capability: ${capability}`,
      );
    }

    const provider = this.providers.get(config.provider);

    if (!provider) {
      throw new Error(
        `Provider "${config.provider}" is not registered`,
      );
    }

    return {
      provider,
      model: config.model,
    };
  }
}