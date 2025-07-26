"use client";

import React, { useState, useRef, useEffect } from "react";

interface ResizablePanelGroupProps {
  direction: "horizontal" | "vertical";
  className?: string;
  children: React.ReactNode;
}

interface ResizablePanelProps {
  defaultSize?: number;
  minSize?: number;
  maxSize?: number;
  children: React.ReactNode;
}

interface ResizableHandleProps {
  withHandle?: boolean;
}

const ResizablePanelContext = React.createContext<{
  direction: "horizontal" | "vertical";
  panels: Array<{ size: number; minSize: number; maxSize: number }>;
  setPanelSize: (index: number, size: number) => void;
}>({
  direction: "horizontal",
  panels: [],
  setPanelSize: () => {},
});

export function ResizablePanelGroup({ 
  direction, 
  className = "", 
  children 
}: ResizablePanelGroupProps) {
  const [panels, setPanels] = useState<Array<{ size: number; minSize: number; maxSize: number }>>([]);
  
  const childrenArray = React.Children.toArray(children);
  const panelChildren = childrenArray.filter(child => 
    React.isValidElement(child) && child.type === ResizablePanel
  );
  
  useEffect(() => {
    // Initialize panels with default sizes
    const totalPanels = panelChildren.length;
    const defaultSize = 100 / totalPanels;
    
    setPanels(panelChildren.map((child: any) => ({
      size: child.props.defaultSize || defaultSize,
      minSize: child.props.minSize || 20,
      maxSize: child.props.maxSize || 80,
    })));
  }, [panelChildren.length]);

  const setPanelSize = (index: number, size: number) => {
    setPanels(prev => prev.map((panel, i) => 
      i === index ? { ...panel, size } : panel
    ));
  };

  return (
    <ResizablePanelContext.Provider value={{ direction, panels, setPanelSize }}>
      <div className={`flex ${direction === "horizontal" ? "flex-row" : "flex-col"} ${className}`}>
        {children}
      </div>
    </ResizablePanelContext.Provider>
  );
}

export function ResizablePanel({ 
  defaultSize, 
  minSize = 20, 
  maxSize = 80, 
  children 
}: ResizablePanelProps) {
  const { direction, panels } = React.useContext(ResizablePanelContext);
  const panelIndex = useRef<number>(0);
  
  // Find this panel's index in the context
  useEffect(() => {
    // This is a simplified approach - in a real implementation you'd want better tracking
  }, []);

  const size = panels[panelIndex.current]?.size || defaultSize || 50;

  return (
    <div 
      className="flex-shrink-0"
      style={{
        [direction === "horizontal" ? "width" : "height"]: `${size}%`,
      }}
    >
      {children}
    </div>
  );
}

export function ResizableHandle({ withHandle = false }: ResizableHandleProps) {
  const { direction } = React.useContext(ResizablePanelContext);
  const [isDragging, setIsDragging] = useState(false);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    e.preventDefault();
  };

  useEffect(() => {
    const handleMouseUp = () => setIsDragging(false);
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      // Handle resize logic here
    };

    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging]);

  return (
    <div
      className={`
        ${direction === "horizontal" ? "w-1 cursor-col-resize" : "h-1 cursor-row-resize"}
        bg-gray-200 hover:bg-gray-300 transition-colors
        ${isDragging ? "bg-blue-400" : ""}
        ${withHandle ? "relative" : ""}
      `}
      onMouseDown={handleMouseDown}
    >
      {withHandle && (
        <div className={`
          absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2
          ${direction === "horizontal" ? "w-1 h-6" : "w-6 h-1"}
          bg-gray-400 rounded-full
        `} />
      )}
    </div>
  );
}