
import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { 
  BadgeCheck, 
  BadgeX, 
  CheckCircle, 
  Eye, 
  EyeOff, 
  Info, 
  KeyRound, 
  Save, 
  Settings as SettingsIcon
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface APISettings {
  endpoint: string;
  apiKey: string;
  model: string;
  temperature: number;
  maxTokens: number;
}

interface AzureSettings {
  endpointUrl: string;
  deploymentName: string;
  searchEndpoint: string;
  searchKey: string;
  searchIndexName: string;
  apiKey: string;
}

const Settings = () => {
  const [apiSettings, setApiSettings] = useState<APISettings>({
    endpoint: 'https://api.openai.com/v1',
    apiKey: '',
    model: 'gpt-4o',
    temperature: 0.7,
    maxTokens: 1024
  });
  
  const [azureSettings, setAzureSettings] = useState<AzureSettings>({
    endpointUrl: '',
    deploymentName: '',
    searchEndpoint: '',
    searchKey: '',
    searchIndexName: '',
    apiKey: ''
  });
  
  const [showApiKey, setShowApiKey] = useState(false);
  const [showAzureKey, setShowAzureKey] = useState(false);
  const [showSearchKey, setShowSearchKey] = useState(false);
  const [useAzure, setUseAzure] = useState(false);
  
  const { toast } = useToast();
  
  const handleSaveSettings = () => {
    toast({
      title: "Settings Saved",
      description: "Your API settings have been saved successfully.",
    });
  };
  
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
        
        <Tabs defaultValue="api" className="mb-8">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="api">API Configuration</TabsTrigger>
            <TabsTrigger value="preferences">Preferences</TabsTrigger>
          </TabsList>
          
          <TabsContent value="api" className="space-y-6 animate-fade-in">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <KeyRound className="h-5 w-5" />
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
                <Button onClick={handleSaveSettings}>
                  <Save className="h-4 w-4 mr-2" />
                  Save Settings
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
                <Button onClick={handleSaveSettings} disabled={!useAzure}>
                  <Save className="h-4 w-4 mr-2" />
                  Save Azure Settings
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
          
          <TabsContent value="preferences" className="animate-fade-in">
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
                <Button onClick={handleSaveSettings} className="ml-auto">
                  <Save className="h-4 w-4 mr-2" />
                  Save Preferences
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
