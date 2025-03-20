
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sidebar } from '@/components/layout/Sidebar';
import { useAuth } from '@/contexts/AuthContext';
import { UserAvatar } from '@/components/UserAvatar';
import { useIsMobile } from '@/hooks/use-mobile';

interface MainLayoutProps {
  children: React.ReactNode;
  rightPanel?: React.ReactNode;
}

export function MainLayout({ children, rightPanel }: MainLayoutProps) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  
  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <header className="border-b bg-background z-10 sticky top-0 hidden md:block">
          <div className="h-16 flex items-center justify-end px-4">
            <UserAvatar />
          </div>
        </header>
        <main className="flex-1 p-4 md:p-6 overflow-auto flex flex-col md:flex-row">
          <div className={`${rightPanel && !isMobile ? 'flex-1 pr-4' : 'w-full'}`}>
            {children}
          </div>
          {rightPanel && !isMobile && (
            <div className="w-80 border-l pl-4 hidden md:block">
              {rightPanel}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
