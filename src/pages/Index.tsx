import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { ChatInput } from '@/components/chat/ChatInput';
import { ChatOutput } from '@/components/chat/ChatOutput';
import { SourcePanel } from '@/components/sources/SourcePanel';
import { DocumentUpload } from '@/components/documents/DocumentUpload';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from "@/components/ui/use-toast";
import { v4 } from '@/lib/uuid';
import { useNavigate } from 'react-router-dom';
import { Settings } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
}

interface Source {
  id: string;
  title: string;
  url?: string;
  content: string;
  documentName?: string;
  relevanceScore: number; 
}

const Index = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [sources, setSources] = useState<Source[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDocumentUpload, setShowDocumentUpload] = useState(false);
  const [userDocuments, setUserDocuments] = useState<any[]>([]);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  useEffect(() => {
    if (user) {
      fetchUserDocuments();
    }
  }, [user]);
  
  const fetchUserDocuments = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('document_id, name')
        .eq('user_id', user.id)
        .order('upload_date', { ascending: false });
        
      if (error) throw error;
      
      setUserDocuments(data || []);
    } catch (error) {
      console.error('Error fetching documents:', error);
    }
  };
  
  const handleSendMessage = async (message: string) => {
    const newMessage: Message = {
      id: v4(),
      content: message,
      role: 'user',
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, newMessage]);
    setIsLoading(true);
    
    try {
      let apiEndpoint = null;
      let apiKey = null;
      let model = 'gpt-4o-mini';
      let provider = 'OpenAI';
      let sourcesSettings = {
        useDocuments: true,
        useKnowledgeBase: true,
        useExternalSearch: false
      };
      let requestTemplate = null;
      let temperature = 0.7;
      let maxTokens = 2048;
      let instructions = "You are a helpful assistant that provides accurate and concise information.";
      
      if (user) {
        const { data: settingsData } = await supabase
          .from('user_settings')
          .select('*')
          .eq('user_id', user.id)
          .single();
          
        if (settingsData) {
          apiEndpoint = settingsData.api_endpoint;
          apiKey = settingsData.api_key;
          model = settingsData.model || 'gpt-4o-mini';
          temperature = settingsData.temperature || 0.7;
          maxTokens = settingsData.max_tokens || 2048;
          
          instructions = (settingsData as any).instructions || instructions;
          requestTemplate = (settingsData as any).request_template || null;
          
          if (settingsData.response_sources) {
            const sourcesData = settingsData.response_sources as Record<string, unknown>;
            sourcesSettings = {
              useDocuments: typeof sourcesData.useDocuments === 'boolean' ? sourcesData.useDocuments : true,
              useKnowledgeBase: typeof sourcesData.useKnowledgeBase === 'boolean' ? sourcesData.useKnowledgeBase : true,
              useExternalSearch: typeof sourcesData.useExternalSearch === 'boolean' ? sourcesData.useExternalSearch : false
            };
          }
        }
        
        const { data: endpointData } = await supabase
          .from('api_endpoints')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .single();
          
        if (endpointData) {
          provider = endpointData.provider || 'OpenAI';
          apiEndpoint = endpointData.api_endpoint;
          apiKey = endpointData.api_key;
          model = endpointData.model || model;
          
          if ((endpointData as any).request_template) {
            requestTemplate = (endpointData as any).request_template;
          }
        }
      }
      
      const documentIds = userDocuments.length > 0 ? userDocuments.map(doc => doc.document_id) : [];
      
      console.log("Sending request with provider:", provider);
      console.log("API Endpoint:", apiEndpoint);
      console.log("Model:", model);
      console.log("Using documents:", documentIds.length);
      
      const { data, error } = await supabase.functions.invoke('create-assistant-completion', {
        body: {
          prompt: message,
          model: model,
          temperature: temperature,
          top_p: 1,
          max_tokens: maxTokens,
          instructions: instructions,
          sources: sourcesSettings,
          documentIds: documentIds,
          requestTemplate: requestTemplate,
          apiEndpoint: apiEndpoint,
          apiKey: apiKey,
          provider: provider
        }
      });
      
      if (error) {
        throw new Error(`Edge function error: ${error.message}`);
      }
      
      let assistantContent = "";
      console.log("Response data:", data);
      
      if (provider === 'OpenAI') {
        assistantContent = data?.choices?.[0]?.message?.content || 
                         "I'm sorry, I couldn't process your request at this time.";
      } else if (provider === 'Anthropic') {
        assistantContent = data?.content?.[0]?.text || 
                         "I'm sorry, I couldn't process your request at this time.";
      } else if (provider === 'Google') {
        assistantContent = data?.candidates?.[0]?.content?.parts?.[0]?.text || 
                         "I'm sorry, I couldn't process your request at this time.";
      } else if (provider === 'Cohere') {
        assistantContent = data?.text || 
                         "I'm sorry, I couldn't process your request at this time.";
      } else if (provider === 'Custom') {
        assistantContent = data?.choices?.[0]?.message?.content || 
                         data?.content?.[0]?.text ||
                         data?.text ||
                         data?.response ||
                         data?.output ||
                         data?.result ||
                         data?.answer ||
                         "I'm sorry, I couldn't process your request at this time.";
      } else {
        assistantContent = data?.choices?.[0]?.message?.content || 
                         data?.content?.[0]?.text ||
                         data?.text ||
                         data?.response ||
                         "I'm sorry, I couldn't process your request at this time.";
      }
      
      const assistantResponse: Message = {
        id: v4(),
        content: assistantContent,
        role: 'assistant',
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, assistantResponse]);
      
      if (data.sources && Array.isArray(data.sources)) {
        setSources(data.sources);
      } else if (sourcesSettings.useDocuments && documentIds.length > 0) {
        const documentSources: Source[] = [];
        
        for (const docId of documentIds) {
          try {
            const { data: docData } = await supabase
              .from('documents')
              .select('name, content')
              .eq('document_id', docId)
              .single();
              
            if (docData && docData.content) {
              documentSources.push({
                id: v4(),
                title: docData.name,
                content: docData.content,
                documentName: docData.name,
                relevanceScore: 95
              });
            }
          } catch (docError) {
            console.error('Error fetching document content:', docError);
          }
        }
        
        if (documentSources.length > 0) {
          setSources(documentSources);
        }
      }
      
    } catch (error) {
      console.error('Error processing message:', error);
      toast({
        title: "Error",
        description: `Failed to process your message: ${error.message}`,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleFileUpload = (files: File[]) => {
    toast({
      title: "Files Uploaded",
      description: `Successfully uploaded ${files.length} document${files.length === 1 ? '' : 's'}.`,
    });
    setShowDocumentUpload(false);
    fetchUserDocuments();
  };
  
  return (
    <MainLayout rightPanel={sources.length > 0 ? <SourcePanel sources={sources} /> : undefined}>
      <div className="flex flex-col h-[calc(100vh-48px)]">
        <div className="flex-1 overflow-y-auto subtle-scroll pb-10">
          {showDocumentUpload ? (
            <Card className="max-w-xl w-full mx-auto my-10 p-6 animate-fade-in">
              <DocumentUpload 
                onUpload={handleFileUpload}
              />
            </Card>
          ) : (
            <>
              <div className="flex justify-end mb-4 pr-4">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex items-center gap-1.5"
                      onClick={() => navigate('/settings?tab=preferences')}
                    >
                      <Settings className="h-4 w-4" />
                      <span className="text-xs font-normal">Preferences</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p className="max-w-xs text-xs">
                      Customize AI response sources, conversation options, and citation preferences
                    </p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <ChatOutput messages={messages} isLoading={isLoading} />
            </>
          )}
        </div>
        
        <div className="pt-3 border-t border-border">
          {!showDocumentUpload ? (
            <div className="max-w-4xl mx-auto">
              <ChatInput 
                onSendMessage={handleSendMessage} 
                onFileUpload={() => setShowDocumentUpload(true)}
                isLoading={isLoading}
              />
            </div>
          ) : (
            <div className="flex justify-center">
              <button
                onClick={() => setShowDocumentUpload(false)}
                className="text-sm text-primary hover:underline transition-colors"
              >
                Cancel Upload & Return to Chat
              </button>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
};

export default Index;
