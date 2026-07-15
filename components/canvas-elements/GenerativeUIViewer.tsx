import React from "react";
import { GenerativeUI } from "../os/GenerativeUI";

interface GenerativeUIViewerProps {
  intent: string;
  uiSchema: string;
}

export const GenerativeUIViewer: React.FC<GenerativeUIViewerProps> = ({ intent, uiSchema }) => {
  return (
    <div className="w-full h-full bg-white overflow-hidden flex flex-col no-drag p-2 rounded-2xl relative" onPointerDown={e => e.stopPropagation()} onClick={e => e.stopPropagation()}>
      <GenerativeUI intent={intent} uiSchema={uiSchema} />
    </div>
  );
};
