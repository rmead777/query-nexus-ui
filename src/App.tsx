
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";

import Index from "./pages/Index";
import Prompts from "./pages/Prompts";
import Conversations from "./pages/Conversations";
import Documents from "./pages/Documents";
import Settings from "./pages/Settings";
import Auth from "./pages/Auth";
import Assistants from "./pages/Assistants";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// Wrapper component to handle tab redirects
const SettingsWithTabRedirect = () => {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const tab = searchParams.get('tab');
  
  if (tab && ['preferences', 'api'].includes(tab)) {
    // Tab parameter exists and is valid, just render Settings
    return <Settings />;
  }
  
  // No tab parameter or invalid tab, redirect to preferences tab
  return <Navigate to="/settings?tab=preferences" replace />;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/prompts" element={<Prompts />} />
            <Route path="/conversations" element={<Conversations />} />
            <Route path="/documents" element={<Documents />} />
            <Route path="/assistants" element={<Assistants />} />
            <Route path="/settings" element={<SettingsWithTabRedirect />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
