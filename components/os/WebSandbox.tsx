import React, { useEffect, useRef, useState } from 'react';

interface WebSandboxProps {
  code: string;
  className?: string;
  onMessage?: (message: any) => void;
  context?: any;
}

export const WebSandbox: React.FC<WebSandboxProps> = ({ code, className, onMessage, context }) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!iframeRef.current) return;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <script>
            window.addEventListener('error', function(event) {
              window.parent.postMessage({ type: 'error', message: event.message }, '*');
            });
            window.addEventListener('unhandledrejection', function(event) {
              window.parent.postMessage({ type: 'error', message: event.reason?.message || 'Unknown error' }, '*');
            });
          </script>
          <script type="importmap">
            {
              "imports": {
                "react": "https://esm.sh/react@18.2.0",
                "react-dom/client": "https://esm.sh/react-dom@18.2.0/client",
                "react-dom": "https://esm.sh/react-dom@18.2.0",
                "lucide-react": "https://esm.sh/lucide-react@0.263.1",
                "framer-motion": "https://esm.sh/framer-motion@10.16.4",
                "recharts": "https://esm.sh/recharts@2.8.0",
                "three": "https://esm.sh/three@0.150.0",
                "three/addons/": "https://esm.sh/three@0.150.0/examples/jsm/",
                "clsx": "https://esm.sh/clsx@2.0.0",
                "tailwind-merge": "https://esm.sh/tailwind-merge@1.14.0",
                "motion/react": "https://esm.sh/framer-motion@11.0.0"
              }
            }
          </script>
          <script src="https://cdn.tailwindcss.com"></script>
          <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
          <script type="module">
            import * as React from 'react';
            import * as ReactDOMClient from 'react-dom/client';
            import * as ReactDOM from 'react-dom';
            import * as LucideReact from 'lucide-react';
            
            window.React = React;
            window.ReactDOM = { ...ReactDOM, ...ReactDOMClient };
            window.LucideReact = LucideReact;
            window.pluginContext = ${JSON.stringify(context || {})};
          </script>
          <style>
            body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
          </style>
        </head>
        <body>
          <div id="root"></div>
          <script type="text/babel" data-type="module">
            ${code}
          </script>
        </body>
      </html>
    `;

    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    iframeRef.current.src = url;

    return () => URL.revokeObjectURL(url);
  }, [code]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'error') {
        setError(event.data.message);
      } else if (onMessage) {
        onMessage(event.data);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onMessage]);

  return (
    <div className={`relative flex flex-col w-full h-full border border-gray-200 rounded-lg ${className || ""} overflow-hidden bg-white transition-all duration-300 group`}>
      {error && (
        <div className="absolute top-0 left-0 w-full bg-red-100 text-red-700 p-2 text-xs z-10 break-words">
          Sandbox Error: {error}
        </div>
      )}
      <iframe
        ref={iframeRef}
        className="w-full h-full bg-white border-none"
        sandbox="allow-scripts allow-same-origin"
        title="Web Sandbox"
      />
    </div>
  );
};
