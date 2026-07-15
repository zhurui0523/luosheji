import { ModelProviderDefinition, UserModelConnection, CapabilityKind } from "../types";
import { imageAgent } from "../../../components/agents/imageAgent";
import { videoAgent } from "../../../components/agents/videoAgent";
import { directorAgent } from "../../../components/agents/directorAgent";

export function normalizeUserModelConnection(input: any): UserModelConnection {
  const id = input.id || input.providerId || "";
  const name = input.name || input.title || input.displayName || "";
  const provider = input.provider || "Custom";
  
  // protocol compatibility
  const protocol = input.protocol || input.protocolType || "custom";
  const endpoint = input.endpoint || "";
  const path = input.path || "";
  const model = input.model || "";
  const apiKey = input.apiKey || "";
  const apiKeyRef = input.apiKeyRef || "";
  
  // modelType compatibility
  let capabilityKinds: any[] = [];
  if (input.capabilityKinds && Array.isArray(input.capabilityKinds)) {
    capabilityKinds = [...input.capabilityKinds];
  } else if (input.modelType) {
    if (input.modelType === "text") capabilityKinds = ["text"];
    else if (input.modelType === "image") capabilityKinds = ["image"];
    else if (input.modelType === "video") capabilityKinds = ["video"];
    else if (input.modelType === "vision") capabilityKinds = ["vision"];
    else capabilityKinds = [input.modelType];
  } else {
    // Default fallback based on id/name
    const lowerId = id.toLowerCase();
    if (lowerId.includes("image") || lowerId.includes("gptimage") || lowerId.includes("sd") || lowerId.includes("dall")) {
      capabilityKinds = ["image"];
    } else if (lowerId.includes("video") || lowerId.includes("seedance") || lowerId.includes("veo")) {
      capabilityKinds = ["video"];
    } else {
      capabilityKinds = ["text"];
    }
  }

  const enabled = input.enabled !== undefined ? !!input.enabled : true;
  const isCustom = input.isCustom !== undefined ? !!input.isCustom : true;
  const state = input.state || (enabled ? "enabled" : "disabled");

  return {
    id,
    name,
    provider,
    protocol,
    endpoint,
    path,
    model,
    apiKey,
    apiKeyRef,
    capabilityKinds,
    enabled,
    state,
    isCustom,
    displayName: input.displayName || name,
    headers: input.headers,
    requestMapping: input.requestMapping,
    responseMapping: input.responseMapping,
    createdAt: input.createdAt || Date.now(),
    updatedAt: input.updatedAt || Date.now(),
    lastTestedAt: input.lastTestedAt,
    lastError: input.lastError
  };
}

export function validateUserModelConnection(input: any): { ok: boolean; errors: string[]; connection?: UserModelConnection } {
  const errors: string[] = [];
  if (!input) {
    return { ok: false, errors: ["Input configuration is missing."] };
  }

  const id = input.id || input.providerId;
  if (!id || typeof id !== "string") {
    errors.push("Model ID ('id') is required and must be a string.");
  } else if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
    errors.push("Model ID ('id') must only contain letters, numbers, hyphens, and underscores.");
  }

  const name = input.name || input.title || input.displayName;
  if (!name || typeof name !== "string") {
    errors.push("Model name ('name') is required.");
  }

  const provider = input.provider;
  if (!provider || typeof provider !== "string") {
    errors.push("Model provider ('provider') is required.");
  }

  const protocol = input.protocol || input.protocolType;
  if (!protocol || typeof protocol !== "string") {
    errors.push("Model protocol ('protocol') is required.");
  }

  const endpoint = input.endpoint;
  if (!endpoint || typeof endpoint !== "string") {
    errors.push("Model endpoint ('endpoint') is required.");
  }

  const model = input.model;
  if (!model || typeof model !== "string") {
    errors.push("Model name/identifier ('model') is required.");
  }

  const normalized = normalizeUserModelConnection(input);
  if (normalized.capabilityKinds.length === 0) {
    errors.push("At least one capability kind (e.g. 'text', 'image', 'video') must be selected.");
  }

  return {
    ok: errors.length === 0,
    errors,
    connection: errors.length === 0 ? normalized : undefined
  };
}

export function toModelProviderDefinition(connection: UserModelConnection): ModelProviderDefinition {
  const capKinds = connection.capabilityKinds || [];
  
  return {
    id: connection.id,
    name: connection.name || connection.displayName || connection.id,
    provider: connection.provider,
    protocol: connection.protocol,
    endpoint: connection.endpoint,
    model: connection.model,
    apiKeyRef: connection.apiKeyRef,
    capabilityKinds: capKinds as CapabilityKind[],
    config: {
      headers: connection.headers,
      requestMapping: connection.requestMapping,
      responseMapping: connection.responseMapping,
      path: connection.path,
      apiKey: connection.apiKey
    },
    capabilities: {
      text: capKinds.includes("text"),
      image: capKinds.includes("image"),
      video: capKinds.includes("video"),
      vision: capKinds.includes("vision"),
      embedding: capKinds.includes("embedding"),
      tools: capKinds.includes("tools")
    },
    call: async (method: any, args: any, config?: any) => {
      // Create a unified options structure containing customInterfaces with this model
      const customInterfaces = {
        [connection.id]: {
          provider: connection.provider,
          endpoint: connection.endpoint,
          path: connection.path,
          model: connection.model,
          displayName: connection.displayName || connection.name,
          apiKey: connection.apiKey,
          protocolType: connection.protocol,
          requestMapping: connection.requestMapping,
          responseMapping: connection.responseMapping,
          isCustom: connection.isCustom !== false,
          modelType: capKinds[0] || "text",
          title: connection.name
        }
      };

      const mergedConfig = {
        ...config,
        customInterfaces: {
          ...(config?.customInterfaces || {}),
          ...customInterfaces
        }
      };

      if (capKinds.includes("image")) {
        return imageAgent.callApi("image", method, args, mergedConfig);
      } else if (capKinds.includes("video")) {
        return videoAgent.callApi("video", method, args, mergedConfig);
      } else {
        return directorAgent.callApi("script", method, args, mergedConfig);
      }
    },
    healthCheck: async () => {
      try {
        if (!connection.enabled) return false;
        return true;
      } catch (e) {
        return false;
      }
    }
  };
}
