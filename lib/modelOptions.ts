import type { Config, ApiConfig, SmartImageConfig, SmartVideoConfig } from "../types";

export type ModelKind = "text" | "image" | "video";

export interface ModelOption {
  label: string;
  value: string;
  configKey?: string;
  apiConfig?: ApiConfig;
}

type ImageGenerationSettings = NonNullable<ApiConfig["defaultGenerationSettings"]>["image"];
type VideoGenerationSettings = NonNullable<ApiConfig["defaultGenerationSettings"]>["video"];

export const DEFAULT_IMAGE_GENERATION_SETTINGS = {
  aspectRatio: "1:1" as SmartImageConfig["aspectRatio"],
  imageSize: "1K" as SmartImageConfig["imageSize"],
};

export const DEFAULT_VIDEO_GENERATION_SETTINGS = {
  videoMode: "all-around",
  duration: "5",
  aspectRatio: "16:9",
  resolution: "720p",
};

const FALLBACK_IMAGE_MODEL = "gemini-3.1-flash-image-preview";
const FALLBACK_VIDEO_MODEL = "seedance2.0";

function normalizeImageAspectRatio(value?: string): SmartImageConfig["aspectRatio"] {
  const normalized = (value || DEFAULT_IMAGE_GENERATION_SETTINGS.aspectRatio).trim();
  const valid = new Set(["1:1", "3:4", "4:3", "9:16", "16:9", "1:4", "1:8", "4:1", "8:1", "21:9", "26:9", "2:1"]);
  return (valid.has(normalized) ? normalized : DEFAULT_IMAGE_GENERATION_SETTINGS.aspectRatio) as SmartImageConfig["aspectRatio"];
}

function normalizeImageSize(value?: string): SmartImageConfig["imageSize"] {
  const normalized = (value || DEFAULT_IMAGE_GENERATION_SETTINGS.imageSize).trim();
  if (normalized.toLowerCase() === "512px") return "512px";

  const upper = normalized.toUpperCase();
  if (upper === "1K" || upper === "2K" || upper === "4K") {
    return upper as SmartImageConfig["imageSize"];
  }

  return DEFAULT_IMAGE_GENERATION_SETTINGS.imageSize;
}

function normalizeVideoResolution(value?: string) {
  const normalized = (value || DEFAULT_VIDEO_GENERATION_SETTINGS.resolution).trim();
  if (/^\d+p$/i.test(normalized)) return normalized.toLowerCase();
  return DEFAULT_VIDEO_GENERATION_SETTINGS.resolution;
}

export function normalizeImageGenerationSettings(settings?: ImageGenerationSettings) {
  return {
    aspectRatio: normalizeImageAspectRatio(settings?.aspectRatio),
    imageSize: normalizeImageSize(settings?.imageSize),
  };
}

export function normalizeVideoGenerationSettings(settings?: VideoGenerationSettings) {
  return {
    videoMode: settings?.videoMode || DEFAULT_VIDEO_GENERATION_SETTINGS.videoMode,
    duration: settings?.duration || DEFAULT_VIDEO_GENERATION_SETTINGS.duration,
    aspectRatio: settings?.aspectRatio || DEFAULT_VIDEO_GENERATION_SETTINGS.aspectRatio,
    resolution: normalizeVideoResolution(settings?.resolution),
  };
}

const FALLBACK_KIND_BY_KEY: Record<string, ModelKind> = {
  script: "text",
  claudeSonnet: "text",
  gptText: "text",
  image: "image",
  gptImage: "image",
  video: "video",
  videoVeoFast: "video",
  videoSeedance: "video",
  videoSeedanceMini: "video",
  videoOmni: "video",
};

const DEFAULT_LABEL_BY_KEY: Record<string, string> = {
  script: "Gemini 3.5 Flash",
  claudeSonnet: "Claude-sonnet-5",
  gptText: "GPT Text",
  image: "nano banana 2",
  gptImage: "GPT-Image-2",
  video: "Video",
  videoVeoFast: "Veo Fast",
  videoSeedance: "RH-SD2.0",
  videoSeedanceMini: "RH-SD2.0mini",
  videoOmni: "Omni Video",
};

function isApiConfigLike(value: unknown): value is ApiConfig {
  return !!value && typeof value === "object" && typeof (value as any).model === "string";
}

function resolveConfigKind(key: string, section: ApiConfig): ModelKind | null {
  if (section.modelType === "text" || section.modelType === "image" || section.modelType === "video") {
    return section.modelType;
  }

  return FALLBACK_KIND_BY_KEY[key] || null;
}

function dedupeOptions(options: ModelOption[]) {
  const seen = new Set<string>();
  return options.filter((option) => {
    const identity = option.value || option.configKey || option.label;
    if (!identity || seen.has(identity)) return false;
    seen.add(identity);
    return true;
  });
}

export function getConfiguredModelOptions(config: Config | null | undefined, kind: ModelKind): ModelOption[] {
  if (!config) {
    if (kind === "text") {
      return [
        { label: "Gemini 3.5 Flash", value: "gemini-3.5-flash" },
        { label: "Claude-sonnet-5", value: "claude-sonnet-5" },
      ];
    }

    if (kind === "image") {
      return [
        { label: "nano banana 2", value: "gemini-3.1-flash-image-preview" },
        { label: "GPT-Image-2", value: "gpt-image-2" },
      ];
    }

    return [
      { label: "RH-SD2.0", value: "seedance2.0" },
      { label: "RH-SD2.0mini", value: "seedance-mini" },
    ];
  }

  const options: ModelOption[] = [];

  Object.entries(config).forEach(([key, rawSection]) => {
    if (key === "customInterfaces" || !isApiConfigLike(rawSection)) return;

    const sectionKind = resolveConfigKind(key, rawSection);
    if (sectionKind !== kind) return;

    options.push({
      label: rawSection.displayName || (rawSection as any).title || DEFAULT_LABEL_BY_KEY[key] || rawSection.model,
      value: rawSection.model,
      configKey: key,
      apiConfig: rawSection,
    });
  });

  Object.entries(config.customInterfaces || {}).forEach(([key, rawSection]) => {
    if (!isApiConfigLike(rawSection)) return;

    const sectionKind = resolveConfigKind(key, rawSection);
    if (sectionKind !== kind) return;

    options.push({
      label: rawSection.displayName || (rawSection as any).title || rawSection.model,
      value: key,
      configKey: key,
      apiConfig: rawSection,
    });
  });

  return dedupeOptions(options);
}

function customModelMatchesKind(model: any, kind: ModelKind) {
  if (!model) return false;
  if (model.modelType) return model.modelType === kind;
  if (model.type === "all") return true;
  if (model.type) return model.type === kind;
  return kind === "text";
}

export function getModelOptions(config: Config | null | undefined, customModels: any[] | null | undefined, kind: ModelKind): ModelOption[] {
  const configured = getConfiguredModelOptions(config, kind);
  const custom = (customModels || [])
    .filter((model: any) => customModelMatchesKind(model, kind))
    .map((model: any, index: number) => ({
      label: model.name || model.model || model.id || `Custom ${kind} model ${index + 1}`,
      value: model.model || model.id || model.name || `custom-${kind}-${index}`,
      apiConfig: model,
    }));

  return dedupeOptions([...configured, ...custom]);
}

export function resolveApiConfigByModelValue(config: Config | null | undefined, modelValue: string, kind: ModelKind): ApiConfig | null {
  if (!config || !modelValue) return null;

  const option = getConfiguredModelOptions(config, kind).find((item) => {
    return item.value === modelValue || item.configKey === modelValue || item.apiConfig?.model === modelValue;
  });

  return option?.apiConfig || null;
}

export function resolveImageGenerationSettings(config: Config | null | undefined, modelValue?: string) {
  const apiConfig =
    modelValue
      ? resolveApiConfigByModelValue(config, modelValue, "image")
      : config?.image;

  return normalizeImageGenerationSettings(apiConfig?.defaultGenerationSettings?.image);
}

export function resolveVideoGenerationSettings(config: Config | null | undefined, modelValue?: string) {
  const apiConfig =
    modelValue
      ? resolveApiConfigByModelValue(config, modelValue, "video")
      : config?.videoSeedance || config?.video;

  return normalizeVideoGenerationSettings(apiConfig?.defaultGenerationSettings?.video);
}

export function getGenerationDefaultsSignature(
  config: Config | null | undefined,
  modelValue: string | undefined,
  kind: "image" | "video",
) {
  const activeModel = modelValue || (kind === "image" ? config?.image?.model : config?.videoSeedance?.model || config?.video?.model);
  const apiConfig = activeModel ? resolveApiConfigByModelValue(config, activeModel, kind) : null;
  const settings =
    kind === "image"
      ? resolveImageGenerationSettings(config, activeModel)
      : resolveVideoGenerationSettings(config, activeModel);

  return JSON.stringify({
    kind,
    key: apiConfig?.model || activeModel || (kind === "image" ? FALLBACK_IMAGE_MODEL : FALLBACK_VIDEO_MODEL),
    settings,
  });
}

export function applyImageGenerationDefaults<T extends Record<string, any>>(
  previous: T,
  config: Config | null | undefined,
  modelValue?: string,
) {
  const nextModel = modelValue || previous.model || config?.image?.model || FALLBACK_IMAGE_MODEL;
  const defaults = resolveImageGenerationSettings(config, nextModel);
  const isGptImage = String(nextModel).startsWith("gpt-image-2");

  return {
    ...previous,
    model: nextModel,
    aspectRatio: defaults.aspectRatio,
    imageSize: defaults.imageSize,
    bananaAspectRatio: isGptImage ? previous.bananaAspectRatio : defaults.aspectRatio,
    bananaImageSize: isGptImage ? previous.bananaImageSize : defaults.imageSize,
  };
}

export function applyVideoGenerationDefaults<T extends Record<string, any>>(
  previous: T,
  config: Config | null | undefined,
  modelValue?: string,
) {
  const nextModel = modelValue || previous.model || config?.videoSeedance?.model || config?.video?.model || FALLBACK_VIDEO_MODEL;
  const defaults = resolveVideoGenerationSettings(config, nextModel);

  return {
    ...previous,
    model: nextModel,
    videoMode: defaults.videoMode,
    duration: defaults.duration,
    aspectRatio: defaults.aspectRatio,
    resolution: defaults.resolution,
  };
}
