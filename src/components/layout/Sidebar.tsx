
import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { 
  MessageSquare, 
  FileText, 
  Settings, 
  BookOpen, 
  Users, 
  Bot
} from 'lucide-react';

export function Sidebar() {
  const links = [
    { href: '/', label: 'Home', icon: <MessageSquare className="h-4 w-4" /> },
    { href: '/assistants', label: 'Assistants', icon: <Bot className="h-4 w-4" /> },
    { href: '/prompts', label: 'Prompts', icon: <BookOpen className="h-4 w-4" /> },
    { href: '/conversations', label: 'Conversations', icon: <Users className="h-4 w-4" /> },
    { href: '/documents', label: 'Documents', icon: <FileText className="h-4 w-4" /> },
    { href: '/settings', label: 'Settings', icon: <Settings className="h-4 w-4" /> },
  ];

  return (
    <aside className="w-56 border-r bg-background hidden md:block">
      <div className="h-16 flex items-center px-4 border-b">
        <h1 className="text-lg font-semibold tracking-tight">RAG Interface</h1>
      </div>
      
      <nav className="flex flex-col gap-1 p-2">
        {links.map((link) => (
          <NavLink
            key={link.href}
            to={link.href}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                isActive 
                  ? 'bg-accent text-accent-foreground' 
                  : 'hover:bg-accent hover:text-accent-foreground'
              )
            }
          >
            {link.icon}
            <span>{link.label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
