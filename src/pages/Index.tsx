
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
import { Settings, FileText, Check, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle
} from '@/components/ui/resizable';
import { useIsMobile } from '@/hooks/use-mobile';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

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
  relevanceCategory?: string;
  wordCount?: number;
}

interface UserDocument {
  document_id: string;
  name: string;
  selected?: boolean;
}

const Index = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [sources, setSources] = useState<Source[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDocumentUpload, setShowDocumentUpload] = useState(false);
  const [userDocuments, setUserDocuments] = useState<UserDocument[]>([]);
  const [showDocumentSelector, setShowDocumentSelector] = useState(false);
  const [documentSourceMode, setDocumentSourceMode] = useState<'all' | 'selected'>('all');
  const [isFetchingDocuments, setIsFetchingDocuments] = useState(false);
  const [processingError, setProcessingError] = useState<string | null>(null);
  const [hasSourcesUsed, setHasSourcesUsed] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  
  useEffect(() => {
    if (user) {
      fetchUserDocuments();
    }
  }, [user]);
  
  const fetchUserDocuments = async () => {
    if (!user) return;
    
    try {
      setIsFetchingDocuments(true);
      
      const { data, error } = await supabase
        .from('documents')
        .select('document_id, name')
        .eq('user_id', user.id)
        .order('upload_date', { ascending: false });
        
      if (error) throw error;
      
      console.log(`Fetched ${data?.length || 0} documents for user ${user.id}:`, data);
      
      // Ensure all documents are selected by default
      setUserDocuments(data?.map(doc => ({...doc, selected: true})) || []);
    } catch (error) {
      console.error('Error fetching documents:', error);
      toast({
        title: "Error",
        description: "Failed to fetch your documents. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsFetchingDocuments(false);
    }
  };
  
  const processUserDocuments = async (documentIds: string[]) => {
    if (!documentIds.length) return;
    
    setProcessingError(null);
    console.log(`Processing ${documentIds.length} documents...`);
    
    let hasError = false;
    let processedCount = 0;
    let needsReprocessingCount = 0;
    
    // First check which documents need processing
    const documentsToProcess = [];
    
    for (const docId of documentIds) {
      try {
        // Check if document has content and if it's readable
        const { data: docData, error: docError } = await supabase
          .from('documents')
          .select('content, document_id')
          .eq('document_id', docId)
          .single();
          
        // Document needs processing if:
        // 1. No content, or
        // 2. Content is less than 100 chars, or
        // 3. Content appears to be gibberish (like we see in the image)
        const needsProcessing = !docError && (
          !docData?.content || 
          docData.content.length < 100 ||
          // Check for gibberish by looking for a high proportion of special characters or lack of spaces
          (docData.content.length > 0 && (
            (docData.content.match(/[a-zA-Z]/g)?.length || 0) / docData.content.length < 0.3 ||
            (docData.content.match(/\s/g)?.length || 0) / docData.content.length < 0.05
          ))
        );
        
        if (needsProcessing) {
          console.log(`Document ${docId} needs processing`);
          documentsToProcess.push(docId);
          needsReprocessingCount++;
        } else {
          console.log(`Document ${docId} already has valid content, skipping processing`);
        }
      } catch (error) {
        console.error(`Failed to check document ${docId}:`, error);
        // When in doubt, process anyway
        documentsToProcess.push(docId);
        needsReprocessingCount++;
      }
    }
    
    if (needsReprocessingCount > 0) {
      console.log(`${needsReprocessingCount} documents need processing/reprocessing`);
      toast({
        title: "Processing Documents",
        description: `Processing ${needsReprocessingCount} document${needsReprocessingCount > 1 ? 's' : ''} for AI access`,
      });
    }
    
    // Process documents that need it
    for (const docId of documentsToProcess) {
      try {
        console.log(`Processing document ${docId}`);
        const { error } = await supabase.functions.invoke('process-document', {
          body: { documentId: docId }
        });
        
        if (error) {
          console.error(`Error processing document ${docId}:`, error);
          hasError = true;
        } else {
          processedCount++;
        }
      } catch (error) {
        console.error(`Failed to process document ${docId}:`, error);
        hasError = true;
      }
    }
    
    if (hasError) {
      setProcessingError("Some documents couldn't be processed. The AI will try to use the available content.");
    } else if (processedCount > 0) {
      console.log(`Successfully processed ${processedCount} documents`);
    }
    
    console.log("Document processing complete");
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
    setHasSourcesUsed(false);
    setSources([]); // Clear previous sources
    
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
      
      // Get selected document IDs based on mode
      let documentIds: string[] = [];
      if (documentSourceMode === 'all') {
        documentIds = userDocuments.map(doc => doc.document_id);
      } else {
        documentIds = userDocuments
          .filter(doc => doc.selected)
          .map(doc => doc.document_id);
      }
      
      // Pre-process documents to ensure content is available
      if (documentIds.length > 0) {
        await processUserDocuments(documentIds);
      }
      
      console.log("Sending request with provider:", provider);
      console.log("API Endpoint:", apiEndpoint);
      console.log("Model:", model);
      console.log("Using documents:", documentIds);
      
      const { data, error } = await supabase.functions.invoke('create-assistant-completion', {
        body: {
          prompt: message,
          model: model,
          temperature: temperature,
          top_p: 1,
          max_tokens: maxTokens,
          instructions: instructions,
          sources: sourcesSettings,
          documentIds: documentIds, // Pass the document IDs
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
      
      // Handle source data from response
      if (data.sources && Array.isArray(data.sources) && data.sources.length > 0) {
        console.log("Setting sources from response:", data.sources);
        setSources(data.sources);
        setHasSourcesUsed(true);
      } else if (data.documentIdsUsed && data.documentIdsUsed.length > 0) {
        // If we have document IDs but no sources in the response, try to fetch them
        console.log("No source data in response, but document IDs used. Fetching documents...");
        const documentSources: Source[] = [];
        
        for (const docId of data.documentIdsUsed) {
          try {
            const { data: docData } = await supabase
              .from('documents')
              .select('name, content, document_id')
              .eq('document_id', docId)
              .single();
              
            if (docData && docData.content) {
              documentSources.push({
                id: docData.document_id || v4(),
                title: docData.name,
                content: docData.content,
                documentName: docData.name,
                relevanceScore: 85  // Default high score since it was used
              });
            }
          } catch (docError) {
            console.error('Error fetching document content:', docError);
          }
        }
        
        if (documentSources.length > 0) {
          console.log(`Setting ${documentSources.length} sources from document query`);
          setSources(documentSources);
          setHasSourcesUsed(true);
        } else {
          console.log("No document sources found");
          setHasSourcesUsed(false);
        }
      } else {
        console.log("No source data available");
        setHasSourcesUsed(false);
      }
      
    } catch (error) {
      console.error('Error processing message:', error);
      toast({
        title: "Error",
        description: `Failed to process your message: ${error.message}`,
        variant: "destructive"
      });
      
      // Add a fallback error message
      const errorResponse: Message = {
        id: v4(),
        content: "I'm sorry, I encountered an error while processing your request. Please try again or check if your documents are properly uploaded.",
        role: 'assistant',
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, errorResponse]);
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
  
  const toggleDocumentSelection = (documentId: string) => {
    setUserDocuments(prevDocs => 
      prevDocs.map(doc => 
        doc.document_id === documentId 
          ? { ...doc, selected: !doc.selected } 
          : doc
      )
    );
  };
  
  const selectAllDocuments = () => {
    setUserDocuments(prevDocs => 
      prevDocs.map(doc => ({ ...doc, selected: true }))
    );
  };
  
  const deselectAllDocuments = () => {
    setUserDocuments(prevDocs => 
      prevDocs.map(doc => ({ ...doc, selected: false }))
    );
  };
  
  return (
    <MainLayout>
      <div className="flex flex-col h-[calc(100vh-48px)]">
        {showDocumentUpload ? (
          <Card className="max-w-xl w-full mx-auto my-10 p-6 animate-fade-in">
            <DocumentUpload 
              onUpload={handleFileUpload}
            />
          </Card>
        ) : (
          <ResizablePanelGroup direction="horizontal" className="h-full">
            <ResizablePanel defaultSize={75} minSize={50}>
              <div className="flex flex-col h-full">
                <div className="flex justify-between mb-4 pr-4">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex items-center gap-1.5 ml-4"
                    onClick={() => setShowDocumentSelector(prev => !prev)}
                  >
                    <FileText className="h-4 w-4" />
                    <span className="text-xs font-normal">Select Documents</span>
                  </Button>
                  
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
                
                {showDocumentSelector && (
                  <div className="mx-4 mb-4 p-4 border border-border rounded-lg bg-card/50 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="text-sm font-medium">Document Sources</h3>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" onClick={selectAllDocuments} className="h-7 text-xs">Select All</Button>
                        <Button variant="ghost" size="sm" onClick={deselectAllDocuments} className="h-7 text-xs">Deselect All</Button>
                      </div>
                    </div>
                    
                    <RadioGroup 
                      value={documentSourceMode} 
                      onValueChange={(value) => setDocumentSourceMode(value as 'all' | 'selected')}
                      className="mb-3 space-y-1"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="all" id="all-docs" />
                        <Label htmlFor="all-docs" className="text-sm font-normal">Use all documents</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="selected" id="selected-docs" />
                        <Label htmlFor="selected-docs" className="text-sm font-normal">Use only selected documents</Label>
                      </div>
                    </RadioGroup>
                    
                    {documentSourceMode === 'selected' && (
                      <div className="max-h-40 overflow-y-auto space-y-2 pr-2">
                        {isFetchingDocuments ? (
                          <div className="text-sm text-muted-foreground animate-pulse flex items-center">
                            <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
                            Loading documents...
                          </div>
                        ) : userDocuments.length > 0 ? (
                          userDocuments.map((doc) => (
                            <div key={doc.document_id} className="flex items-center space-x-2">
                              <Checkbox 
                                id={doc.document_id} 
                                checked={doc.selected} 
                                onCheckedChange={() => toggleDocumentSelection(doc.document_id)}
                              />
                              <label
                                htmlFor={doc.document_id}
                                className="text-sm font-normal leading-none truncate"
                              >
                                {doc.name}
                              </label>
                            </div>
                          ))
                        ) : (
                          <div className="text-sm text-muted-foreground">
                            No documents found. Upload documents from the Documents page.
                          </div>
                        )}
                      </div>
                    )}
                    
                    {userDocuments.length > 0 && (
                      <div className="mt-3 text-xs text-muted-foreground">
                        <Button 
                          variant="link" 
                          size="sm" 
                          className="h-auto p-0 text-xs"
                          onClick={fetchUserDocuments}
                        >
                          Refresh document list
                        </Button>
                      </div>
                    )}
                  </div>
                )}
                
                {processingError && (
                  <Alert className="mx-4 mb-4 animate-in fade-in">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Processing Warning</AlertTitle>
                    <AlertDescription>
                      {processingError}
                    </AlertDescription>
                  </Alert>
                )}
                
                <div className="flex-1 overflow-y-auto subtle-scroll pb-10">
                  <ChatOutput messages={messages} isLoading={isLoading} />
                </div>
              </div>
            </ResizablePanel>
            
            {sources.length > 0 && hasSourcesUsed && !isMobile && (
              <>
                <ResizableHandle withHandle />
                <ResizablePanel defaultSize={25} minSize={20}>
                  <SourcePanel sources={sources} />
                </ResizablePanel>
              </>
            )}
          </ResizablePanelGroup>
        )}
        
        <div className="pt-3 border-t border-border mt-auto">
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
