
import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { 
  MessageSquare, 
  FileText, 
  Settings, 
  BookOpen, 
  Users, 
  Bot,
  Menu
} from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useState } from 'react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

export function Sidebar() {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  
  const links = [
    { href: '/', label: 'Home', icon: <MessageSquare className="h-4 w-4" /> },
    { href: '/assistants', label: 'Assistants', icon: <Bot className="h-4 w-4" /> },
    { href: '/prompts', label: 'Prompts', icon: <BookOpen className="h-4 w-4" /> },
    { href: '/conversations', label: 'Conversations', icon: <Users className="h-4 w-4" /> },
    { href: '/documents', label: 'Documents', icon: <FileText className="h-4 w-4" /> },
    { href: '/settings', label: 'Settings', icon: <Settings className="h-4 w-4" /> },
  ];

  const SidebarContent = () => (
    <nav className="flex flex-col gap-1 p-2">
      {links.map((link) => (
        <NavLink
          key={link.href}
          to={link.href}
          onClick={() => isMobile && setOpen(false)}
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
  );

  if (isMobile) {
    return (
      <>
        <div className="h-16 md:hidden flex items-center px-4 border-b">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <button className="p-2 rounded-md hover:bg-accent">
                <Menu className="h-5 w-5" />
              </button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0">
              <div className="h-16 flex items-center px-4 border-b">
                <h1 className="text-lg font-semibold tracking-tight">RAG Interface</h1>
              </div>
              <SidebarContent />
            </SheetContent>
          </Sheet>
          <h1 className="text-lg font-semibold tracking-tight ml-2">RAG Interface</h1>
        </div>
      </>
    );
  }

  return (
    <aside className="w-56 border-r bg-background hidden md:block">
      <div className="h-16 flex items-center px-4 border-b">
        <h1 className="text-lg font-semibold tracking-tight">RAG Interface</h1>
      </div>
      <SidebarContent />
    </aside>
  );
}
