export const modelConnection = {
  "id": "videoOmni",
  "name": "omni-flash",
  "displayName": "omni-flash",
  "provider": "Third Party",
  "protocol": "openai",
  "endpoint": "https://api.vectorengine.ai",
  "path": "",
  "model": "omni-flash",
  "apiKeyRef": "user:1:api_config:videoOmni",
  "capabilityKinds": [
    "video"
  ],
  "modelType": "video",
  "enabled": true,
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
    "sourceConfigKey": "videoOmni",
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
