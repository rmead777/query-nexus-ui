import { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ApiEndpoint } from '@/types/api';
import { Eye, EyeOff, Plus, Trash2, Edit, Check, HelpCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface EndpointsTabProps {
  apiEndpoints: ApiEndpoint[];
  newEndpoint: Partial<ApiEndpoint>;
  isAddingEndpoint: boolean;
  setIsAddingEndpoint: React.Dispatch<React.SetStateAction<boolean>>;
  isEditingEndpoint: boolean;
  setIsEditingEndpoint: React.Dispatch<React.SetStateAction<boolean>>;
  handleAddEndpoint: () => Promise<void>;
  handleEditEndpoint: (endpoint: ApiEndpoint) => void;
  handleDeleteEndpoint: (id: string) => Promise<void>;
  handleSetActiveEndpoint: (id: string) => Promise<void>;
  saving: boolean;
  showNewApiKey: boolean;
  setShowNewApiKey: React.Dispatch<React.SetStateAction<boolean>>;
}

export const EndpointsTab = ({
  apiEndpoints,
  newEndpoint,
  isAddingEndpoint,
  setIsAddingEndpoint,
  isEditingEndpoint,
  setIsEditingEndpoint,
  handleAddEndpoint,
  handleEditEndpoint,
  handleDeleteEndpoint,
  handleSetActiveEndpoint,
  saving,
  showNewApiKey,
  setShowNewApiKey
}: EndpointsTabProps) => {
  const updateNewEndpoint = (changes: Partial<ApiEndpoint>) => {
    console.log("Update endpoint requested:", changes);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="flex items-center gap-2">
                API Endpoints & Keys
              </CardTitle>
              <CardDescription>
                Manage your AI model providers and API keys
              </CardDescription>
            </div>
            <Button onClick={() => {
              setIsAddingEndpoint(true);
              setIsEditingEndpoint(false);
              setNewEndpoint({
                name: '',
                api_endpoint: '',
                api_key: '',
                model: '',
                provider: 'OpenAI'
              });
            }} variant="outline">
              <Plus className="mr-2 h-4 w-4" />
              Add New Endpoint
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isAddingEndpoint ? (
            <div className="space-y-4 p-4 border rounded-md">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="endpoint-name">Name</Label>
                  <Input
                    id="endpoint-name"
                    value={newEndpoint.name}
                    onChange={(e) => setNewEndpoint({...newEndpoint, name: e.target.value})}
                    placeholder="Personal OpenAI Account"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="endpoint-provider">Provider</Label>
                  <Select 
                    value={newEndpoint.provider} 
                    onValueChange={(value) => setNewEndpoint({...newEndpoint, provider: value})}
                  >
                    <SelectTrigger id="endpoint-provider">
                      <SelectValue placeholder="Select a provider" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="OpenAI">OpenAI</SelectItem>
                      <SelectItem value="Anthropic">Anthropic</SelectItem>
                      <SelectItem value="Google">Google (Gemini)</SelectItem>
                      <SelectItem value="Cohere">Cohere</SelectItem>
                      <SelectItem value="Custom">Custom Provider</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="endpoint-url">API Endpoint URL</Label>
                  <Input
                    id="endpoint-url"
                    value={newEndpoint.api_endpoint || ''}
                    onChange={(e) => setNewEndpoint({...newEndpoint, api_endpoint: e.target.value})}
                    placeholder="https://api.openai.com/v1"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="endpoint-model">Default Model</Label>
                  <Input
                    id="endpoint-model"
                    value={newEndpoint.model || ''}
                    onChange={(e) => setNewEndpoint({...newEndpoint, model: e.target.value})}
                    placeholder="gpt-4o"
                  />
                </div>
                
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="endpoint-api-key">API Key</Label>
                  <div className="relative">
                    <Input
                      id="endpoint-api-key"
                      type={showNewApiKey ? "text" : "password"}
                      value={newEndpoint.api_key || ''}
                      onChange={(e) => setNewEndpoint({...newEndpoint, api_key: e.target.value})}
                      placeholder="Your API key"
                      className="pr-10"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-10 w-10"
                      onClick={() => setShowNewApiKey(!showNewApiKey)}
                    >
                      {showNewApiKey ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                      <span className="sr-only">
                        {showNewApiKey ? "Hide API key" : "Show API key"}
                      </span>
                    </Button>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end space-x-2 mt-4">
                <Button 
                  variant="outline" 
                  onClick={() => setIsAddingEndpoint(false)}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleAddEndpoint}
                  disabled={saving || !newEndpoint.name}
                >
                  {saving ? "Saving..." : isEditingEndpoint ? "Update Endpoint" : "Add Endpoint"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[180px]">Name</TableHead>
                    <TableHead>Provider</TableHead>
                    <TableHead>Model</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {apiEndpoints.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                        No API endpoints configured. Click "Add New Endpoint" to create one.
                      </TableCell>
                    </TableRow>
                  ) : (
                    apiEndpoints.map(endpoint => (
                      <TableRow key={endpoint.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center">
                            {endpoint.name}
                            {endpoint.is_active && (
                              <span className="ml-2 px-2 py-0.5 text-xs bg-green-100 text-green-800 rounded-full">
                                Active
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{endpoint.provider}</TableCell>
                        <TableCell>{endpoint.model || "Not specified"}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end space-x-2">
                            {!endpoint.is_active && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => handleSetActiveEndpoint(endpoint.id)}
                                  >
                                    <Check className="h-4 w-4" />
                                    <span className="sr-only">Set Active</span>
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Set as active endpoint</p>
                                </TooltipContent>
                              </Tooltip>
                            )}
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => handleEditEndpoint(endpoint)}
                                >
                                  <Edit className="h-4 w-4" />
                                  <span className="sr-only">Edit</span>
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Edit endpoint</p>
                              </TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => handleDeleteEndpoint(endpoint.id)}
                                >
                                  <Trash2 className="h-4 w-4 text-red-500" />
                                  <span className="sr-only">Delete</span>
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Delete endpoint</p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
