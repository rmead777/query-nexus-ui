
import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  MessageSquare, 
  FileText, 
  Save, 
  Settings, 
  PanelLeft,
  FileUp
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SidebarProps {
  collapsed: boolean;
}

interface NavItem {
  title: string;
  icon: React.ElementType;
  path: string;
}

export function Sidebar({ collapsed }: SidebarProps) {
  const location = useLocation();
  
  const navItems: NavItem[] = [
    {
      title: 'Chat',
      icon: MessageSquare,
      path: '/'
    },
    {
      title: 'Master Prompts',
      icon: PanelLeft,
      path: '/prompts'
    },
    {
      title: 'Saved Conversations',
      icon: Save,
      path: '/conversations'
    },
    {
      title: 'Documents',
      icon: FileText,
      path: '/documents'
    },
    {
      title: 'Settings',
      icon: Settings,
      path: '/settings'
    }
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center h-16 px-4 border-b border-sidebar-border">
        {!collapsed ? (
          <h1 className="text-xl font-semibold tracking-tight">
            Insight<span className="text-primary">AI</span>
          </h1>
        ) : (
          <div className="mx-auto">
            <span className="text-xl font-bold text-primary">I</span>
          </div>
        )}
      </div>
      
      {/* Navigation */}
      <nav className="flex-1 py-6 px-2">
        <ul className="space-y-1">
          {navItems.map((item) => (
            <li key={item.path}>
              <Link
                to={item.path}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 transition-all duration-200 hover:bg-sidebar-accent group",
                  location.pathname === item.path ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground/80"
                )}
              >
                <item.icon className={cn(
                  "h-5 w-5 transition-transform", 
                  !collapsed && location.pathname === item.path ? "text-primary" : "",
                  collapsed ? "mx-auto" : ""
                )} />
                {!collapsed && (
                  <span className="text-sm font-medium">{item.title}</span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      
      {/* Footer */}
      <div className="border-t border-sidebar-border p-4">
        {!collapsed ? (
          <div className="text-xs text-sidebar-foreground/60 text-center">
            InsightAI v1.0
          </div>
        ) : null}
      </div>
    </div>
  );
}
