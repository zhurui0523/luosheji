export const modelConnection = {
  "id": "videoSeedance",
  "name": "RH-SD2.0",
  "displayName": "RH-SD2.0",
  "provider": "Seedance",
  "protocol": "seedance",
  "endpoint": "https://www.runninghub.cn/openapi/v2/rhart-video/sparkvideo-2.0/multimodal-video",
  "path": "",
  "model": "seedance2.0",
  "apiKeyRef": "user:1:api_config:videoSeedance",
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
    "sourceConfigKey": "videoSeedance",
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
