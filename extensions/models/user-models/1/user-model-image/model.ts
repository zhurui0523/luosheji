export const modelConnection = {
  "id": "image",
  "name": "nano banana2",
  "displayName": "nano banana2",
  "provider": "Third Party",
  "protocol": "google",
  "endpoint": "https://api.vectorengine.ai/v1beta/models/gemini-3.1-flash-image:generateContent",
  "path": "",
  "model": "gemini-3.1-flash-image",
  "apiKeyRef": "user:1:api_config:image",
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
    "sourceConfigKey": "image",
    "defaultGenerationSettings": {
      "image": {
        "aspectRatio": "1:1",
        "imageSize": "1K"
      }
    }
  }
};
export default modelConnection;
