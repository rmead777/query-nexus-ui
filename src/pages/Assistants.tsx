
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/use-toast';
import { v4 as uuidv4 } from '@/lib/uuid';
import { 
  Plus, 
  ChevronDown, 
  Trash2, 
  FileCode, 
  Save, 
  Code,
  Search,
  Settings,
  PlusCircle
} from 'lucide-react';

interface Assistant {
  id: string;
  name: string;
  deployment: string;
  instructions: string;
  temperature: number;
  top_p: number;
  max_tokens: number;
  tools: AssistantTool[];
  functions: AssistantFunction[];
}

interface AssistantTool {
  id?: string;
  assistant_id?: string;
  tool_type: string;
  enabled: boolean;
}

interface AssistantFunction {
  id?: string;
  assistant_id?: string;
  name: string;
  description?: string;
  parameters?: Record<string, any>;
}

const defaultFunction = {
  name: 'get_weather',
  description: 'Get the current weather in a given location',
  parameters: {
    type: 'object',
    properties: {
      location: {
        type: 'string',
        description: 'The city and state, e.g. San Francisco, CA',
      },
      unit: {
        type: 'string',
        enum: ['celsius', 'fahrenheit'],
        description: 'The unit of temperature to use',
      },
    },
    required: ['location'],
  },
};

const Assistants = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [assistants, setAssistants] = useState<Assistant[]>([]);
  const [currentAssistant, setCurrentAssistant] = useState<Assistant | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isToolsOpen, setIsToolsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    
    fetchAssistants();
  }, [user, navigate]);
  
  const fetchAssistants = async () => {
    try {
      const { data: assistantsData, error: assistantsError } = await supabase
        .from('assistants')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (assistantsError) throw assistantsError;
      
      const assistantsWithDetails = await Promise.all(
        assistantsData.map(async (assistant) => {
          // Fetch tools
          const { data: toolsData } = await supabase
            .from('assistant_tools')
            .select('*')
            .eq('assistant_id', assistant.id);
          
          // Fetch functions
          const { data: functionsData } = await supabase
            .from('assistant_functions')
            .select('*')
            .eq('assistant_id', assistant.id);
          
          // Convert the parameters from Json to Record<string, any>
          const formattedFunctions = functionsData?.map(func => ({
            ...func,
            parameters: typeof func.parameters === 'string' 
              ? JSON.parse(func.parameters) 
              : func.parameters
          })) || [];
          
          return {
            ...assistant,
            tools: toolsData || [],
            functions: formattedFunctions,
          } as Assistant;
        })
      );
      
      setAssistants(assistantsWithDetails);
      
      if (assistantsWithDetails.length > 0 && !currentAssistant) {
        setCurrentAssistant(assistantsWithDetails[0]);
      }
    } catch (error) {
      console.error('Error fetching assistants:', error);
      toast({
        title: 'Error fetching assistants',
        description: 'Failed to load your assistants. Please try again.',
        variant: 'destructive',
      });
    }
  };
  
  const createNewAssistant = () => {
    const newAssistant: Assistant = {
      id: uuidv4(),
      name: `Assistant${assistants.length + 1}`,
      deployment: 'gpt-4o-mini',
      instructions: 'Give your assistant clear directions on what to do and how to do it. Include specific tasks, their order, and any special instructions like tone or engagement style.',
      temperature: 0.7,
      top_p: 1,
      max_tokens: 2048,
      tools: [
        { tool_type: 'file_search', enabled: false },
        { tool_type: 'code_interpreter', enabled: false },
      ],
      functions: [],
    };
    
    setCurrentAssistant(newAssistant);
    setIsCreating(true);
  };
  
  const saveAssistant = async () => {
    if (!currentAssistant || !user) return;
    
    try {
      // Save assistant
      const { error: assistantError } = await supabase
        .from('assistants')
        .upsert({
          id: currentAssistant.id,
          user_id: user.id,
          name: currentAssistant.name,
          deployment: currentAssistant.deployment,
          instructions: currentAssistant.instructions,
          temperature: currentAssistant.temperature,
          top_p: currentAssistant.top_p,
          max_tokens: currentAssistant.max_tokens,
        }, { onConflict: 'id' });
      
      if (assistantError) throw assistantError;
      
      // Save tools
      for (const tool of currentAssistant.tools) {
        const { error: toolError } = await supabase
          .from('assistant_tools')
          .upsert({
            id: tool.id || uuidv4(),
            assistant_id: currentAssistant.id,
            tool_type: tool.tool_type,
            enabled: tool.enabled,
          }, { onConflict: 'id' });
        
        if (toolError) throw toolError;
      }
      
      // Save functions
      for (const func of currentAssistant.functions) {
        const { error: funcError } = await supabase
          .from('assistant_functions')
          .upsert({
            id: func.id || uuidv4(),
            assistant_id: currentAssistant.id,
            name: func.name,
            description: func.description,
            parameters: func.parameters,
          }, { onConflict: 'id' });
        
        if (funcError) throw funcError;
      }
      
      toast({
        title: 'Assistant saved',
        description: 'Your assistant has been saved successfully!',
      });
      
      setIsCreating(false);
      fetchAssistants();
    } catch (error) {
      console.error('Error saving assistant:', error);
      toast({
        title: 'Error saving assistant',
        description: 'Failed to save your assistant. Please try again.',
        variant: 'destructive',
      });
    }
  };
  
  const deleteAssistant = async (id: string) => {
    try {
      const { error } = await supabase
        .from('assistants')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      toast({
        title: 'Assistant deleted',
        description: 'Your assistant has been deleted successfully.',
      });
      
      fetchAssistants();
      
      if (currentAssistant?.id === id) {
        setCurrentAssistant(assistants.length > 1 ? assistants[0] : null);
      }
    } catch (error) {
      console.error('Error deleting assistant:', error);
      toast({
        title: 'Error deleting assistant',
        description: 'Failed to delete your assistant. Please try again.',
        variant: 'destructive',
      });
    }
  };
  
  const addFunction = () => {
    if (!currentAssistant) return;
    
    setCurrentAssistant({
      ...currentAssistant,
      functions: [
        ...currentAssistant.functions,
        {
          ...defaultFunction,
          name: `function_${currentAssistant.functions.length + 1}`,
        },
      ],
    });
  };
  
  const updateFunction = (index: number, updatedFunction: AssistantFunction) => {
    if (!currentAssistant) return;
    
    const updatedFunctions = [...currentAssistant.functions];
    updatedFunctions[index] = updatedFunction;
    
    setCurrentAssistant({
      ...currentAssistant,
      functions: updatedFunctions,
    });
  };
  
  const deleteFunction = (index: number) => {
    if (!currentAssistant) return;
    
    const updatedFunctions = [...currentAssistant.functions];
    updatedFunctions.splice(index, 1);
    
    setCurrentAssistant({
      ...currentAssistant,
      functions: updatedFunctions,
    });
  };
  
  const updateTool = (toolType: string, enabled: boolean) => {
    if (!currentAssistant) return;
    
    const updatedTools = currentAssistant.tools.map(tool => 
      tool.tool_type === toolType ? { ...tool, enabled } : tool
    );
    
    setCurrentAssistant({
      ...currentAssistant,
      tools: updatedTools,
    });
  };
  
  return (
    <MainLayout>
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Assistants playground</h1>
            <p className="text-muted-foreground mt-1">
              Create and manage AI assistants with custom instructions and capabilities
            </p>
          </div>
        </div>
        
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button 
              variant="outline"
              className="flex items-center gap-1.5" 
              onClick={createNewAssistant}
            >
              <Plus className="h-4 w-4" /> New assistant
            </Button>
            
            {assistants.length > 0 && (
              <Select 
                value={currentAssistant?.id} 
                onValueChange={(value) => {
                  const selected = assistants.find(a => a.id === value);
                  if (selected) {
                    setCurrentAssistant(selected);
                    setIsCreating(false);
                  }
                }}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Select assistant" />
                </SelectTrigger>
                <SelectContent>
                  {assistants.map((assistant) => (
                    <SelectItem key={assistant.id} value={assistant.id}>
                      {assistant.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            
            <Button 
              variant="outline"
              size="icon"
              title="View code"
              disabled={!currentAssistant}
            >
              <FileCode className="h-4 w-4" />
            </Button>
            
            <Button 
              variant="outline"
              size="icon" 
              title="Delete"
              disabled={!currentAssistant}
              onClick={() => currentAssistant && deleteAssistant(currentAssistant.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
          
          {currentAssistant ? (
            <Card>
              <CardContent className="p-6 space-y-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="assistant-name">Name</Label>
                    <Input
                      id="assistant-name"
                      value={currentAssistant.name}
                      onChange={(e) => setCurrentAssistant({
                        ...currentAssistant,
                        name: e.target.value
                      })}
                      className="mt-1"
                    />
                  </div>
                  
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <Label htmlFor="deployment">Deployment</Label>
                      <Button variant="ghost" size="sm" className="h-6 px-2 text-xs">
                        <PlusCircle className="h-3 w-3 mr-1" /> Create new deployment
                      </Button>
                    </div>
                    <Select
                      value={currentAssistant.deployment}
                      onValueChange={(value) => setCurrentAssistant({
                        ...currentAssistant,
                        deployment: value
                      })}
                    >
                      <SelectTrigger id="deployment">
                        <SelectValue placeholder="Select model" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="gpt-4o">gpt-4o (version:2024-11-20)</SelectItem>
                        <SelectItem value="gpt-4o-mini">gpt-4o-mini (version:2024-11-20)</SelectItem>
                        <SelectItem value="gpt-3.5-turbo">gpt-3.5-turbo (version:2024-08-15)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <div className="flex items-center gap-1">
                      <Label htmlFor="instructions">Instructions</Label>
                      <span className="rounded-full bg-muted h-4 w-4 flex items-center justify-center text-xs" title="Instructions for the AI assistant">?</span>
                    </div>
                    <Textarea
                      id="instructions"
                      value={currentAssistant.instructions}
                      onChange={(e) => setCurrentAssistant({
                        ...currentAssistant,
                        instructions: e.target.value
                      })}
                      className="mt-1 min-h-32"
                      placeholder="Give your assistant clear directions on what to do and how to do it. Include specific tasks, their order, and any special instructions like tone or engagement style."
                    />
                  </div>
                  
                  <Collapsible open={isToolsOpen} onOpenChange={setIsToolsOpen}>
                    <CollapsibleTrigger asChild>
                      <div className="flex items-center justify-between cursor-pointer py-2">
                        <div className="flex items-center gap-2">
                          <Label className="text-base cursor-pointer">Tools</Label>
                        </div>
                        <ChevronDown className={`h-5 w-5 transition-transform ${isToolsOpen ? 'rotate-180' : ''}`} />
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="space-y-4 py-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Label htmlFor="file-search" className="cursor-pointer">File search</Label>
                          <span className="rounded-full bg-muted h-4 w-4 flex items-center justify-center text-xs" title="Search through files">?</span>
                        </div>
                        <Switch 
                          id="file-search"
                          checked={currentAssistant.tools.find(t => t.tool_type === 'file_search')?.enabled || false}
                          onCheckedChange={(checked) => updateTool('file_search', checked)}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Label htmlFor="code-interpreter" className="cursor-pointer">Code interpreter</Label>
                          <span className="rounded-full bg-muted h-4 w-4 flex items-center justify-center text-xs" title="Execute code">?</span>
                        </div>
                        <Switch 
                          id="code-interpreter"
                          checked={currentAssistant.tools.find(t => t.tool_type === 'code_interpreter')?.enabled || false}
                          onCheckedChange={(checked) => updateTool('code_interpreter', checked)}
                        />
                      </div>
                      
                      <div className="pt-2">
                        <div className="flex items-center justify-between mb-2">
                          <Label>Functions</Label>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={addFunction}
                          >
                            <PlusCircle className="h-3.5 w-3.5 mr-1.5" /> Add function
                          </Button>
                        </div>
                        
                        {currentAssistant.functions.length === 0 ? (
                          <div className="text-center py-4 border border-dashed rounded-md">
                            <Code className="h-8 w-8 mx-auto text-muted-foreground" />
                            <p className="mt-2 text-sm text-muted-foreground">No functions added yet</p>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {currentAssistant.functions.map((func, index) => (
                              <Card key={index} className="relative">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="absolute top-2 right-2 h-6 w-6"
                                  onClick={() => deleteFunction(index)}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                                <CardContent className="p-3">
                                  <Input 
                                    value={func.name} 
                                    onChange={(e) => updateFunction(index, { ...func, name: e.target.value })}
                                    className="font-mono text-sm mb-2"
                                  />
                                  <div className="text-xs text-muted-foreground overflow-hidden text-ellipsis">
                                    {func.description || "No description"}
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        )}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                  
                  <Collapsible open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
                    <CollapsibleTrigger asChild>
                      <div className="flex items-center justify-between cursor-pointer py-2">
                        <div className="flex items-center gap-2">
                          <Label className="text-base cursor-pointer">Model settings</Label>
                        </div>
                        <ChevronDown className={`h-5 w-5 transition-transform ${isSettingsOpen ? 'rotate-180' : ''}`} />
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="space-y-4 py-2">
                      <div className="space-y-6">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1">
                              <Label>Temperature</Label>
                              <span className="rounded-full bg-muted h-4 w-4 flex items-center justify-center text-xs" title="Controls randomness: 0 is deterministic, 1 is creative">?</span>
                            </div>
                            <Input 
                              type="number" 
                              min="0"
                              max="1"
                              step="0.1"
                              value={currentAssistant.temperature}
                              onChange={(e) => setCurrentAssistant({
                                ...currentAssistant,
                                temperature: parseFloat(e.target.value)
                              })}
                              className="w-16 h-8 text-center"
                            />
                          </div>
                          <Slider
                            value={[currentAssistant.temperature]}
                            min={0}
                            max={1}
                            step={0.1}
                            onValueChange={(value) => setCurrentAssistant({
                              ...currentAssistant,
                              temperature: value[0]
                            })}
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1">
                              <Label>Top P</Label>
                              <span className="rounded-full bg-muted h-4 w-4 flex items-center justify-center text-xs" title="Controls diversity via nucleus sampling">?</span>
                            </div>
                            <Input 
                              type="number" 
                              min="0"
                              max="1"
                              step="0.1"
                              value={currentAssistant.top_p}
                              onChange={(e) => setCurrentAssistant({
                                ...currentAssistant,
                                top_p: parseFloat(e.target.value)
                              })}
                              className="w-16 h-8 text-center"
                            />
                          </div>
                          <Slider
                            value={[currentAssistant.top_p]}
                            min={0}
                            max={1}
                            step={0.1}
                            onValueChange={(value) => setCurrentAssistant({
                              ...currentAssistant,
                              top_p: value[0]
                            })}
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label>Max tokens</Label>
                            <Input 
                              type="number" 
                              min="100"
                              max="4000"
                              step="100"
                              value={currentAssistant.max_tokens}
                              onChange={(e) => setCurrentAssistant({
                                ...currentAssistant,
                                max_tokens: parseInt(e.target.value)
                              })}
                              className="w-16 h-8 text-center"
                            />
                          </div>
                          <Slider
                            value={[currentAssistant.max_tokens]}
                            min={100}
                            max={4000}
                            step={100}
                            onValueChange={(value) => setCurrentAssistant({
                              ...currentAssistant,
                              max_tokens: value[0]
                            })}
                          />
                        </div>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                </div>
              </CardContent>
              <CardFooter className="flex justify-end p-6 pt-0">
                <Button onClick={saveAssistant}>
                  <Save className="h-4 w-4 mr-2" />
                  {isCreating ? 'Create assistant' : 'Save changes'}
                </Button>
              </CardFooter>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-6 text-center py-10">
                <Settings className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium">No assistants yet</h3>
                <p className="text-muted-foreground mt-2 mb-4">
                  Create your first AI assistant to help with specific tasks.
                </p>
                <Button onClick={createNewAssistant}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create an assistant
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </MainLayout>
  );
};

export default Assistants;
