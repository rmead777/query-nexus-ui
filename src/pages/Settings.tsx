
import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  BadgeCheck, 
  Info, 
  KeyRound, 
  Save, 
  Settings as SettingsIcon,
  BookOpen,
  Brain,
  Search,
  Eye,
  EyeOff
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

interface ResponseSourceSettings {
  useDocuments: boolean;
  useKnowledgeBase: boolean;
  useExternalSearch: boolean;
}

const Settings = () => {
  const [apiSettings, setApiSettings] = useState({
    endpoint: 'https://api.openai.com/v1',
    apiKey: '',
    model: 'gpt-4o',
    temperature: 0.7,
    maxTokens: 1024
  });
  
  const [azureSettings, setAzureSettings] = useState({
    endpointUrl: '',
    deploymentName: '',
    searchEndpoint: '',
    searchKey: '',
    searchIndexName: '',
    apiKey: ''
  });
  
  const [responseSources, setResponseSources] = useState<ResponseSourceSettings>({
    useDocuments: true,
    useKnowledgeBase: true,
    useExternalSearch: false
  });
  
  const [showApiKey, setShowApiKey] = useState(false);
  const [showAzureKey, setShowAzureKey] = useState(false);
  const [showSearchKey, setShowSearchKey] = useState(false);
  const [useAzure, setUseAzure] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const { toast } = useToast();
  const { user } = useAuth();
  
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<string>('preferences');
  
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const tab = searchParams.get('tab');
    
    if (tab && (tab === 'preferences' || tab === 'api')) {
      setActiveTab(tab);
    }
  }, [location]);
  
  // Load user settings from Supabase
  useEffect(() => {
    const loadUserSettings = async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      
      try {
        const { data, error } = await supabase
          .from('user_settings')
          .select('*')
          .eq('user_id', user.id)
          .single();
          
        if (error) {
          console.log('No settings found or error:', error);
          setLoading(false);
          return;
        }
        
        if (data) {
          // Update API settings
          setApiSettings({
            endpoint: data.api_endpoint || 'https://api.openai.com/v1',
            apiKey: data.api_key || '',
            model: data.model || 'gpt-4o',
            temperature: data.temperature || 0.7,
            maxTokens: data.max_tokens || 1024
          });
          
          // Update Azure settings
          setAzureSettings({
            endpointUrl: data.azure_endpoint_url || '',
            deploymentName: data.azure_deployment_name || '',
            searchEndpoint: data.azure_search_endpoint || '',
            searchKey: data.azure_search_key || '',
            searchIndexName: data.azure_search_index_name || '',
            apiKey: data.azure_api_key || ''
          });
          
          // Update Azure toggle
          setUseAzure(data.use_azure || false);
          
          // Update response sources with proper type checking
          if (data.response_sources) {
            const sourcesData = data.response_sources as Record<string, unknown>;
            // Create a properly typed object with defaults for any missing properties
            const typedSources: ResponseSourceSettings = {
              useDocuments: typeof sourcesData.useDocuments === 'boolean' ? sourcesData.useDocuments : true,
              useKnowledgeBase: typeof sourcesData.useKnowledgeBase === 'boolean' ? sourcesData.useKnowledgeBase : true,
              useExternalSearch: typeof sourcesData.useExternalSearch === 'boolean' ? sourcesData.useExternalSearch : false
            };
            setResponseSources(typedSources);
          }
        }
      } catch (error) {
        console.error('Error loading settings:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadUserSettings();
  }, [user]);
  
  const handleSaveSettings = async (settingType: 'preferences' | 'api' | 'azure') => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "You need to be logged in to save settings.",
        variant: "destructive"
      });
      return;
    }

    setSaving(true);
    
    try {
      // First check if the user already has settings
      const { data, error } = await supabase
        .from('user_settings')
        .select('id')
        .eq('user_id', user.id)
        .single();
      
      // Prepare the data to save based on the setting type
      let settingsData = {};
      
      if (settingType === 'preferences') {
        settingsData = {
          response_sources: responseSources,
          updated_at: new Date().toISOString()
        };
      } else if (settingType === 'api') {
        settingsData = {
          api_endpoint: apiSettings.endpoint,
          api_key: apiSettings.apiKey,
          model: apiSettings.model,
          temperature: apiSettings.temperature,
          max_tokens: apiSettings.maxTokens,
          updated_at: new Date().toISOString()
        };
      } else if (settingType === 'azure') {
        settingsData = {
          use_azure: useAzure,
          azure_endpoint_url: azureSettings.endpointUrl,
          azure_deployment_name: azureSettings.deploymentName,
          azure_api_key: azureSettings.apiKey,
          azure_search_endpoint: azureSettings.searchEndpoint,
          azure_search_key: azureSettings.searchKey,
          azure_search_index_name: azureSettings.searchIndexName,
          updated_at: new Date().toISOString()
        };
      }
      
      // Insert or update settings based on whether they already exist
      if (error || !data) {
        // No settings exist yet, so insert
        const { error: insertError } = await supabase
          .from('user_settings')
          .insert([{
            user_id: user.id,
            ...settingsData
          }]);
          
        if (insertError) throw insertError;
      } else {
        // Settings exist, so update
        const { error: updateError } = await supabase
          .from('user_settings')
          .update(settingsData)
          .eq('user_id', user.id);
          
        if (updateError) throw updateError;
      }
      
      toast({
        title: "Settings Saved",
        description: `Your ${settingType} settings have been saved successfully.`,
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: "Error",
        description: "Failed to save settings. Please try again.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };
  
  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-[calc(100vh-200px)]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2">Loading settings...</span>
        </div>
      </MainLayout>
    );
  }
  
  return (
    <MainLayout>
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
            <p className="text-muted-foreground mt-1">
              Configure your API keys and application preferences.
            </p>
          </div>
        </div>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-8">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="preferences">Preferences</TabsTrigger>
            <TabsTrigger value="api">API Configuration</TabsTrigger>
          </TabsList>
          
          <TabsContent value="preferences" className="animate-fade-in space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <SettingsIcon className="h-5 w-5" />
                  Application Preferences
                </CardTitle>
                <CardDescription>
                  Customize your application experience.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-base">Auto-save conversations</Label>
                      <p className="text-sm text-muted-foreground">
                        Automatically save your conversations for future reference
                      </p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  
                  <Separator />
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-base">Show sources by default</Label>
                      <p className="text-sm text-muted-foreground">
                        Always show the sources panel when available
                      </p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  
                  <Separator />
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-base">Citations in responses</Label>
                      <p className="text-sm text-muted-foreground">
                        Include citation references in AI responses
                      </p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button 
                  onClick={() => handleSaveSettings('preferences')}
                  className="ml-auto"
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Preferences
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="h-5 w-5" />
                  AI Response Sources
                </CardTitle>
                <CardDescription>
                  Control where the AI should source information for responses
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <Checkbox 
                      id="use-documents" 
                      checked={responseSources.useDocuments}
                      onCheckedChange={(checked) => 
                        setResponseSources({...responseSources, useDocuments: checked === true})}
                    />
                    <div className="space-y-1">
                      <Label 
                        htmlFor="use-documents" 
                        className="text-base font-medium flex items-center gap-1.5"
                      >
                        <BookOpen className="h-4 w-4" />
                        Uploaded Documents
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Limit responses to information found in the uploaded or saved documents only
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <Checkbox 
                      id="use-knowledge-base" 
                      checked={responseSources.useKnowledgeBase}
                      onCheckedChange={(checked) => 
                        setResponseSources({...responseSources, useKnowledgeBase: checked === true})}
                    />
                    <div className="space-y-1">
                      <Label 
                        htmlFor="use-knowledge-base" 
                        className="text-base font-medium flex items-center gap-1.5"
                      >
                        <Brain className="h-4 w-4" />
                        AI Knowledge Base
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Allow the AI to use its pre-trained knowledge to answer questions
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <Checkbox 
                      id="use-external-search" 
                      checked={responseSources.useExternalSearch}
                      onCheckedChange={(checked) => 
                        setResponseSources({...responseSources, useExternalSearch: checked === true})}
                    />
                    <div className="space-y-1">
                      <Label 
                        htmlFor="use-external-search" 
                        className="text-base font-medium flex items-center gap-1.5"
                      >
                        <Search className="h-4 w-4" />
                        External Search
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Allow the AI to search for additional information from external sources
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 text-sm p-3 rounded-md bg-blue-50 text-blue-600">
                  <Info className="h-4 w-4 flex-shrink-0" />
                  <span>
                    Using multiple sources provides more comprehensive responses, but may increase response time.
                    For the most accurate document-specific answers, enable "Uploaded Documents" only.
                  </span>
                </div>
              </CardContent>
              <CardFooter>
                <Button 
                  onClick={() => handleSaveSettings('preferences')}
                  className="ml-auto"
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Source Settings
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
          
          <TabsContent value="api" className="space-y-6 animate-fade-in">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      API Settings
                    </CardTitle>
                    <CardDescription>
                      Configure your language model API settings.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="api-endpoint">API Endpoint</Label>
                    <Input
                      id="api-endpoint"
                      value={apiSettings.endpoint}
                      onChange={(e) => setApiSettings({...apiSettings, endpoint: e.target.value})}
                      placeholder="https://api.openai.com/v1"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="api-key">API Key</Label>
                    <div className="relative">
                      <Input
                        id="api-key"
                        type={showApiKey ? "text" : "password"}
                        value={apiSettings.apiKey}
                        onChange={(e) => setApiSettings({...apiSettings, apiKey: e.target.value})}
                        placeholder="Your API key"
                        className="pr-10"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-10 w-10"
                        onClick={() => setShowApiKey(!showApiKey)}
                      >
                        {showApiKey ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                        <span className="sr-only">
                          {showApiKey ? "Hide API key" : "Show API key"}
                        </span>
                      </Button>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="model">Model</Label>
                    <Input
                      id="model"
                      value={apiSettings.model}
                      onChange={(e) => setApiSettings({...apiSettings, model: e.target.value})}
                      placeholder="gpt-4o"
                    />
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Info className="h-4 w-4" />
                  <span>Required for the application to function</span>
                </div>
                <Button 
                  onClick={() => handleSaveSettings('api')}
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Settings
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>
            
            <Card>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      Azure OpenAI API Integration
                    </CardTitle>
                    <CardDescription>
                      Optional integration with Azure OpenAI API and Cognitive Search.
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label htmlFor="use-azure" className="text-sm font-normal">Enable Azure</Label>
                    <Switch
                      id="use-azure"
                      checked={useAzure}
                      onCheckedChange={setUseAzure}
                    />
                  </div>
                </div>
              </CardHeader>
              
              {useAzure && (
                <>
                  <Separator />
                  <CardContent className="pt-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="azure-endpoint-url">ENDPOINT_URL</Label>
                          <Input
                            id="azure-endpoint-url"
                            value={azureSettings.endpointUrl}
                            onChange={(e) => setAzureSettings({...azureSettings, endpointUrl: e.target.value})}
                            placeholder="https://your-resource.openai.azure.com"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="azure-deployment-name">DEPLOYMENT_NAME</Label>
                          <Input
                            id="azure-deployment-name"
                            value={azureSettings.deploymentName}
                            onChange={(e) => setAzureSettings({...azureSettings, deploymentName: e.target.value})}
                            placeholder="your-deployment"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="azure-api-key">AZURE_OPENAI_API_KEY</Label>
                          <div className="relative">
                            <Input
                              id="azure-api-key"
                              type={showAzureKey ? "text" : "password"}
                              value={azureSettings.apiKey}
                              onChange={(e) => setAzureSettings({...azureSettings, apiKey: e.target.value})}
                              placeholder="Your Azure OpenAI API key"
                              className="pr-10"
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              className="absolute right-0 top-0 h-10 w-10"
                              onClick={() => setShowAzureKey(!showAzureKey)}
                            >
                              {showAzureKey ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                              <span className="sr-only">
                                {showAzureKey ? "Hide key" : "Show key"}
                              </span>
                            </Button>
                          </div>
                        </div>
                      </div>
                      
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="azure-search-endpoint">SEARCH_ENDPOINT</Label>
                          <Input
                            id="azure-search-endpoint"
                            value={azureSettings.searchEndpoint}
                            onChange={(e) => setAzureSettings({...azureSettings, searchEndpoint: e.target.value})}
                            placeholder="https://your-search.search.windows.net"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="azure-search-key">SEARCH_KEY</Label>
                          <div className="relative">
                            <Input
                              id="azure-search-key"
                              type={showSearchKey ? "text" : "password"}
                              value={azureSettings.searchKey}
                              onChange={(e) => setAzureSettings({...azureSettings, searchKey: e.target.value})}
                              placeholder="Your Azure Cognitive Search key"
                              className="pr-10"
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              className="absolute right-0 top-0 h-10 w-10"
                              onClick={() => setShowSearchKey(!showSearchKey)}
                            >
                              {showSearchKey ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                              <span className="sr-only">
                                {showSearchKey ? "Hide key" : "Show key"}
                              </span>
                            </Button>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="azure-search-index">SEARCH_INDEX_NAME</Label>
                          <Input
                            id="azure-search-index"
                            value={azureSettings.searchIndexName}
                            onChange={(e) => setAzureSettings({...azureSettings, searchIndexName: e.target.value})}
                            placeholder="your-search-index"
                          />
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm p-3 rounded-md bg-blue-50 text-blue-600">
                      <Info className="h-4 w-4" />
                      <span>
                        Azure integration enables advanced RAG capabilities through Azure Cognitive Search and Azure OpenAI services.
                      </span>
                    </div>
                  </CardContent>
                </>
              )}
              
              <CardFooter className="flex justify-end">
                <Button 
                  onClick={() => handleSaveSettings('azure')} 
                  disabled={!useAzure || saving}
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Azure Settings
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
};

export default Settings;
