# XiaoLuo Extensions

This directory is the file-based home for plug-and-play extension packages.

Each package should live in one of the typed folders and include a `manifest.json`:

```text
extensions/
  skills/
  plugins/
  agents/
  models/
  adapters/
  workflows/
  templates/
  bundles/
```

The browser runtime cannot scan local files directly, so file packages are represented through `ExtensionHub` and `UserExtensionStore` until a trusted local/server extension loader is connected.

