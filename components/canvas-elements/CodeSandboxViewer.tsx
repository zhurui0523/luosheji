import React from "react";
import { WebSandbox } from "../os/WebSandbox";

interface CodeSandboxViewerProps {
  code: string;
}

export const CodeSandboxViewer: React.FC<CodeSandboxViewerProps> = ({ code }) => {
  return (
    <div className="w-full h-full bg-zinc-950 overflow-hidden flex flex-col no-drag p-2 rounded-2xl relative" onPointerDown={e => e.stopPropagation()} onClick={e => e.stopPropagation()}>
      <WebSandbox code={code} />
    </div>
  );
};
