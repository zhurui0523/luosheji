import { RuntimeArtifact, Task } from '../types';

class ArtifactFactoryService {
  createFromTask(task: Task, output: any, options: { idPrefix?: string; status?: string } = {}): RuntimeArtifact {
    const artifactType = this.inferArtifactType(task, output);
    const timestamp = Date.now();

    return {
      id: `${options.idPrefix || 'result'}_${task.id}_${timestamp}`,
      taskId: task.id,
      goalId: task.goalId,
      type: artifactType,
      title: task.title || task.name,
      status: options.status || 'success',
      content: this.inferContent(artifactType, output),
      url: output?.url || output?.imageUrl || output?.videoUrl || output?.ossUrl,
      imageUrl: artifactType === 'image' ? (output?.url || output?.imageUrl || output?.ossUrl) : undefined,
      videoUrl: artifactType === 'video' ? (output?.url || output?.videoUrl || output?.ossUrl) : undefined,
      ossUrl: output?.ossUrl,
      prompt: task.prompt,
      revisedPrompt: output?.revisedPrompt,
      config: {
        title: task.name || task.title,
        skillId: task.skillId,
        agentId: task.agentId || task.assignedActorId,
        modelId: task.modelId,
        pluginId: task.pluginId,
        adapterId: (task as any).adapterId,
        toolId: (task as any).toolId
      },
      metadata: {
        taskType: task.type,
        providerOutputType: typeof output
      },
      timestamp,
      createdAt: timestamp
    };
  }

  private inferArtifactType(task: Task, output: any): RuntimeArtifact['type'] {
    if (task.type === 'script' || task.type === 'code') return 'code';
    if (task.type === 'image' || output?.imageUrl) return 'image';
    if (task.type === 'video' || output?.videoUrl) return 'video';
    if (task.type === 'audio') return 'audio';
    if (task.type === 'ui' || task.type === 'plugin-ui') return 'plugin-ui';
    if (task.type === 'json' || (output && typeof output === 'object' && !output.url)) return 'json';
    return 'text';
  }

  private inferContent(type: RuntimeArtifact['type'], output: any): any {
    if (type === 'image' || type === 'video') {
      return output?.revisedPrompt || output?.prompt || output;
    }
    if (output?.text !== undefined) {
      return output.text;
    }
    return output;
  }
}

export const ArtifactFactory = new ArtifactFactoryService();

