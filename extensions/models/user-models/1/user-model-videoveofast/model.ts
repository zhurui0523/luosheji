export const modelConnection = {
  "id": "videoVeoFast",
  "name": "veo-3.1-fast-generate-preview",
  "provider": "Google",
  "protocol": "google",
  "endpoint": "https://generativelanguage.googleapis.com",
  "path": "/v1beta/models/veo-3.1-fast-generate-preview:generateVideos",
  "model": "veo-3.1-fast-generate-preview",
  "apiKeyRef": "user:1:api_config:videoVeoFast",
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
    "sourceConfigKey": "videoVeoFast",
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
