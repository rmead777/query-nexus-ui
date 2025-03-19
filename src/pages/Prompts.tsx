
import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Check, Info, PlusCircle, Save, Trash2 } from 'lucide-react';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/ui/tooltip';
import { useToast } from '@/components/ui/use-toast';

interface PromptTemplate {
  id: string;
  name: string;
  content: string;
  isActive: boolean;
}

const Prompts = () => {
  const [templates, setTemplates] = useState<PromptTemplate[]>([
    {
      id: '1',
      name: 'Default System Prompt',
      content: 'You are a helpful assistant that provides accurate, factual information based on the documents and knowledge available to you. Always cite your sources when providing information.',
      isActive: true
    },
    {
      id: '2',
      name: 'Technical Documentation Analysis',
      content: 'Analyze technical documentation with a focus on clarity, accuracy, and completeness. Identify key concepts, define technical terms, and highlight relationships between components. Provide suggestions for improvements where applicable.',
      isActive: false
    }
  ]);
  
  const [editingTemplate, setEditingTemplate] = useState<PromptTemplate>({
    id: '',
    name: '',
    content: '',
    isActive: false
  });
  
  const [isEditing, setIsEditing] = useState(false);
  const { toast } = useToast();
  
  const handleAddNew = () => {
    setIsEditing(true);
    setEditingTemplate({
      id: Math.random().toString(36).substring(2, 9),
      name: '',
      content: '',
      isActive: false
    });
  };
  
  const handleEdit = (template: PromptTemplate) => {
    setIsEditing(true);
    setEditingTemplate({ ...template });
  };
  
  const handleToggleActive = (id: string, newState: boolean) => {
    setTemplates(templates.map(template => 
      template.id === id ? { ...template, isActive: newState } : template
    ));
    
    toast({
      title: newState ? "Prompt Activated" : "Prompt Deactivated",
      description: `The prompt template "${templates.find(t => t.id === id)?.name}" has been ${newState ? 'activated' : 'deactivated'}.`,
    });
  };
  
  const handleDelete = (id: string) => {
    const templateName = templates.find(t => t.id === id)?.name;
    setTemplates(templates.filter(template => template.id !== id));
    
    toast({
      title: "Prompt Deleted",
      description: `The prompt template "${templateName}" has been deleted.`,
    });
  };
  
  const handleSave = () => {
    if (!editingTemplate.name.trim() || !editingTemplate.content.trim()) {
      toast({
        title: "Validation Error",
        description: "Please provide both a name and content for the prompt template.",
        variant: "destructive"
      });
      return;
    }
    
    const isNew = !templates.some(t => t.id === editingTemplate.id);
    
    if (isNew) {
      setTemplates([...templates, editingTemplate]);
    } else {
      setTemplates(templates.map(template => 
        template.id === editingTemplate.id ? editingTemplate : template
      ));
    }
    
    setIsEditing(false);
    
    toast({
      title: isNew ? "Prompt Created" : "Prompt Updated",
      description: `The prompt template "${editingTemplate.name}" has been ${isNew ? 'created' : 'updated'}.`,
    });
  };
  
  return (
    <MainLayout>
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Master Prompts</h1>
            <p className="text-muted-foreground mt-1">
              Create and manage prompt templates that will be applied to every conversation.
            </p>
          </div>
          
          <Button onClick={handleAddNew} className="gap-1.5">
            <PlusCircle className="h-4 w-4" />
            Add New
          </Button>
        </div>
        
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle>What are Master Prompts?</CardTitle>
                <CardDescription>
                  Master prompts serve as persistent instructions for the AI system.
                </CardDescription>
              </div>
              <Info className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm">
              Master prompts are system-level instructions that apply to all conversations. 
              They help guide the AI's behavior, tone, and approach when responding to user queries. 
              You can create multiple prompt templates and activate the ones you want to use.
              Active prompts will be combined and sent with every user query.
            </p>
          </CardContent>
        </Card>
        
        {isEditing ? (
          <Card className="animate-fade-in">
            <CardHeader>
              <CardTitle>
                {editingTemplate.id ? 'Edit Prompt Template' : 'Create New Prompt Template'}
              </CardTitle>
              <CardDescription>
                Define a new master prompt template that will persist across conversations.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="prompt-name">Template Name</Label>
                <Input
                  id="prompt-name"
                  value={editingTemplate.name}
                  onChange={(e) => setEditingTemplate({...editingTemplate, name: e.target.value})}
                  placeholder="E.g., Technical Documentation Analysis"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="prompt-content">Prompt Content</Label>
                <Textarea
                  id="prompt-content"
                  value={editingTemplate.content}
                  onChange={(e) => setEditingTemplate({...editingTemplate, content: e.target.value})}
                  placeholder="Enter the master prompt instructions here..."
                  className="min-h-[150px]"
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="prompt-active"
                  checked={editingTemplate.isActive}
                  onCheckedChange={(checked) => setEditingTemplate({...editingTemplate, isActive: checked})}
                />
                <Label htmlFor="prompt-active">Activate this prompt template</Label>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsEditing(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave}>
                <Save className="h-4 w-4 mr-2" />
                Save Template
              </Button>
            </CardFooter>
          </Card>
        ) : (
          <div className="space-y-4">
            {templates.map((template) => (
              <Card 
                key={template.id}
                className="overflow-hidden transition-all duration-200 hover:shadow-md"
              >
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <CardTitle className="flex items-center gap-2">
                        {template.name}
                        {template.isActive && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            <Check className="h-3 w-3 mr-1" />
                            Active
                          </span>
                        )}
                      </CardTitle>
                    </div>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            variant="destructive" 
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => handleDelete(template.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Delete this template</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </CardHeader>
                <Separator />
                <CardContent className="pt-4 pb-2">
                  <ScrollArea className="h-[100px]">
                    <div className="text-sm whitespace-pre-wrap">
                      {template.content}
                    </div>
                  </ScrollArea>
                </CardContent>
                <CardFooter className="flex justify-between pt-2">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id={`activate-${template.id}`}
                      checked={template.isActive}
                      onCheckedChange={(checked) => handleToggleActive(template.id, checked)}
                    />
                    <Label htmlFor={`activate-${template.id}`}>
                      {template.isActive ? 'Active' : 'Inactive'}
                    </Label>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => handleEdit(template)}>
                    Edit
                  </Button>
                </CardFooter>
              </Card>
            ))}
            
            {templates.length === 0 && (
              <div className="text-center py-12">
                <div className="mb-4 text-muted-foreground">
                  No prompt templates have been created yet.
                </div>
                <Button onClick={handleAddNew} variant="outline">
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Create Your First Template
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default Prompts;
