
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Code, Save, X, HelpCircle, ChevronDown } from 'lucide-react';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';

interface AssistantFunction {
  id?: string;
  assistant_id?: string;
  name: string;
  description?: string;
  parameters?: Record<string, any>;
}

interface FunctionEditorDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (func: AssistantFunction) => void;
  initialFunction?: AssistantFunction;
}

const defaultParameters = {
  type: 'object',
  properties: {
    param1: {
      type: 'string',
      description: 'Description of parameter 1',
    }
  },
  required: []
};

const sampleFunction = {
  name: 'get_stock_price',
  description: 'Get the current stock price',
  parameters: {
    type: 'object',
    properties: {
      symbol: {
        type: 'string',
        description: 'The stock symbol like MSFT',
      }
    },
    required: ['symbol']
  }
};

export function FunctionEditorDialog({
  isOpen,
  onClose,
  onSave,
  initialFunction
}: FunctionEditorDialogProps) {
  const [activeTab, setActiveTab] = useState('custom');
  const [functionName, setFunctionName] = useState('');
  const [description, setDescription] = useState('');
  const [parametersJson, setParametersJson] = useState('');
  const [jsonError, setJsonError] = useState('');

  useEffect(() => {
    if (initialFunction) {
      setFunctionName(initialFunction.name);
      setDescription(initialFunction.description || '');
      setParametersJson(JSON.stringify(initialFunction.parameters || defaultParameters, null, 2));
    } else {
      setFunctionName('');
      setDescription('');
      setParametersJson(JSON.stringify(defaultParameters, null, 2));
    }
    setJsonError('');
  }, [initialFunction, isOpen]);

  const handleSampleClick = () => {
    setFunctionName(sampleFunction.name);
    setDescription(sampleFunction.description || '');
    setParametersJson(JSON.stringify(sampleFunction.parameters, null, 2));
  };

  const validateJson = (json: string): boolean => {
    try {
      JSON.parse(json);
      setJsonError('');
      return true;
    } catch (e) {
      setJsonError('Invalid JSON format: ' + (e as Error).message);
      return false;
    }
  };

  const handleSave = () => {
    if (!functionName.trim()) {
      setJsonError('Function name is required');
      return;
    }

    if (!validateJson(parametersJson)) {
      return;
    }

    const newFunction: AssistantFunction = {
      ...initialFunction,
      name: functionName.trim(),
      description: description.trim(),
      parameters: JSON.parse(parametersJson)
    };

    onSave(newFunction);
    onClose();
  };

  // Function to format the JSON with line numbers and syntax highlighting
  const renderCodeWithLineNumbers = () => {
    const lines = parametersJson.split('\n');
    
    return (
      <div className="relative font-mono text-sm">
        <div className="flex">
          <div className="pr-4 text-right text-muted-foreground select-none w-8">
            {lines.map((_, i) => (
              <div key={i} className="h-6 leading-6">{i + 1}</div>
            ))}
          </div>
          <div className="flex-1 overflow-auto">
            <Textarea
              value={parametersJson}
              onChange={(e) => {
                setParametersJson(e.target.value);
                if (jsonError) validateJson(e.target.value);
              }}
              className="font-mono text-sm min-h-[360px] resize-none p-0 border-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 leading-6"
              style={{ height: `${lines.length * 24}px` }}
            />
          </div>
        </div>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {initialFunction ? 'Edit Function' : 'Add a custom function trigger'}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="custom" value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="custom">Custom</TabsTrigger>
            <TabsTrigger value="logic">Logic Apps</TabsTrigger>
          </TabsList>
          
          <TabsContent value="custom" className="space-y-5">
            <div className="text-sm text-muted-foreground">
              Intelligently call functions to perform tasks based on the conversation. Create your own trigger by defining your schema, or by customizing an example. The assistant would output the function arguments but would never run the function itself.
            </div>
            
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-1 h-8"
              onClick={handleSampleClick}
            >
              Try an example
            </Button>

            <div className="space-y-3 mt-4">
              <div>
                <Label htmlFor="function-name">Function name</Label>
                <Input
                  id="function-name"
                  value={functionName}
                  onChange={(e) => setFunctionName(e.target.value)}
                  placeholder="e.g. get_weather"
                  className="font-mono"
                />
              </div>
              
              <div>
                <Label htmlFor="function-description">Description</Label>
                <Input
                  id="function-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Get the current weather in a location"
                />
              </div>
              
              <div>
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-1.5">
                    <Label htmlFor="function-parameters">Function specification</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-5 w-5">
                          <HelpCircle className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-80">
                        <div className="space-y-2">
                          <h4 className="font-semibold">JSON Schema Format</h4>
                          <p className="text-sm">Define the parameters your function expects using JSON Schema format. Include types, descriptions, and required fields.</p>
                          <p className="text-sm text-muted-foreground">Learn more about <a href="#" className="underline">JSON Schema</a></p>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    <Code className="inline h-3 w-3 mr-1" />
                    JSON
                  </div>
                </div>
                
                <div className="border rounded-md p-2 bg-background overflow-auto">
                  {renderCodeWithLineNumbers()}
                </div>
                
                {jsonError && (
                  <p className="text-destructive text-sm mt-1">{jsonError}</p>
                )}
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="logic" className="h-[300px] flex items-center justify-center">
            <div className="text-center">
              <Code className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium">Logic Apps Integration</h3>
              <p className="text-muted-foreground mt-2 max-w-md">
                This feature allows you to connect to external logic apps.
                Coming soon!
              </p>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            <X className="h-4 w-4 mr-2" /> Cancel
          </Button>
          <Button onClick={handleSave}>
            <Save className="h-4 w-4 mr-2" /> Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
