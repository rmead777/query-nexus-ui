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
import { v4 as uuidv4 } from '@/lib/uuid';
import { useNavigate } from 'react-router-dom';
import { Settings } from 'lucide-react';

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

// Simulated UUID function
function v4() {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
}

const Index = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [sources, setSources] = useState<Source[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDocumentUpload, setShowDocumentUpload] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  
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
      // Simulate API response delay
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Add a simulated assistant response
      const assistantResponse: Message = {
        id: v4(),
        content: `I've processed your request: "${message}"\n\nHere's a simulated response with some information that would be retrieved from your uploaded documents and knowledge base.`,
        role: 'assistant',
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, assistantResponse]);
      
      // Add simulated sources
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
        },
        {
          id: v4(),
          title: "Query Processing in RAG",
          content: "When a query is submitted to a RAG system, it is first encoded into a vector representation, then similar vectors are retrieved from the database, and finally used to augment the context for generation.",
          documentName: "System Design Document.docx",
          relevanceScore: 67
        }
      ];
      
      setSources(newSources);
      
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
