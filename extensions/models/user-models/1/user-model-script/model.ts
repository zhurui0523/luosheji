export const modelConnection = {
  "id": "script",
  "name": "gemini-3.5-flash",
  "displayName": "gemini-3.5-flash",
  "provider": "Google gemini",
  "protocol": "google",
  "endpoint": "https://api.vectorengine.ai/v1beta/models/gemini-3.5-flash:generateContent",
  "path": "",
  "model": "gemini-3.5-flash",
  "apiKeyRef": "user:1:api_config:script",
  "capabilityKinds": [
    "text"
  ],
  "modelType": "text",
  "enabled": true,
  "isCustom": false,
  "metadata": {
    "secretStoredIn": "user_preferences.api_config",
    "sourceConfigKey": "script"
  }
};
export default modelConnection;
