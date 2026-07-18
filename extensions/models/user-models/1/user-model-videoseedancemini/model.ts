export const modelConnection = {
  "id": "videoSeedanceMini",
  "name": "RH-SD2.0-mini",
  "displayName": "RH-SD2.0-mini",
  "provider": "Seedance",
  "protocol": "seedance",
  "endpoint": "https://www.runninghub.cn/openapi/v2/rhart-video/sparkvideo-2.0-mini/multimodal-video",
  "path": "",
  "model": "seedance-mini",
  "apiKeyRef": "user:1:api_config:videoSeedanceMini",
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
    "sourceConfigKey": "videoSeedanceMini",
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
