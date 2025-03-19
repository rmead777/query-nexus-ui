
import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MainLayoutProps {
  children: React.ReactNode;
  rightPanel?: React.ReactNode;
}

export function MainLayout({ children, rightPanel }: MainLayoutProps) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isRightPanelCollapsed, setIsRightPanelCollapsed] = useState(false);
  
  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      {/* Sidebar */}
      <div
        className={cn(
          "relative h-full transition-all duration-300 ease-in-out bg-sidebar text-sidebar-foreground",
          isSidebarCollapsed ? "w-[60px]" : "w-[280px]"
        )}
      >
        <Sidebar collapsed={isSidebarCollapsed} />
        
        {/* Toggle Button */}
        <button
          onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          className="absolute top-[50%] -right-3 z-10 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full bg-background border border-border shadow-md transition-all hover:bg-secondary"
          aria-label={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isSidebarCollapsed ? (
            <ChevronRight className="h-3 w-3" />
          ) : (
            <ChevronLeft className="h-3 w-3" />
          )}
        </button>
      </div>
      
      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <main className="relative flex flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto subtle-scroll p-6">
            {children}
          </div>
          
          {/* Right Panel (Sources) */}
          {rightPanel && (
            <>
              <div
                className={cn(
                  "h-full border-l border-border transition-all duration-300 ease-in-out bg-card",
                  isRightPanelCollapsed ? "w-[60px]" : "w-[320px]"
                )}
              >
                {!isRightPanelCollapsed ? (
                  <div className="h-full animate-fade-in">
                    {rightPanel}
                  </div>
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <span className="vertical-text text-xs font-medium text-muted-foreground">
                      Sources
                    </span>
                  </div>
                )}
                
                {/* Toggle Button */}
                <button
                  onClick={() => setIsRightPanelCollapsed(!isRightPanelCollapsed)}
                  className="absolute top-[50%] -left-3 z-10 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full bg-background border border-border shadow-md transition-all hover:bg-secondary"
                  aria-label={isRightPanelCollapsed ? "Expand sources" : "Collapse sources"}
                >
                  {isRightPanelCollapsed ? (
                    <ChevronLeft className="h-3 w-3" />
                  ) : (
                    <ChevronRight className="h-3 w-3" />
                  )}
                </button>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
