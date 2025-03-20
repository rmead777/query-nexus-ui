import { useState } from 'react';
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
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();
  
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
      // First, fetch user settings to get API endpoint, key, model, etc.
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
          instructions = settingsData.instructions || instructions;
          requestTemplate = settingsData.request_template || null;
          
          if (settingsData.response_sources) {
            const sourcesData = settingsData.response_sources as Record<string, unknown>;
            sourcesSettings = {
              useDocuments: typeof sourcesData.useDocuments === 'boolean' ? sourcesData.useDocuments : true,
              useKnowledgeBase: typeof sourcesData.useKnowledgeBase === 'boolean' ? sourcesData.useKnowledgeBase : true,
              useExternalSearch: typeof sourcesData.useExternalSearch === 'boolean' ? sourcesData.useExternalSearch : false
            };
          }
        }
        
        // Get provider info from active endpoint if available
        const { data: endpointData } = await supabase
          .from('api_endpoints')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .single();
          
        if (endpointData) {
          provider = endpointData.provider || 'OpenAI';
          
          // If endpoint has a custom request template, use it
          if (endpointData.request_template) {
            requestTemplate = endpointData.request_template;
          }
        }
      }
      
      // Call the create-assistant-completion edge function
      const { data, error } = await supabase.functions.invoke('create-assistant-completion', {
        body: {
          prompt: message,
          model: model,
          temperature: temperature,
          top_p: 1,
          max_tokens: maxTokens,
          instructions: instructions,
          sources: sourcesSettings,
          documentIds: [], // Add document IDs here if needed
          requestTemplate: requestTemplate,
          apiEndpoint: apiEndpoint,
          apiKey: apiKey,
          provider: provider
        }
      });
      
      if (error) {
        throw new Error(`Edge function error: ${error.message}`);
      }
      
      // Extract the assistant's response based on provider format
      let assistantContent = "";
      
      if (requestTemplate) {
        // Handle different response formats based on provider
        if (provider === 'OpenAI' || provider === 'Custom') {
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
        } else {
          // Default fallback - try to extract content from common response formats
          assistantContent = data?.choices?.[0]?.message?.content || 
                           data?.content?.[0]?.text ||
                           data?.text ||
                           data?.response ||
                           "I'm sorry, I couldn't process your request at this time.";
        }
      } else {
        // Default OpenAI format
        assistantContent = data?.choices?.[0]?.message?.content || 
                          "I'm sorry, I couldn't process your request at this time.";
      }
      
      // Add the assistant response to messages
      const assistantResponse: Message = {
        id: v4(),
        content: assistantContent,
        role: 'assistant',
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, assistantResponse]);
      
      // Generate sources if needed (this is a placeholder - in a real implementation,
      // sources would come from the AI service or your vector database)
      if (sourcesSettings.useDocuments) {
        const newSources: Source[] = [
          {
            id: v4(),
            title: "Introduction to RAG Systems",
            content: "Retrieval-Augmented Generation (RAG) is an AI framework that enhances large language model outputs by retrieving relevant information from external sources before generating a response.",
            documentName: "AI Architecture Guide.pdf",
            relevanceScore: 95
          },
          {
            id: v4(),
            title: "Implementing Vector Databases",
            content: "Vector databases store embeddings, which are numerical representations of data like text, images, or audio that capture semantic meaning, allowing for similarity-based information retrieval.",
            documentName: "AI Architecture Guide.pdf",
            relevanceScore: 82
          }
        ];
        
        setSources(newSources);
      }
      
    } catch (error) {
      console.error('Error processing message:', error);
      toast({
        title: "Error",
        description: "Failed to process your message. Please try again.",
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
