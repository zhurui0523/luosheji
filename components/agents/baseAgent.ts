import { GoogleGenAI } from "@google/genai";
import type { Config, ApiConfigKey } from "../../types.ts";
import { logUsage } from "../../services/utils.ts";
import { safeJson } from "../../lib/fetch.ts";
import { toBase64 } from "../../lib/utils.ts";

export class BaseAgent {
  protected extractJson(text: string, defaultValue: any = null): any {
    if (!text) return defaultValue || { assets: [], segments: [], tasks: [] };
    
    let cleaned = text.trim();

    // 1. Try to find JSON inside markdown code blocks
    const codeBlockMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (codeBlockMatch && codeBlockMatch[1]) {
      try {
        return JSON.parse(codeBlockMatch[1].trim());
      } catch (e) {
        cleaned = codeBlockMatch[1].trim();
      }
    }

    // 2. Fuzzy extraction
    const start = cleaned.indexOf('{');
    const arrayStart = cleaned.indexOf('[');
    
    if (arrayStart !== -1 && (start === -1 || arrayStart < start)) {
      let extracted = cleaned.substring(arrayStart);
      const lastEnd = extracted.lastIndexOf(']');
      if (lastEnd !== -1) {
        extracted = extracted.substring(0, lastEnd + 1);
        try {
          return JSON.parse(this.repairTruncatedJson(extracted));
        } catch (e) {}
      }
    }

    if (start !== -1) {
      let extracted = cleaned.substring(start);
      const lastEnd = extracted.lastIndexOf('}');
      if (lastEnd !== -1) {
        extracted = extracted.substring(0, lastEnd + 1);
        try {
          return JSON.parse(this.repairTruncatedJson(extracted));
        } catch (e) {}
      }
    }

    try {
      return JSON.parse(cleaned);
    } catch (e) {
      // Try anchor-based fallback extraction for common IntentEngine JSON formats
      const fallbackParsed = this.tryParseAnchorBasedJson(cleaned);
      if (fallbackParsed) {
        return fallbackParsed;
      }

      // 3. Last resort: If it's a list of segments in text format, return a special marker
      if (cleaned.includes('[新起 镜头]') || cleaned.includes('[承接 尾帧')) {
        return { _isTextFormat: true, rawText: cleaned };
      }
      
      console.error("JSON Extraction Failed:", text);
      if (defaultValue) return defaultValue;
      throw e;
    }
  }

  private tryParseAnchorBasedJson(text: string): any | null {
    try {
      const keys = ["isPipeline", "rationale", "response", "steps"];
      const keyPositions: { key: string; index: number; length: number }[] = [];

      keys.forEach((key) => {
        const regex = new RegExp(`"${key}"\\s*:`);
        const match = text.match(regex);
        if (match) {
          keyPositions.push({
            key,
            index: match.index!,
            length: match[0].length,
          });
        }
      });

      if (keyPositions.length === 0) return null;

      // Sort keys by their starting index to find the order
      keyPositions.sort((a, b) => a.index - b.index);

      const result: any = {};

      for (let i = 0; i < keyPositions.length; i++) {
        const current = keyPositions[i];
        const valStart = current.index + current.length;
        
        let valEnd = text.length;
        if (i < keyPositions.length - 1) {
          valEnd = keyPositions[i + 1].index;
        } else {
          const lastCurly = text.lastIndexOf("}");
          if (lastCurly !== -1) {
            valEnd = lastCurly;
          }
        }

        let rawVal = text.substring(valStart, valEnd).trim();

        if (current.key === "isPipeline") {
          const cleanVal = rawVal.replace(/[,} \n\r]/g, "").trim();
          result.isPipeline = cleanVal.toLowerCase().includes("true");
        } else if (current.key === "rationale" || current.key === "response") {
          if (rawVal.startsWith('"')) {
            rawVal = rawVal.substring(1);
          }
          if (rawVal.endsWith(',')) {
            rawVal = rawVal.substring(0, rawVal.length - 1).trim();
          }
          if (rawVal.endsWith('"')) {
            rawVal = rawVal.substring(0, rawVal.length - 1);
          }
          result[current.key] = rawVal
            .replace(/\\n/g, "\n")
            .replace(/\\r/g, "\r")
            .replace(/\\t/g, "\t")
            .replace(/\\"/g, '"')
            .replace(/\\\\/g, "\\");
        } else if (current.key === "steps") {
          if (rawVal.startsWith("[")) {
            try {
              let cleanArray = rawVal;
              if (cleanArray.endsWith(",")) {
                cleanArray = cleanArray.substring(0, cleanArray.length - 1).trim();
              }
              result.steps = JSON.parse(cleanArray);
            } catch (e) {
              result.steps = [];
            }
          }
        }
      }

      if (result.hasOwnProperty("isPipeline") || result.hasOwnProperty("response")) {
        return result;
      }
    } catch (e) {
      console.error("tryParseAnchorBasedJson fallback failed:", e);
    }
    return null;
  }

  protected repairTruncatedJson(json: string): string {
    let stack: string[] = [];
    let inString = false;
    let escaped = false;
    let lastValidIndex = -1;

    for (let i = 0; i < json.length; i++) {
      const char = json[i];
      if (escaped) {
        escaped = false;
        continue;
      }
      if (char === '\\') {
        escaped = true;
        continue;
      }
      if (char === '"') {
        inString = !inString;
        continue;
      }
      if (!inString) {
        if (char === '{' || char === '[') {
          stack.push(char);
        } else if (char === '}' || char === ']') {
          const top = stack.pop();
          if ((char === '}' && top !== '{') || (char === ']' && top !== '[')) {
            break;
          }
        }
      }
      lastValidIndex = i;
    }

    let result = json.substring(0, lastValidIndex + 1);
    if (inString) result += '"';
    while (stack.length > 0) {
      const top = stack.pop();
      result += top === '{' ? '}' : ']';
    }
    return result;
  }

  protected sanitizePrompt(text: string): string {
    if (!text) return '';
    if (typeof text !== 'string') return text;
    // Strip extremely long base64 strings (>500 chars) to prevent token overflow.
    // Text-only models cannot interpret these strings effectively as images.
    return text.replace(/data:[^;]+;base64,[^"'\s\)]+/g, (match) => {
      if (match.length > 500) return '[BASE64_IMAGE_DATA]';
      return match;
    });
  }

  protected getApiKey(configKey?: string, type?: ApiConfigKey, provider?: string): string {
    if (configKey && typeof configKey === 'string' && configKey.trim().length > 0 && configKey !== 'undefined' && configKey !== 'null') return configKey.trim();
    
    // Check if this module is likely a third-party/OpenAI proxy
    const isGptModel = type === 'gptImage' || (type && (type as string).toLowerCase().includes('gpt')) || (type && (type as string).toLowerCase().includes('dall-e'));
    
    const isSeedance = provider === 'Seedance' || type === 'videoSeedance' || type === 'videoSeedanceMini';
    
    // Seedance (Ark) uses its own keys, should not fallback to OpenAI or Gemini
    if (isSeedance) {
      return ''; // Force user to provide a specific Ark key in settings
    }

    const isThirdParty = (provider === 'Third Party' || provider === 'OpenAI') || isGptModel;
    
    if (isThirdParty) {
      const openAiKey = (typeof process !== 'undefined' && process.env) ? (process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY) : undefined;
      if (openAiKey && openAiKey !== 'undefined') return openAiKey.trim();
      
      // Fallback to GEMINI_API_KEY only if the provider is "Third Party" (might be a Google/Gemini Proxy)
      if (provider === 'Third Party') {
        const geminiFallback = (typeof process !== 'undefined' && process.env) ? (process.env.GEMINI_API_KEY || process.env.API_KEY || '') : '';
        if (geminiFallback && geminiFallback !== 'undefined') return geminiFallback.trim();
      }
      
      return ''; 
    }

    const envKey = (typeof process !== 'undefined' && process.env) ? (process.env.GEMINI_API_KEY || process.env.API_KEY || '') : '';
    return (envKey && envKey !== 'undefined') ? envKey.trim() : '';
  }

  protected sanitizeContents(contents: any[]): any[] {
    if (!Array.isArray(contents)) return contents;
    
    return contents.map(content => {
      if (!content || !Array.isArray(content.parts)) return content;
      
      let sanitizedParts = content.parts.map((part: any) => {
        if (!part) return null;
        
        // Handle text parts
        if (part.text !== undefined) {
          const textVal = typeof part.text === 'string' ? part.text : '';
          const cleanedText = this.sanitizePrompt(textVal);
          // If the text is empty, we must NOT send an empty text part as it fails oneof validation.
          // We can use a single space, or we'll filter it if there are other parts.
          return { ...part, text: cleanedText.trim() === '' ? ' ' : cleanedText };
        }
        
        // Handle inlineData/inline_data parts
        const inlineData = part.inlineData || part.inline_data;
        if (inlineData) {
          if (!inlineData.data || typeof inlineData.data !== 'string' || inlineData.data.trim() === '') {
            // Missing/empty base64 data! This will fail oneof 'data' validation.
            // We should discard this part.
            return null;
          }
          // Make sure key names are standard for Google SDK
          return {
            inlineData: {
              data: inlineData.data.trim(),
              mimeType: inlineData.mimeType || inlineData.mime_type || 'image/png'
            }
          };
        }
        
        // Handle fileData/file_data parts
        const fileData = part.fileData || part.file_data;
        if (fileData) {
          const fileUri = fileData.fileUri || fileData.file_uri;
          if (!fileUri || typeof fileUri !== 'string' || fileUri.trim() === '') {
            return null;
          }
          return {
            fileData: {
              fileUri: fileUri.trim(),
              mimeType: fileData.mimeType || fileData.mime_type || 'image/png'
            }
          };
        }
        
        // Keep other parts (functionCall, functionResponse, etc.) if they exist and are valid
        return part;
      }).filter(Boolean);
      
      // If a content turn ended up with 0 parts, we must have at least one part!
      if (sanitizedParts.length === 0) {
        sanitizedParts = [{ text: ' ' }];
      }
      
      return {
        ...content,
        parts: sanitizedParts
      };
    }).filter(content => content && Array.isArray(content.parts) && content.parts.length > 0);
  }

  protected normalizeModel(model: string): string {
    if (!model) return 'gemini-3.5-flash';
    const normalized = model.trim().toLowerCase();
    
    // Internal mapping cleanup (Image) - MUST be checked before general gemini mappings
    if (normalized.includes('image-preview') || normalized.includes('imagen-3')) return 'gemini-3.1-flash-image-preview';
    if (normalized === 'banana-2' || normalized === 'image-2') return 'gemini-1.5-flash';
    if (normalized === 'gpt-image-2' || normalized === 'gpt-image-2-all') return 'gpt-image-2';
    if (normalized === 'dall-e-3' || normalized.includes('dall-e')) return 'dall-e-3';

    // Gemini mappings (Standard Google names for better compatibility)
    if (normalized.includes('gemini-1.5-pro') || normalized.includes('gemini-3.1-pro')) return 'gemini-1.5-pro';
    if (normalized.includes('gemini-1.5-flash') || normalized.includes('gemini-3-flash') || normalized.includes('gemini-3.1-flash')) return 'gemini-1.5-flash';
    
    // Internal mapping cleanup (Video)
    if (normalized === 'seedance2.0' || normalized === 'seedance-v1.5' || normalized.includes('seedance')) return 'seedance-v1.5';
    
    return model;
  }

  protected normalizePath(path: string): string {
    if (!path) return path;
    // Only normalize the base text models, avoid touching specialized image models
    const normalizedPath = path.replace(/gemini-3\.1-pro-preview/g, 'gemini-1.5-pro')
                               .replace(/gemini-3-flash-preview/g, 'gemini-1.5-flash')
                               .replace(/gemini-3\.1-flash(?![a-zA-Z0-9\-])/g, 'gemini-1.5-flash');
    
    return normalizedPath;
  }

  private getPathValue(source: any, path?: string): any {
    if (!path || !source) return undefined;
    return path.split('.').reduce((current, segment) => {
      if (current === undefined || current === null) return undefined;
      const arrayMatch = segment.match(/^(.+?)\[(\d+)\]$/);
      if (arrayMatch) {
        return current[arrayMatch[1]]?.[Number(arrayMatch[2])];
      }
      return current[segment];
    }, source);
  }

  private renderMappingTemplate(template: any, context: Record<string, any>): any {
    if (Array.isArray(template)) {
      return template.map(item => this.renderMappingTemplate(item, context));
    }
    if (template && typeof template === 'object') {
      return Object.fromEntries(
        Object.entries(template).map(([key, value]) => [key, this.renderMappingTemplate(value, context)])
      );
    }
    if (typeof template !== 'string') {
      return template;
    }

    const exactMatch = template.match(/^{{\s*([^}]+)\s*}}$/);
    if (exactMatch) {
      const value = this.getPathValue(context, exactMatch[1].trim());
      return value === undefined ? template : value;
    }

    return template.replace(/{{\s*([^}]+)\s*}}/g, (_match, path) => {
      const value = this.getPathValue(context, String(path).trim());
      if (value === undefined || value === null) return '';
      return typeof value === 'string' ? value : JSON.stringify(value);
    });
  }

  private applyRequestMapping(body: any, requestMapping: any, context: Record<string, any>): any {
    if (!requestMapping || typeof requestMapping !== 'object') {
      return body;
    }

    const mappingBody = requestMapping.body || requestMapping.payload || requestMapping.json;
    if (!mappingBody) {
      return body;
    }

    return this.renderMappingTemplate(mappingBody, {
      ...context,
      body
    });
  }

  private applyResponseMapping(result: any, responseMapping: any): any {
    if (!responseMapping || typeof responseMapping !== 'object') {
      return result;
    }

    if (responseMapping.root) {
      const rootValue = this.getPathValue(result, responseMapping.root);
      if (rootValue !== undefined) {
        return rootValue;
      }
    }

    const mapped = { ...result };
    for (const key of ['text', 'url', 'image', 'images', 'videoUrl', 'operationId']) {
      const path = responseMapping[key];
      if (typeof path === 'string') {
        const value = this.getPathValue(result, path);
        if (value !== undefined) {
          mapped[key] = value;
        }
      }
    }
    return mapped;
  }

  public async callApiFormData(type: ApiConfigKey, formData: FormData, config?: Config): Promise<any> {
    const apiConfig = config ? config[type] : null;
    if (!apiConfig) throw new Error(`未找到 ${type} 的配置信息`);
    const apiKey = this.getApiKey(apiConfig.apiKey, type, apiConfig.provider);
    if (!apiKey) throw new Error(`未找到 ${type} (Provider: ${apiConfig.provider}) 的 API Key，请检查设置。`);

    const baseUrl = (apiConfig.endpoint || '').replace(/\/+$/, '').replace(/\/v1$/, '').replace(/\/v1beta$/, '');
    let url = '';
    if (apiConfig.path) {
      url = `${apiConfig.endpoint.replace(/\/+$/, '')}${apiConfig.path}`;
    } else if (apiConfig.endpoint.includes('/api/v3/') || apiConfig.endpoint.includes('/v1/')) {
      // If the original endpoint is already a full URL, use it directly
      url = apiConfig.endpoint.replace(/\/+$/, '');
    } else {
      url = `${baseUrl}/v1/videos`;
    }
    
    // Clean up any double versioning in the final URL
    url = url.replace(/\/v1\/v1\//g, '/v1/').replace(/\/v1beta\/v1\//g, '/v1beta/');

    const headers: any = {};
    if (apiConfig.provider === 'Third Party' || apiConfig.provider === 'Seedance') {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    // Use bridge for external APIs if needed
    const isExternal = !url.includes('localhost') && !url.startsWith('/');
    if (isExternal) {
       // Note: Multi-part form data via bridge is complex, but we need it for CORS.
       // However, the current bridge handles JSON. For FormData, we need a specialized bridge or 
       // ensured server-side execution.
       // For now, let's at least ensure the URL is clean.
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: formData
    });

    if (!response.ok) {
      const errorData = await safeJson(response);
      throw new Error(errorData?.error?.message || errorData?.message || `API 请求失败: ${response.status}`);
    }

    return await safeJson(response);
  }

  public async callApi(type: ApiConfigKey, method: string, body: any, config?: Config): Promise<any> {
    let resolvedType = type;
    const modelStr = body?.model || '';
    if (type === 'image' && (modelStr === 'gpt-image-2' || modelStr === 'gpt-image-2-all' || modelStr.includes('dall-e'))) {
      resolvedType = 'gptImage';
    }
    if (type === 'script' && (modelStr === 'claude-sonnet-5' || modelStr.includes('claude'))) {
      resolvedType = 'claudeSonnet';
    }
    if (type === 'script' && (modelStr === 'gpt-4o' || modelStr.includes('gpt'))) {
      resolvedType = 'gptText';
    }
    let apiConfigRaw = config ? config[resolvedType] : null;
    if (!apiConfigRaw && config?.customInterfaces?.[resolvedType]) {
      apiConfigRaw = config.customInterfaces[resolvedType];
    }
    if (!apiConfigRaw) throw new Error(`未找到 ${resolvedType} 的配置信息`);
    
    const apiConfig = { ...apiConfigRaw };
    let endpoint = (apiConfig.endpoint || '').trim();
    let apiKey = this.getApiKey(apiConfig.apiKey, resolvedType, apiConfig.provider);

    // SMART ROUTING: If we detect a standard Google GenAI API key (starts with AIzaSy)
    // but the endpoint is set to a third-party server (like vectorengine.ai),
    // automatically rewrite the routing to use official Google Gemini directly.
    const isGoogleKey = apiKey && apiKey.startsWith('AIzaSy');
    if (isGoogleKey && !endpoint.includes('googleapis.com')) {
      endpoint = 'https://generativelanguage.googleapis.com';
      apiConfig.endpoint = endpoint;
      apiConfig.provider = 'Google';
      apiConfig.path = undefined;
      apiConfig.protocolType = 'google';
    }
    
    // Explicit override from protocolType
    const forceOpenAI = apiConfig.protocolType === 'openai';
    
    // Detect if the endpoint is already a full URL (contains path/method)
    const isFullUrl = endpoint.startsWith('http') && (
      endpoint.includes(':generateContent') || 
      endpoint.includes(':predict') || 
      endpoint.includes(':generateImages') || 
      endpoint.includes('/chat/completions') || 
      endpoint.includes('/v1/images/generations') || 
      endpoint.includes('/v1/chat/completions') ||
      endpoint.includes('/v1/messages') ||
      endpoint.includes('/v1/video/create') ||
      endpoint.includes('/v1/videos')
    );

    const isThirdParty = (apiConfig.provider === 'Third Party' || apiConfig.provider === 'OpenAI') || (resolvedType === 'gptImage') || (resolvedType === 'gptText') || (body?.model?.includes('gpt-image')) || (body?.model?.includes('gpt'));

    if (!apiKey) {
      const isSeedance = apiConfig.provider === 'Seedance' || resolvedType === 'videoSeedance' || resolvedType === 'videoSeedanceMini';
      const targetType = isSeedance ? 'Seedance/Ark' : ((isThirdParty || forceOpenAI) ? 'OpenAI/GPT' : resolvedType);
      const slotName = resolvedType === 'gptImage' ? 'GPT-IMAGE-2' : (resolvedType === 'gptText' ? 'GPT-4o (GPT TEXT)' : (resolvedType === 'script' ? '剧本生成' : (resolvedType === 'claudeSonnet' ? 'Claude-sonnet-5' : (resolvedType === 'videoSeedance' ? 'Seedance 2.0' : (resolvedType === 'videoSeedanceMini' ? 'SD2.0Mini' : resolvedType)))));
      throw new Error(`未找到 ${targetType} 的 API Key (配置槽: ${slotName})，请在大模型 API 设置中检查配置。`);
    }

    if (!endpoint) {
      endpoint = (isThirdParty || forceOpenAI) ? 'https://api.openai.com' : 'https://generativelanguage.googleapis.com';
    }

    const isDefaultEndpoint = false; // Always use the bridge for better reliability and to avoid client-side blocks
    const rawSize = body?.config?.imageConfig?.imageSize || body?.imageConfig?.imageSize || body?.generationConfig?.imageConfig?.imageSize || 
                   body?.config?.image_config?.image_size || body?.generationConfig?.image_config?.image_size;
    const is4K = rawSize === '4K' || rawSize === 'ultra' || (typeof rawSize === 'string' && rawSize.includes('4096'));
    const isVideo = resolvedType === 'video' || resolvedType === 'videoSeedance' || resolvedType === 'videoSeedanceMini' || resolvedType === 'videoVeoFast';
    let timeoutMs = isVideo ? 1800000 : (resolvedType === 'image' || resolvedType === 'script' || resolvedType === 'gptImage' || resolvedType === 'gptText' ? 1800000 : 300000); 

    const safetySettings = [
      { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_ONLY_HIGH" },
      { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_ONLY_HIGH" },
      { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_ONLY_HIGH" },
      { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_ONLY_HIGH" },
      { category: "HARM_CATEGORY_CIVIC_INTEGRITY", threshold: "BLOCK_ONLY_HIGH" }
    ];

    // For text tasks, adjust timeout based on input length
    if (type === 'script') {
      const contentStr = JSON.stringify(body.contents || '');
      const wordCount = contentStr.length / 2;
      if (wordCount > 5000) {
        timeoutMs = Math.max(timeoutMs, 600000 + Math.floor(wordCount / 10000) * 300000); 
      }
    }

    if (isDefaultEndpoint) {
      const ai = new GoogleGenAI({ apiKey });
      let lastError: any = null;
      const maxRetries = 3;
      for (let i = 0; i < maxRetries; i++) {
        try {
          const apiCall = async () => {
            const modelName = this.normalizeModel(body.model || apiConfig.model);
            if (method === 'generateContent') {
              const genConfig = body.config || body.generationConfig || {};
              return await ai.models.generateContent({
                model: modelName,
                contents: this.sanitizeContents(body.contents),
                config: { 
                  ...genConfig, 
                  imageConfig: genConfig.imageConfig || body.imageConfig,
                  safetySettings: safetySettings
                }
              });
            } else if (method === 'generateImages') {
              return await ai.models.generateImages({
                model: modelName,
                prompt: body.prompt,
                config: body.config || body.imageConfig
              });
            } else if (method === 'generateVideos') {
              return await ai.models.generateVideos({
                model: modelName,
                prompt: body.prompt,
                image: body.image,
                config: body.config || body.videoConfig
              });
            }
          };

          const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), timeoutMs));
          const result = await Promise.race([apiCall(), timeoutPromise]) as any;
          logUsage(type === 'image' ? 'image_gen' : (type === 'video' ? 'video_gen' : 'text_ai'), 0, { method, model: this.normalizeModel(body.model || apiConfig.model) });

          const finalResult = (result && result.response) ? result.response : result;
          if (method === 'generateContent' && finalResult) {
            if (!finalResult.text && finalResult.candidates?.[0]?.content?.parts?.[0]?.text) {
              Object.defineProperty(finalResult, 'text', {
                get: function() { return this.candidates[0].content.parts.map((p: any) => p.text || '').join(''); },
                configurable: true, enumerable: true
              });
            }
            if (finalResult.candidates?.[0]?.content?.parts) {
              const imgPart = finalResult.candidates[0].content.parts.find((p: any) => (p.inlineData || p.inline_data || p.fileData || p.file_data));
              if (imgPart) {
                const data = imgPart.inlineData?.data || imgPart.inline_data?.data;
                if (data) {
                  const mimeType = imgPart.inlineData?.mimeType || imgPart.inline_data?.mime_type || 'image/png';
                  finalResult.images = [{ url: `data:${mimeType};base64,${data}` }];
                }
              }
            }
          }
          if (!finalResult.images || finalResult.images.length === 0) {
            const dataUrlMatch = JSON.stringify(finalResult).match(/data:image\/[a-zA-Z]+;base64,[a-zA-Z0-9+/=]+/);
            if (dataUrlMatch) finalResult.images = [{ url: dataUrlMatch[0], revisedPrompt: '' }];
          }
          return finalResult;
        } catch (e: any) {
          lastError = e;
          let errorMsg = e.message || String(e);
          const isInvalidKey = errorMsg.toLowerCase().includes('api_key_invalid') || 
                               errorMsg.toLowerCase().includes('invalid api key') ||
                               errorMsg.toLowerCase().includes('invalid token') ||
                               errorMsg.toLowerCase().includes('invalid_api_key');
          
          if (isInvalidKey) throw new Error('API Key 无效或令牌已过期，请在设置或管理后台中检查配置。');
          const isRateLimit = errorMsg.includes('429') || errorMsg.toLowerCase().includes('quota') || errorMsg.toLowerCase().includes('rate exceeded') || errorMsg.includes('负载已饱和');
          if (isRateLimit) {
            if (errorMsg.includes('120 seconds')) errorMsg = '由于多次使用无效 Token，您的 IP 已被暂时封禁，请等待 120 秒后再试 (429)。';
            else if (errorMsg.includes('seconds')) errorMsg = `请求过于频繁 (429)，${errorMsg.match(/\d+ seconds/)?.[0] || '请稍后再试'}。`;
            else if (errorMsg.includes('饱和')) errorMsg = '当前分组负载饱和，上游请求过多，请稍后再试 (429)。';
            else errorMsg = '请求过于频繁或配额已耗尽 (429)，请稍后再试。';
          }
          
          const isRetryable = isRateLimit || errorMsg === 'Timeout' || errorMsg.includes('500') || errorMsg.includes('饱和') || errorMsg.includes('saturated');
          if (isRetryable && i < maxRetries - 1) {
            const waitTime = isRateLimit ? 5000 * Math.pow(2, i) : 2000 * Math.pow(2, i);
            console.warn(`[BaseAgent/SDK] Retryable error, retrying in ${waitTime}ms... Attempt ${i + 1}/${maxRetries}`);
            await new Promise(r => setTimeout(r, waitTime));
            continue;
          }
          throw new Error(errorMsg);
        }
      }
      throw lastError;
    }

    const baseUrlRaw = endpoint.replace(/\/+$/, '');
    const hasV1 = baseUrlRaw.endsWith('/v1');
    const baseUrl = baseUrlRaw.replace(/\/v1$/, '').replace(/\/v1beta$/, '');
    const targetModel = this.normalizeModel(apiConfig.model || body.model);
    const restBody: any = { ...body, model: targetModel };
    
    // Payload and URL Selection
    const normTarget = targetModel.toLowerCase();
    const isGeminiMultimodal = normTarget.includes('image-preview') || normTarget.includes('imagen');
    const isExplicitGpt = normTarget.includes('gpt') || normTarget.includes('dall-e') || normTarget.includes('claude');
    
    // Protocol selection must respect the user's explicit API type first.
    // Endpoint/model heuristics are only fallbacks for old configs without protocolType.
    const isGoogleEndpoint = endpoint.includes(':generateContent') || endpoint.includes(':predict') || endpoint.includes(':generateImages') || endpoint.includes('googleapis.com') || apiConfig.provider === 'Google';
    const isOpenAiEndpoint = endpoint.includes('/chat/completions') || endpoint.includes('/v1/images/generations') || endpoint.includes('/v1/chat/completions');
    
    let effectiveProtocol: 'google' | 'openai' | 'claude' = 'google';
    if (apiConfig.protocolType === 'claude' || apiConfig.protocolType === 'anthropic' || endpoint.includes('/v1/messages') || endpoint.includes('/messages')) {
      effectiveProtocol = 'claude';
    } else if (apiConfig.protocolType === 'google') {
      effectiveProtocol = 'google';
    } else if (apiConfig.protocolType === 'openai') {
      effectiveProtocol = 'openai';
    } else if (isGoogleEndpoint) {
      effectiveProtocol = 'google';
    } else if (isOpenAiEndpoint) {
      effectiveProtocol = 'openai';
    } else if (forceOpenAI || isExplicitGpt) {
      effectiveProtocol = 'openai';
    } else if (endpoint.includes('openai.com') || endpoint.includes('vectorengine.ai') || endpoint.includes('volces.com') || apiConfig.provider === 'OpenAI' || apiConfig.provider === 'Third Party' || apiConfig.provider === 'Seedance') {
      effectiveProtocol = 'openai';
    }

    const isImageGeneration = (type === 'image' || type === 'gptImage' || method === 'generateImages');
    
    // Normalize method for Multimodal (Gemini image-gen is done via generateContent)
    let effectiveMethod = method;
    if (isGeminiMultimodal && (method === 'generateImages' || type === 'image')) {
      effectiveMethod = 'generateContent';
    }

    const isGptModel = normTarget === 'gpt-image-2-all' || normTarget === 'gpt-image-2' || normTarget === 'dall-e-3' || isExplicitGpt;

    const isOpenAiTaskStyle = (isImageGeneration || isVideo) && (effectiveProtocol === 'openai' || isGptModel);
    const isGoogleImagen = (effectiveMethod === 'generateImages' && !isOpenAiTaskStyle && (effectiveProtocol === 'google' || isGeminiMultimodal));
    
    // Robust size restriction for standard OpenAI (DALL-E 3 doesn't support 4K/2K)
    let openaiSize = body.size;
    let mappedRatio = '1:1';
    if (isOpenAiTaskStyle && isImageGeneration) {
      const isUltra = rawSize === '4K' || rawSize === 'ultra' || (typeof rawSize === 'string' && (rawSize.includes('4096') || rawSize.includes('4k')));
      const is2K = rawSize === '2K' || rawSize === 'high' || (typeof rawSize === 'string' && (rawSize.includes('2048') || rawSize.includes('2k')));
      const imageCfg = body.config?.imageConfig || body.imageConfig;
      let r = imageCfg?.aspectRatio || '1:1';
      mappedRatio = r;
      
      const isGeminiMultimodalModel = targetModel.toLowerCase().includes('gemini') || isGeminiMultimodal;
      if (isGeminiMultimodalModel) {
        // Use Gemini-supported ratios: '1:1', '3:4', '4:3', '9:16', '16:9'
        const allowedGeminiRatios = ['1:1', '3:4', '4:3', '9:16', '16:9'];
        if (!allowedGeminiRatios.includes(r)) {
          if (r === '2:1' || r === '21:9' || r === '3:2') {
            r = '16:9';
          } else if (r === '2:3' || r === '3:4') {
            r = '3:4';
          } else {
            r = '1:1';
          }
        }
        mappedRatio = r;
      } else {
        // Map unsupported aspect ratios for OpenAI and GPT models
        if (r === '2:1' || r === '21:9' || r === '3:2') {
          r = '16:9';
        } else if (r === '2:3' || r === '3:4') {
          r = '9:16';
        } else if (r !== '1:1' && r !== '9:16' && r !== '16:9') {
          r = '1:1';
        }
        mappedRatio = r;
      }

      // If it's a standard provider, we MUST stick to their limits
      const isStandardProvider = (apiConfig.provider === 'OpenAI' || endpoint.includes('openai.com'));
      
      if (isStandardProvider) {
        if (r === '9:16' || r === '2:3') openaiSize = "1024x1792";
        else if (r === '16:9' || r === '3:2') openaiSize = "1792x1024";
        else openaiSize = "1024x1024";
      } else if (isGeminiMultimodalModel) {
        // Advanced proxies might support true 2K/4K via custom resolutions for Gemini Multimodal
        if (isUltra) {
          if (r === '9:16') openaiSize = "2160x3840";
          else if (r === '3:4') openaiSize = "2160x2880";
          else if (r === '16:9') openaiSize = "3840x2160";
          else if (r === '4:3') openaiSize = "2880x2160";
          else openaiSize = "2048x2048";
        } else if (is2K) {
          if (r === '9:16') openaiSize = "1152x2048";
          else if (r === '3:4') openaiSize = "1536x2048";
          else if (r === '16:9') openaiSize = "2048x1152";
          else if (r === '4:3') openaiSize = "2048x1536";
          else openaiSize = "1536x1536";
        } else {
          if (r === '9:16') openaiSize = "1024x1792";
          else if (r === '3:4') openaiSize = "1152x1536";
          else if (r === '16:9') openaiSize = "1792x1024";
          else if (r === '4:3') openaiSize = "1536x1152";
          else openaiSize = "1024x1024";
        }
      } else {
        // Advanced proxies might support true 2K/4K via custom resolutions
        if (isUltra) {
          if (r === '9:16' || r === '2:3') openaiSize = "2160x3840";
          else if (r === '16:9' || r === '3:2') openaiSize = "3840x2160";
          else if (r === '1:1') openaiSize = "2048x2048";
          else openaiSize = "3840x2160";
        } else if (is2K) {
          if (r === '9:16' || r === '2:3') openaiSize = "1152x2048";
          else if (r === '16:9' || r === '3:2') openaiSize = "2048x1152";
          else if (r === '1:1') openaiSize = "1536x1536";
          else openaiSize = "2048x1152";
        } else {
          if (r === '9:16') openaiSize = "1024x1792";
          else if (r === '2:3') openaiSize = "1024x1536";
          else if (r === '16:9') openaiSize = "1792x1024";
          else if (r === '3:2') openaiSize = "1536x1024";
          else openaiSize = "1024x1024";
        }
      }
    }

    // Robust model mapping for standard OpenAI
    const isStandardOpenAiImage = (effectiveProtocol === 'openai' && (endpoint.includes('openai.com') || apiConfig.provider === 'OpenAI')) && isOpenAiTaskStyle && isImageGeneration;
    const actualModel = (isStandardOpenAiImage && targetModel.startsWith('gpt-image')) ? 'dall-e-3' : targetModel;

    let finalPayload: any = restBody;
    if (isGoogleImagen) {
      const promptText = restBody.prompt || (restBody.contents ? restBody.contents[0]?.parts.find((p: any) => p.text)?.text : '');
      const imgCfg = body.config?.imageConfig || body.imageConfig || body.config;
      finalPayload = { prompt: promptText };
      if (imgCfg) {
        // Use labels for Imagen 3 if available
        const sizeString = imgCfg.imageSize || imgCfg.image_size || '1024px';
        let finalAspect = imgCfg.aspectRatio || imgCfg.aspect_ratio || '1:1';
        
        // Map unsupported aspect ratios for Google Imagen (e.g., panorama 2:1 -> 16:9)
        if (finalAspect === '2:1' || finalAspect === '21:9' || finalAspect === '3:2') {
          finalAspect = '16:9';
        } else if (finalAspect === '2:3' || finalAspect === '3:4') {
          finalAspect = '3:4';
        } else if (finalAspect !== '1:1' && finalAspect !== '3:4' && finalAspect !== '4:3' && finalAspect !== '9:16' && finalAspect !== '16:9') {
          finalAspect = '1:1';
        }

        finalPayload.config = { 
          aspectRatio: finalAspect, 
          aspect_ratio: finalAspect,
          imageSize: sizeString, 
          image_size: sizeString,
          sampleCount: imgCfg.sampleCount || 1, 
          seed: imgCfg.seed 
        };
      }
    } else if (isOpenAiTaskStyle) {
      // 深度适配 gpt-image-2 / 视频生成与中转 API
      finalPayload = { 
        model: actualModel,
        prompt: restBody.prompt || (restBody.contents ? restBody.contents[0]?.parts.find((p: any) => p.text)?.text : ''),
        ...restBody
      };
      
      // Ensure we don't have prompt duplicates if we use it from contents
      if (!restBody.prompt && finalPayload.prompt) {
        // If we extracted prompt from contents, we should keep it
      }

      if (isImageGeneration) {
        finalPayload.n = restBody.n || 1;
        let finalSize = openaiSize || '1024x1024';
        if (targetModel.startsWith('gpt-image-2')) {
          const fsLower = finalSize.toLowerCase();
          // Map to standard supported SDXL/Flux tall resolutions preserving aspect ratio
          if (fsLower === '9:16' || fsLower === '1024x1792' || fsLower === '2160x3840' || fsLower === '1152x2048') {
            finalSize = '1024x1792';
          } else if (fsLower === '2:3' || fsLower === '1024x1536') {
            finalSize = '1024x1536';
          }
          // Map to standard supported SDXL/Flux wide resolutions preserving aspect ratio
          else if (fsLower === '16:9' || fsLower === '1792x1024' || fsLower === '3840x2160' || fsLower === '2048x1152' || fsLower === '2:1' || fsLower === '21:9') {
            finalSize = '1792x1024';
          } else if (fsLower === '3:2' || fsLower === '1536x1024') {
            finalSize = '1536x1024';
          }
          // Map standard square resolutions
          else if (fsLower === '1:1' || fsLower === '1024x1024' || fsLower === '2048x2048' || fsLower === '1536x1536') {
            finalSize = '1024x1024';
          } else {
            // Default fallback
            finalSize = '1024x1792'; // fallback to beautiful tall or widescreen based on original ratio
          }

          // Extract reference/edit images into the `image` string array (max 5)
          const inputImages: string[] = [];
          if (body.contents?.[0]?.parts) {
            for (const part of body.contents[0].parts) {
              if (part.inlineData?.data) {
                const mime = part.inlineData.mimeType || 'image/png';
                inputImages.push(`data:${mime};base64,${part.inlineData.data}`);
              }
            }
          }
          if (inputImages.length > 0) {
            finalPayload.image = inputImages;
          }
        }
        finalPayload.size = finalSize;
        finalPayload.quality = restBody.quality || 'auto';
        if (restBody.format) {
          finalPayload.format = restBody.format;
        }
        
        // Clean up Gemini-specific properties that aren't allowed in standard GPT/OpenAI payloads
        if (targetModel.startsWith('gpt-image-2') || targetModel.includes('dall-e')) {
          delete finalPayload.contents;
          delete finalPayload.config;
        }
      }

      if (isVideo) {
        // Standard OpenAI style for other models
        finalPayload.seconds = body.config?.duration || body.duration || '8';
        finalPayload.duration = finalPayload.seconds;
        finalPayload.size = body.config?.aspectRatio || body.aspectRatio || '16:9';
        finalPayload.aspect_ratio = finalPayload.size;
      }

      // 自动补齐比例参数，增强兼容性
      const imageCfg = body.config?.imageConfig || body.imageConfig;
      let ratio = imageCfg?.aspectRatio || (finalPayload.size === '1024x1792' ? '9:16' : (finalPayload.size === '1792x1024' ? '16:9' : '1:1'));
      if (isGeminiMultimodal) {
        ratio = mappedRatio;
      }
      
      if (ratio && (!finalPayload.aspect_ratio || isGeminiMultimodal)) finalPayload.aspect_ratio = ratio;
      if (ratio && (!finalPayload.aspectRatio || isGeminiMultimodal)) finalPayload.aspectRatio = ratio;

      // Handle specialized image parts
      if (restBody.image) {
        finalPayload.image = restBody.image;
      }
    } else if (effectiveProtocol === 'claude') {
      const messages = [];
      let sysText = '';
      const sysInst = body.config?.systemInstruction || body.systemInstruction;
      if (sysInst) {
        if (typeof sysInst === 'string') sysText = sysInst;
        else if (sysInst.parts && Array.isArray(sysInst.parts)) {
          sysText = sysInst.parts.map((p: any) => p.text || '').join('');
        }
      }

      if (restBody.contents) {
        for (const content of restBody.contents) {
          const role = content.role === 'model' ? 'assistant' : 'user';
          const contentParts = content.parts.map((p: any) => {
            if (p.text) return { type: 'text', text: p.text };
            const inlineData = p.inlineData || p.inline_data;
            if (inlineData) {
              const data = inlineData.data;
              const mimeType = inlineData.mimeType || inlineData.mime_type || 'image/png';
              return { 
                type: 'image', 
                source: {
                  type: 'base64',
                  media_type: mimeType,
                  data: data
                }
              };
            }
            return null;
          }).filter(Boolean);
          messages.push({ 
            role, 
            content: contentParts.length === 1 && contentParts[0].type === 'text' ? contentParts[0].text : contentParts 
          });
        }
      } else if (restBody.prompt) {
        messages.push({ role: 'user', content: restBody.prompt });
      }

      finalPayload = { 
        model: targetModel, 
        messages: messages, 
        max_tokens: restBody.config?.maxOutputTokens || 4000,
        temperature: restBody.config?.temperature || 0.7
      };
      if (sysText) {
        finalPayload.system = sysText;
      }
    } else if (effectiveProtocol === 'openai') {
      const messages = [];
      const sysInst = body.config?.systemInstruction || body.systemInstruction;
      if (sysInst) {
        let sysText = '';
        if (typeof sysInst === 'string') sysText = sysInst;
        else if (sysInst.parts && Array.isArray(sysInst.parts)) {
          sysText = sysInst.parts.map((p: any) => p.text || '').join('');
        }
        if (sysText) messages.push({ role: 'system', content: sysText });
      }

      if (restBody.contents) {
        for (const content of restBody.contents) {
          const role = content.role === 'model' ? 'assistant' : 'user';
          const contentParts = content.parts.map((p: any) => {
            if (p.text) return { type: 'text', text: p.text };
            const inlineData = p.inlineData || p.inline_data;
            if (inlineData) {
              const data = inlineData.data;
              const mimeType = inlineData.mimeType || inlineData.mime_type || 'image/png';
              return { type: 'image_url', image_url: { url: `data:${mimeType};base64,${data}` } };
            }
            return null;
          }).filter(Boolean);
          messages.push({ role, content: contentParts.length === 1 && contentParts[0].type === 'text' ? contentParts[0].text : contentParts });
        }
      } else if (restBody.prompt) messages.push({ role: 'user', content: restBody.prompt });

      finalPayload = { model: (effectiveProtocol === 'openai' && endpoint.includes('openai.com') && targetModel.startsWith('gpt-image')) ? 'gpt-3.5-turbo' : targetModel, messages: messages, temperature: restBody.config?.temperature || 0.7, stream: false };
    } else {
      // DEFAULT GOOGLE/GEMINI FORMAT
      if (restBody.contents) {
        restBody.contents = this.sanitizeContents(restBody.contents);
      } else if (restBody.prompt) {
        restBody.contents = [{ role: 'user', parts: [{ text: restBody.prompt }] }];
        delete restBody.prompt;
      }
      
      const genConfig: any = {};
      const sourceConfig = body.config || body.generationConfig || {};
      if (sourceConfig.temperature !== undefined) genConfig.temperature = sourceConfig.temperature;
      if (sourceConfig.maxOutputTokens !== undefined) genConfig.max_output_tokens = sourceConfig.maxOutputTokens;
      
      // Only include response_mime_type if it is explicitly allowed and NOT an image task
      // Standard Gemini API for generateContent with images often errors on response_mime_type
      const isImageTask = !!(sourceConfig.imageConfig || body.imageConfig || normTarget.includes('image-preview') || normTarget.includes('imagen') || normTarget.includes('vision'));
      
      // Explicitly clean up response_mime_type if it's an image task
      if (isImageTask) {
        if (sourceConfig.responseMimeType) delete sourceConfig.responseMimeType;
        if (body.generationConfig) {
          delete body.generationConfig.response_mime_type;
          delete body.generationConfig.responseMimeType;
        }
      } else if (sourceConfig.responseMimeType) {
        const allowedMimes = ['text/plain', 'application/json', 'application/xml', 'application/yaml'];
        if (allowedMimes.includes(sourceConfig.responseMimeType)) {
          genConfig.response_mime_type = sourceConfig.responseMimeType;
        }
      }
      
      const imgCfg = sourceConfig.imageConfig || body.imageConfig;
      if (imgCfg) {
        let s = imgCfg.imageSize || imgCfg.image_size || '1024x1024';
        let r = imgCfg.aspectRatio || imgCfg.aspect_ratio || '1:1';
        
        // For Google's latest multimodal image generation, the image size must be strictly '1K', '2K', '4K', or '512px'
        const isGeminiMultimodal = normTarget.includes('image-preview') || normTarget.includes('image-gen') || normTarget.includes('imagen') || normTarget.includes('gemini');
        if (isGeminiMultimodal) {
          const sLower = s.toLowerCase();
          if (sLower.includes('4k') || sLower.includes('4096') || sLower.includes('3840') || sLower.includes('ultra')) {
            s = '4K';
          } else if (sLower.includes('2k') || sLower.includes('2048') || sLower.includes('1152') || sLower.includes('1536') || sLower.includes('high')) {
            s = '2K';
          } else if (sLower === '512px' || sLower.includes('512')) {
            s = '512px';
          } else {
            s = '1K';
          }

          // Map unsupported aspect ratios to Gemini/Imagen 3 supported ones: '1:1', '3:4', '4:3', '9:16', '16:9'
          const allowedGeminiRatios = ['1:1', '3:4', '4:3', '9:16', '16:9'];
          if (!allowedGeminiRatios.includes(r)) {
            if (r === '2:1' || r === '21:9' || r === '3:2') {
              r = '16:9';
            } else if (r === '2:3' || r === '3:4') {
              r = '3:4';
            } else {
              r = '1:1';
            }
          }
        }

        genConfig.imageConfig = {
          aspectRatio: r,
          imageSize: s
        };
        genConfig.image_config = {
          aspect_ratio: r,
          image_size: s
        };
        
        // Deep nesting for various Google/Gemini API versions
        genConfig.imageGenerationConfig = { ...genConfig.imageConfig };
        genConfig.image_generation_config = { ...genConfig.image_config };
        
        // Explicitly set aspect ratio and image size at the top level of generationConfig for better compatibility
        genConfig.aspectRatio = r;
        genConfig.aspect_ratio = r;
        genConfig.imageSize = s;
        genConfig.image_size = s;
        genConfig.resolution = s; 
      }

      finalPayload = { 
        ...restBody, 
        generationConfig: {
          ...(restBody.generationConfig || {}),
          ...genConfig
        }, 
        safetySettings: safetySettings 
      };
      const sysInst = body.config?.systemInstruction || body.systemInstruction;
      if (sysInst) {
        if (typeof sysInst === 'string') {
          finalPayload.systemInstruction = { parts: [{ text: sysInst }] };
        } else {
          finalPayload.systemInstruction = sysInst;
        }
      }
      delete finalPayload.config;
    }

    let url = '';
    if (isFullUrl) {
      url = baseUrlRaw;
    } else if (apiConfig.path) {
      let cleanPath = apiConfig.path.startsWith('/') ? apiConfig.path : `/${apiConfig.path}`;
      if (!cleanPath.includes(':') && effectiveMethod) cleanPath = `${cleanPath}:${effectiveMethod}`;
      url = `${baseUrlRaw}/${this.normalizePath(cleanPath.replace(/^\/+/, ''))}`;
    } else if (isOpenAiTaskStyle && isImageGeneration) {
      if (baseUrlRaw.endsWith('/images/generations')) {
        url = baseUrlRaw;
      } else {
        url = (baseUrlRaw.endsWith('/v1') || effectiveProtocol === 'openai' || baseUrlRaw.includes('openai.com')) ? `${baseUrlRaw}/images/generations` : `${baseUrl}/v1/images/generations`;
      }
    } else if (isOpenAiTaskStyle && isVideo) {
      url = (baseUrlRaw.endsWith('/v1') || effectiveProtocol === 'openai' || baseUrlRaw.includes('openai.com')) ? `${baseUrlRaw}/chat/completions` : `${baseUrl}/v1/chat/completions`;
    } else if (effectiveProtocol === 'claude') {
      const cleanBase = baseUrlRaw;
      url = (cleanBase.endsWith('/v1/messages') || cleanBase.endsWith('/messages')) ? cleanBase : `${cleanBase.replace(/\/+$/, '')}/v1/messages`;
    } else if (effectiveProtocol === 'openai') {
      const cleanBase = baseUrlRaw;
      url = (baseUrlRaw.endsWith('/v1') || effectiveProtocol === 'openai' || cleanBase.includes('openai.com')) ? `${cleanBase}/chat/completions` : `${cleanBase.replace(/\/+$/, '')}/v1/chat/completions`;
    } else {
      const modelInPath = targetModel;
      const cleanPath = effectiveMethod ? `${modelInPath}:${effectiveMethod}` : modelInPath;
      url = `${baseUrlRaw.replace(/\/+$/, '')}/v1beta/models/${cleanPath}`;
    }

    if (!url.includes('key=') && effectiveProtocol !== 'openai' && effectiveProtocol !== 'claude' && apiConfig.provider !== 'Third Party' && apiConfig.provider !== 'Seedance') {
      url += `${url.includes('?') ? '&' : '?'}key=${apiKey}`;
    }

    return await this.performFetch(url, finalPayload, apiKey, apiConfig, timeoutMs, resolvedType, method, targetModel);
  }

  private async performFetch(url: string, body: any, apiKey: string, apiConfig: any, timeoutMs: number, type: string, method: string, targetModel: string): Promise<any> {
    const maxRetries = 3; // 严格执行 3 次尝试
    let lastError: any = null;

    // 针对 gpt-image-2-all 这类慢速生成模型，大幅增加基础超时至 8 分钟 (480,000ms)，以防响应被过早切断
    const isSlowModel = targetModel?.includes('gpt-image') || targetModel?.includes('seedance');
    const effectiveTimeout = isSlowModel ? Math.max(timeoutMs, 480000) : timeoutMs;

    for (let i = 0; i < maxRetries; i++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), effectiveTimeout);
        const headers: any = { 'Content-Type': 'application/json' };
        
        if (apiKey) {
          const isGoogleDomain = url.includes('googleapis.com');
          const isClaude = url.includes('/v1/messages') || url.includes('/messages') || apiConfig.protocolType === 'claude' || apiConfig.protocolType === 'anthropic';
          if (isGoogleDomain) {
            headers['x-goog-api-key'] = apiKey;
          } else if (isClaude) {
            headers['x-api-key'] = apiKey;
            headers['anthropic-version'] = '2023-06-01';
            headers['Authorization'] = apiKey.startsWith('Bearer ') ? apiKey : `Bearer ${apiKey}`;
          } else {
            headers['Authorization'] = apiKey.startsWith('Bearer ') ? apiKey : `Bearer ${apiKey}`;
          }
        }
        
        let finalUrl = url;
        const mappedBody = this.applyRequestMapping(body, apiConfig.requestMapping, {
          type,
          method,
          model: targetModel,
          prompt: body?.prompt || body?.contents?.[0]?.parts?.find?.((part: any) => part?.text)?.text || '',
          body
        });
        let finalBody = mappedBody;
        const isServer = typeof window === "undefined";
        const needsBridge = !isServer && !url.includes("localhost") && (apiConfig.provider === "Seedance" || url.includes("volces.com") || url.includes("vectorengine.ai") || url.includes("openai.com") || url.includes("googleapis.com"));

        if (needsBridge) {
          finalUrl = "/api/v1/bridge";
          finalBody = { u: toBase64(url), m: "POST", b: toBase64(JSON.stringify(mappedBody)), k: apiKey };
        } else if (isServer && finalUrl.startsWith("/")) {
          // If we are on the server and it's a relative URL, we must make it absolute
          finalUrl = `http://localhost:3000${finalUrl}`;
        }

        const response = await fetch(finalUrl, { method: 'POST', headers, body: JSON.stringify(finalBody), signal: controller.signal });
        
        const responseText = await response.text();
        clearTimeout(timeoutId);

        const contentType = response.headers.get('content-type') || '';
        if (responseText.trim().startsWith('<!DOCTYPE') || contentType.includes('text/html')) {
          const isClaude = targetModel.toLowerCase().includes('claude') || type.toLowerCase().includes('claude');
          const modelDisplayName = isClaude ? 'Claude-sonnet-5' : targetModel;
          throw new Error(`API Key 无效或接口端点配置有误 (接口返回了 HTML 页面而非 JSON，选定模型: ${modelDisplayName})`);
        }

        if (responseText.includes('Starting Server')) {
          if (i < maxRetries - 1) { 
            const waitTime = 5000 * Math.pow(1.5, i);
            await new Promise(r => setTimeout(r, waitTime)); 
            continue; 
          }
          throw new Error('服务器正在启动中，请稍后重试。');
        }

        let result: any = {};
        if (responseText && responseText.trim()) {
          try {
            result = JSON.parse(responseText);
          } catch (e) {
            if (response.ok) result = { text: responseText, isRawText: true };
            else throw new Error(`API 返回解析失败 (${response.status})`);
          }
        }

        if (!response.ok) {
          let errorMsg = result?.error?.message || result?.message || `API 请求失败 (${response.status})`;
          if (errorMsg.includes('PROHIBITED_CONTENT')) errorMsg = '内容违规，已被安全系统拦截。';

          // Detect unknown parameter 'image' error and retry without 'image' field
          const isUnknownImageParam = errorMsg.includes("Unknown parameter: 'image'") || 
                                     errorMsg.includes("unknown_parameter") || 
                                     (result?.error && result.error.param === 'image');
          if (isUnknownImageParam) {
            console.warn(`[BaseAgent] Detected 'Unknown parameter: image' error. Retrying request without 'image' column in payload...`);
            if (body) {
              delete body.image;
            }
            // Decrement i so this correction try doesn't count against maxRetries, and retry immediately
            i--;
            continue;
          }
          
          const isInvalidKey = response.status === 401 || 
                             errorMsg.toLowerCase().includes('invalid token') || 
                             errorMsg.toLowerCase().includes('invalid api key') ||
                             errorMsg.toLowerCase().includes('api_key_invalid') ||
                             errorMsg.toLowerCase().includes('invalid_api_key');

          if (isInvalidKey) {
            const isSeedance = apiConfig.provider === 'Seedance' || type === 'videoSeedance' || type === 'videoSeedanceMini';
            const targetName = isSeedance ? 'Seedance / Ark' : (targetModel || type);
            // Hint for common model mismatch errors that show up as 401/Invalid Token
            const hint = "";
            throw new Error(`API 令牌 (Token) 无效 [${targetName}]${hint}: ${errorMsg}。请在大模型设置中检查您的 API Key 或尝试更换模型（如 gemini-3.5-flash）。`);
          }
          
          const isRateLimit = response.status === 429 || errorMsg.includes('负载已饱和') || errorMsg.includes('overloaded') || errorMsg.includes('busy') || (result?.code === 'model_not_found' && errorMsg.includes('饱和'));
          if (isRateLimit) {
            if (errorMsg.includes('120 seconds')) errorMsg = '由于多次使用无效 Token，您的 IP 已被暂时封禁，请等待 120 秒后再试 (429)。';
            else if (errorMsg.includes('seconds')) errorMsg = `请求过于频繁 (429)，${errorMsg.match(/\d+ seconds/)?.[0] || '请稍后再试'}。`;
            else if (errorMsg.includes('饱和')) errorMsg = '当前分组负载饱和，上游请求过多，请稍后再试 (429)。';
            else errorMsg = '请求过于频繁或配额已耗尽 (429)，请稍后再试。';
          }
          
          const isRetryable = response.status >= 500 || isRateLimit || errorMsg.includes('saturated');
          if (isRetryable && i < maxRetries - 1) {
            // Reduce wait time for 429/Rate Limit to avoid "stuck" UI.
            // 5s, 10s, 20s backoff is more appropriate for a web app.
            const waitTime = (response.status === 429 || errorMsg.includes('负载已饱和')) 
              ? (10000 * Math.pow(2, i)) 
              : 5000 * Math.pow(2, i);
              
            console.warn(`[BaseAgent] 遇到上游拥堵 (${response.status} - ${errorMsg}), 将在 ${Math.round(waitTime/1000)}s 后重试... 第 ${i + 1}/${maxRetries} 次尝试`);
            await new Promise(r => setTimeout(r, waitTime)); 
            continue;
          }
          throw new Error(errorMsg);
        }

        result = this.applyResponseMapping(result, apiConfig.responseMapping);

        logUsage(type === 'gptImage' ? 'gpt_image_gen' : (type === 'image' ? 'image_gen' : 'text_ai'), 0, { method, model: targetModel });

        // Post-processing responses for UI compatibility
        if (method === 'generateContent' && !result.text && result.candidates?.[0]?.content?.parts?.[0]?.text) {
          result.text = result.candidates[0].content.parts.map((p: any) => p.text || '').join('');
        }

        // Support OpenAI/Third Party format response text extraction
        if (result.choices?.[0]?.message?.content !== undefined && !result.text) {
          result.text = result.choices[0].message.content;
        } else if (result.choices?.[0]?.text !== undefined && !result.text) {
          result.text = result.choices[0].text;
        }

        // Support Claude Native format response text extraction
        if (result.content && Array.isArray(result.content)) {
          const textParts = result.content
            .filter((c: any) => c.type === 'text')
            .map((c: any) => c.text || '')
            .join('');
          if (textParts && !result.text) {
            result.text = textParts;
          }
        }
        
        // Comprehensive image mapping
        if (result.data && Array.isArray(result.data)) {
          // OpenAI / DALL-E format
          result.images = result.data.map((item: any) => {
            let url = item.url;
            if (!url && item.b64_json) url = `data:image/png;base64,${item.b64_json}`;
            if (!url && typeof item === 'string' && item.startsWith('http')) url = item;
            return { url: url, revisedPrompt: item.revised_prompt || item.revisedPrompt || '' };
          });
        } else if (result.choices?.[0]?.message?.content) {
          // OpenAI-style chat response (possible multimodal image embedded)
          const content = result.choices[0].message.content;
          // Try to extract data URL or regular URL from content
          const dataUrlMatch = content.match(/data:image\/[a-zA-Z]+;base64,[a-zA-Z0-9+/=]+/);
          const markdownUrlMatch = content.match(/!\[.*?\]\((https?:\/\/[^)]+)\)/);
          const rawUrlMatch = content.match(/https?:\/\/[^\s"'<]+(?:\.png|\.jpg|\.jpeg|\.webp|\.gif)(?:\?[^\s"'<]*)?/i);
          
          if (dataUrlMatch) {
            result.images = [{ url: dataUrlMatch[0], revisedPrompt: '' }];
          } else if (markdownUrlMatch) {
            result.images = [{ url: markdownUrlMatch[1], revisedPrompt: '' }];
          } else if (rawUrlMatch) {
            result.images = [{ url: rawUrlMatch[0], revisedPrompt: '' }];
          }
        } else if (result.images && Array.isArray(result.images)) {
          // Google Imagen standard format or some proxy formats like ["url1", "url2"]
          result.images = result.images.map((item: any) => {
            if (typeof item === 'string') {
              if (item.startsWith('http') || item.startsWith('data:')) return { url: item, revisedPrompt: '' };
              return { url: '', revisedPrompt: item }; // Fallback
            }
            if (item.image?.data) return { url: `data:image/png;base64,${item.image.data}`, revisedPrompt: item.revisedPrompt || item.revised_prompt || '' };
            if (item.url) return { url: item.url, revisedPrompt: item.revisedPrompt || item.revised_prompt || '' };
            return { ...item, revisedPrompt: item.revisedPrompt || item.revised_prompt || '' };
          });
        } else if (result.url || result.image) {
          // Some simple proxy formats return { url: "..." } or { image: "..." }
          const url = result.url || result.image;
          if (typeof url === 'string' && (url.startsWith('http') || url.startsWith('data:'))) {
            result.images = [{ url, revisedPrompt: result.revised_prompt || '' }];
          }
        } else if (result.output?.images && Array.isArray(result.output.images)) {
          // Alternative Google/Vertex format
          result.images = result.output.images.map((item: any) => {
            if (item.image?.data) return { url: `data:image/png;base64,${item.image.data}` };
            if (typeof item === 'string' && item.startsWith('http')) return { url: item };
            return item;
          });
        } else if (result.candidates?.[0]?.content?.parts) {
          // Gemini Vision / Inline Data format
          const imgPart = result.candidates[0].content.parts.find((p: any) => (p.inlineData || p.inline_data));
          if (imgPart) {
            const data = imgPart.inlineData?.data || imgPart.inline_data?.data;
            const mimeType = imgPart.inlineData?.mimeType || imgPart.inline_data?.mime_type || 'image/png';
            result.images = [{ url: `data:${mimeType};base64,${data}` }];
          }
        }

        return result;
      } catch (err: any) {
        lastError = err;
        const errorMsg = err.message || String(err);
        const isPermanentError = errorMsg.includes('令牌 (Token) 无效') || 
                                 errorMsg.includes('内容违规') || 
                                 errorMsg.includes('API Key 无效') ||
                                 errorMsg.includes('配置槽') ||
                                 errorMsg.includes('未找到') ||
                                 errorMsg.includes('Unauthorized') ||
                                 errorMsg.includes('401');

        if (isPermanentError) {
          throw err; // Stop immediately for token errors
        }

        if (i < maxRetries - 1) { 
          const retryWait = (errorMsg.includes('Timeout') || errorMsg.includes('Abort')) ? 5000 : 2000;
          console.warn(`[BaseAgent] Fetch attempt ${i + 1} failed: ${errorMsg}. Retrying in ${retryWait}ms...`);
          await new Promise(r => setTimeout(r, retryWait)); 
          continue; 
        }
        throw err;
      }
    }
    throw lastError;
  }
}
