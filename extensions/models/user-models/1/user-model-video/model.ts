export const modelConnection = {
  "id": "video",
  "name": "veo-3.1-generate-preview",
  "provider": "Google",
  "protocol": "google",
  "endpoint": "https://generativelanguage.googleapis.com",
  "path": "/v1beta/models/veo-3.1-generate-preview:generateVideos",
  "model": "veo-3.1-generate-preview",
  "apiKeyRef": "user:1:api_config:video",
  "capabilityKinds": [
    "video"
  ],
  "modelType": "video",
  "enabled": false,
  "isCustom": false,
  "defaultGenerationSettings": {
    "video": {
      "videoMode": "all-around",
      "duration": "5",
      "aspectRatio": "16:9",
      "resolution": "720p"
    }
  },
  "metadata": {
    "secretStoredIn": "user_preferences.api_config",
    "sourceConfigKey": "video",
    "defaultGenerationSettings": {
      "video": {
        "videoMode": "all-around",
        "duration": "5",
        "aspectRatio": "16:9",
        "resolution": "720p"
      }
    }
  }
};
export default modelConnection;
