import { ExtensionAdapterDefinition, RuntimeContext } from '../types';
import { ModelRegistry } from '../registries/ModelRegistry';

class ExtensionAdapterRunnerService {
  constructor() {}

  /**
   * Run an open source adapter with the given input and context
   */
  public async run(
    adapter: ExtensionAdapterDefinition,
    input: any,
    context?: RuntimeContext
  ): Promise<any> {
    const { kind, timeoutMs = 15000 } = adapter.runtime;

    // Check permissions before running
    const permissions = adapter.permissions || [];
    if (kind === 'http' && !permissions.includes('use_network')) {
      throw new Error(`Permission denied: Adapter '${adapter.id}' requires 'use_network' permission to execute HTTP request.`);
    }
    if (['cli', 'node', 'python'].includes(kind) && !permissions.includes('run_code')) {
      throw new Error(`Permission denied: Adapter '${adapter.id}' requires 'run_code' permission to execute backend scripts.`);
    }

    switch (kind) {
      case 'prompt':
        return this.runPrompt(adapter, input, context);

      case 'http':
        return this.runHttp(adapter, input, timeoutMs);

      case 'cli':
        return this.runCliStub(adapter, input);

      case 'node':
        return this.runNodeStub(adapter, input);

      case 'python':
        return this.runPythonStub(adapter, input);

      case 'iframe':
        return this.runIframeStub(adapter, input);

      case 'worker':
        return this.runWorkerStub(adapter, input);

      default:
        throw new Error(`Unsupported extension runtime kind: ${kind}`);
    }
  }

  private async runPrompt(
    adapter: ExtensionAdapterDefinition,
    input: any,
    context?: RuntimeContext
  ): Promise<any> {
    // Prompt runner routes to the best model registered in the system
    const systemContext = context || {};
    const modelProvider = ModelRegistry.selectBest('text', systemContext);
    if (!modelProvider) {
      throw new Error('Prompt adapter failed to run: No available text model provider in ModelRegistry.');
    }

    const systemInstruction = adapter.runtime.entry || adapter.runtime.command || '';
    const userPrompt = typeof input === 'string' ? input : (input?.prompt || JSON.stringify(input));

    try {
      const response = await modelProvider.call('generateContent', {
        model: modelProvider.id,
        contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
        config: {
          systemInstruction: systemInstruction || 'You are an open source tool helper plugin.',
          temperature: 0.7
        }
      }, systemContext.config);

      const text = response.text || (response.candidates?.[0]?.content?.parts?.[0]?.text) || '';
      return {
        success: true,
        text,
        modelUsed: modelProvider.name,
        timestamp: Date.now()
      };
    } catch (err: any) {
      throw new Error(`Prompt adapter execution failed on LLM call: ${err.message || err}`);
    }
  }

  private async runHttp(
    adapter: ExtensionAdapterDefinition,
    input: any,
    timeoutMs: number
  ): Promise<any> {
    const baseUrl = adapter.runtime.baseUrl || '';
    const entry = adapter.runtime.entry || '';
    // Construct target URL safely
    const fullUrl = baseUrl.endsWith('/') || entry.startsWith('/') 
      ? `${baseUrl}${entry}` 
      : `${baseUrl}/${entry}`;
    const safeUrl = this.validateHttpAdapterUrl(fullUrl, adapter.id);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const method = input?.method || 'POST';
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(adapter.runtime.env || {}), // Optionally inject environment configurations as simple headers
        ...(input?.headers || {})
      };

      const options: RequestInit = {
        method,
        headers,
        signal: controller.signal
      };

      if (method !== 'GET' && method !== 'HEAD') {
        const bodyData = input?.body !== undefined ? input.body : input;
        options.body = typeof bodyData === 'object' ? JSON.stringify(bodyData) : String(bodyData);
      }

      const response = await fetch(safeUrl, options);
      clearTimeout(timeoutId);

      const contentType = response.headers.get('content-type') || '';
      let data: any;

      if (contentType.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      return {
        success: response.ok,
        status: response.status,
        statusText: response.statusText,
        data,
        timestamp: Date.now()
      };
    } catch (err: any) {
      clearTimeout(timeoutId);
      return {
        success: false,
        error: `HTTP request to open source endpoint failed: ${err.message || err}`,
        url: safeUrl,
        timestamp: Date.now()
      };
    }
  }

  private validateHttpAdapterUrl(rawUrl: string, adapterId: string): string {
    let parsed: URL;
    try {
      parsed = new URL(rawUrl);
    } catch {
      throw new Error(`Unsafe adapter URL: Adapter "${adapterId}" has an invalid HTTP endpoint.`);
    }

    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new Error(`Unsafe adapter URL: Adapter "${adapterId}" may only use http/https endpoints.`);
    }

    if (parsed.username || parsed.password) {
      throw new Error(`Unsafe adapter URL: Adapter "${adapterId}" must not embed credentials in the URL.`);
    }

    const host = parsed.hostname.toLowerCase();
    const blockedHosts = new Set([
      '169.254.169.254',
      'metadata.google.internal',
      'metadata',
      'kubernetes.default.svc'
    ]);

    if (blockedHosts.has(host)) {
      throw new Error(`Unsafe adapter URL: Adapter "${adapterId}" targets a blocked metadata/internal host.`);
    }

    return parsed.toString();
  }

  private async runCliStub(adapter: ExtensionAdapterDefinition, input: any): Promise<any> {
    const command = adapter.runtime.command || '';
    const args = adapter.runtime.args || [];
    
    // Inject input parameters dynamically into command args for demonstration
    const parsedArgs = args.map(arg => {
      if (arg.startsWith('${') && arg.endsWith('}')) {
        const key = arg.slice(2, -1);
        return input?.[key] !== undefined ? String(input[key]) : arg;
      }
      return arg;
    });

    return {
      success: false,
      code: 'NOT_IMPLEMENTED',
      message: `Security sandbox block: Direct CLI execution of binary [${command}] is restricted in the client container environment.`,
      simulatedCommand: `${command} ${parsedArgs.join(' ')}`,
      hint: 'In production server, this will safely run inside a gVisor/Knative secure sandbox container.',
      timestamp: Date.now()
    };
  }

  private async runNodeStub(adapter: ExtensionAdapterDefinition, input: any): Promise<any> {
    const entry = adapter.runtime.entry || '';
    return {
      success: false,
      code: 'NOT_IMPLEMENTED',
      message: `Security sandbox block: Node.js external script [${entry}] cannot be executed directly on browser clients without a trusted host daemon.`,
      hint: 'Requires local agent daemon or server side VM orchestrator.',
      timestamp: Date.now()
    };
  }

  private async runPythonStub(adapter: ExtensionAdapterDefinition, input: any): Promise<any> {
    const entry = adapter.runtime.entry || '';
    return {
      success: false,
      code: 'NOT_IMPLEMENTED',
      message: `Security sandbox block: Python script [${entry}] was not executed. Python runtime is omitted from client bundle for weight optimization.`,
      timestamp: Date.now()
    };
  }

  private async runIframeStub(adapter: ExtensionAdapterDefinition, input: any): Promise<any> {
    const baseUrl = adapter.runtime.baseUrl || '';
    return {
      success: true,
      mount: 'iframe',
      url: baseUrl,
      panelId: adapter.id,
      name: adapter.name,
      message: 'Visual viewport mounting information loaded successfully.',
      timestamp: Date.now()
    };
  }

  private async runWorkerStub(adapter: ExtensionAdapterDefinition, input: any): Promise<any> {
    return {
      success: false,
      code: 'NOT_IMPLEMENTED',
      message: 'Security sandbox block: Background WebWorker execution is in design stage. Please use HTTP webhook proxy instead.',
      timestamp: Date.now()
    };
  }
}

export const ExtensionAdapterRunner = new ExtensionAdapterRunnerService();
export default ExtensionAdapterRunner;
