export const modelConnection = {
  "id": "gptImage",
  "name": "gpt-image-2",
  "displayName": "gpt-image-2",
  "provider": "Third Party",
  "protocol": "openai",
  "endpoint": "https://torchai.ai/v1/images/generations/",
  "path": "",
  "model": "gpt-image-2",
  "apiKeyRef": "user:1:api_config:gptImage",
  "capabilityKinds": [
    "image"
  ],
  "modelType": "image",
  "enabled": true,
  "isCustom": false,
  "defaultGenerationSettings": {
    "image": {
      "aspectRatio": "1:1",
      "imageSize": "1K"
    }
  },
  "metadata": {
    "secretStoredIn": "user_preferences.api_config",
    "sourceConfigKey": "gptImage",
    "defaultGenerationSettings": {
      "image": {
        "aspectRatio": "1:1",
        "imageSize": "1K"
      }
    }
  }
};
export default modelConnection;
