
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { defaultRequestTemplates, RequestTemplate } from '@/types/api';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info, AlertCircle } from 'lucide-react';

interface RequestTemplateEditorProps {
  initialValue: Record<string, any> | null;
  provider: string;
  onChange: (value: Record<string, any>) => void;
}

export function RequestTemplateEditor({ initialValue, provider, onChange }: RequestTemplateEditorProps) {
  const [jsonValue, setJsonValue] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  
  const providerTemplates = defaultRequestTemplates.filter(
    template => template.provider === provider || provider === 'Custom'
  );

  useEffect(() => {
    if (initialValue) {
      try {
        setJsonValue(JSON.stringify(initialValue, null, 2));
        setError(null);
      } catch (e) {
        setError('Invalid JSON structure');
      }
    } else if (providerTemplates.length > 0) {
      setJsonValue(JSON.stringify(providerTemplates[0].template, null, 2));
    }
  }, [initialValue]);

  const handleTemplateSelect = (templateName: string) => {
    setSelectedTemplate(templateName);
    const template = defaultRequestTemplates.find(t => t.name === templateName);
    if (template) {
      setJsonValue(JSON.stringify(template.template, null, 2));
      setError(null);
      onChange(template.template);
    }
  };

  const handleJsonChange = (value: string) => {
    setJsonValue(value);
    try {
      const parsed = JSON.parse(value);
      setError(null);
      onChange(parsed);
    } catch (e) {
      setError('Invalid JSON structure');
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-lg">Request Template</CardTitle>
        <CardDescription>
          Customize how requests are sent to the AI model
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="template-select">Template</Label>
          <Select 
            value={selectedTemplate || ''} 
            onValueChange={handleTemplateSelect}
          >
            <SelectTrigger id="template-select">
              <SelectValue placeholder="Select a template" />
            </SelectTrigger>
            <SelectContent>
              {providerTemplates.map((template) => (
                <SelectItem key={template.name} value={template.name}>
                  {template.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <Label htmlFor="json-editor">JSON Template</Label>
            <span className="text-xs text-muted-foreground">Use {'{model}'}, {'{prompt}'}, and {'{instructions}'} as placeholders</span>
          </div>
          <Textarea
            id="json-editor"
            className="font-mono h-64 whitespace-pre"
            value={jsonValue}
            onChange={(e) => handleJsonChange(e.target.value)}
          />
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            The placeholders {'{model}'}, {'{prompt}'}, and {'{instructions}'} will be replaced with actual values when sending the request.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
