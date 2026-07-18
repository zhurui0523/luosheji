export const modelConnection = {
  "id": "gptText",
  "name": "gpt-5.6-sol",
  "displayName": "gpt-5.6-sol",
  "provider": "OpenAI",
  "protocol": "openai",
  "endpoint": "https://api.openai.com/v1",
  "path": "",
  "model": "gpt-5.6-sol",
  "apiKeyRef": "user:1:api_config:gptText",
  "capabilityKinds": [
    "text"
  ],
  "modelType": "text",
  "enabled": true,
  "isCustom": false,
  "metadata": {
    "secretStoredIn": "user_preferences.api_config",
    "sourceConfigKey": "gptText"
  }
};
export default modelConnection;
