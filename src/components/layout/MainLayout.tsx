
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sidebar } from '@/components/layout/Sidebar';
import { useAuth } from '@/contexts/AuthContext';
import { UserAvatar } from '@/components/UserAvatar';

interface MainLayoutProps {
  children: React.ReactNode;
  rightPanel?: React.ReactNode;
}

export function MainLayout({ children, rightPanel }: MainLayoutProps) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  
  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <header className="border-b bg-background z-10 sticky top-0">
          <div className="h-16 flex items-center justify-end px-4">
            <UserAvatar />
          </div>
        </header>
        <main className="flex-1 p-4 md:p-6 overflow-auto flex">
          <div className={`${rightPanel ? 'flex-1 pr-4' : 'w-full'}`}>
            {children}
          </div>
          {rightPanel && (
            <div className="w-80 border-l pl-4 hidden md:block">
              {rightPanel}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
