import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Slider } from "@/components/ui/slider";

const formSchema = z.object({
  model: z.string().min(1, "Model is required"),
  temperature: z.number().min(0).max(2),
  max_tokens: z.number().min(100).max(8000),
  instructions: z.string().optional(),
  useDocuments: z.boolean().default(true),
  useKnowledgeBase: z.boolean().default(true),
  useExternalSearch: z.boolean().default(false),
  autoSaveConversations: z.boolean().default(true),
  showCitations: z.boolean().default(true),
  citationStyle: z.string().default("inline"),
});

export function PreferencesTab() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      model: "gpt-4o-mini",
      temperature: 0.7,
      max_tokens: 2048,
      instructions: "You are a helpful assistant that provides accurate and concise information.",
      useDocuments: true,
      useKnowledgeBase: true,
      useExternalSearch: false,
      autoSaveConversations: true,
      showCitations: true,
      citationStyle: "inline",
    },
  });

  useEffect(() => {
    const fetchSettings = async () => {
      if (!user) return;

      try {
        setIsLoadingSettings(true);
        const { data, error } = await supabase
          .from("user_settings")
          .select("*")
          .eq("user_id", user.id)
          .single();

        if (error) {
          console.error("Error fetching settings:", error);
          return;
        }

        if (data) {
          form.reset({
            model: data.model || "gpt-4o-mini",
            temperature: data.temperature || 0.7,
            max_tokens: data.max_tokens || 2048,
            instructions: data.instructions || "You are a helpful assistant that provides accurate and concise information.",
            useDocuments: data.response_sources?.useDocuments !== false,
            useKnowledgeBase: data.response_sources?.useKnowledgeBase !== false,
            useExternalSearch: data.response_sources?.useExternalSearch === true,
            autoSaveConversations: data.auto_save_conversations !== false,
            showCitations: data.show_citations !== false,
            citationStyle: data.citation_style || "inline",
          });
        }
      } catch (error) {
        console.error("Error fetching settings:", error);
      } finally {
        setIsLoadingSettings(false);
      }
    };

    fetchSettings();
  }, [user, form]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!user) return;

    setIsLoading(true);

    try {
      const { error } = await supabase
        .from("user_settings")
        .upsert({
          user_id: user.id,
          model: values.model,
          temperature: values.temperature,
          max_tokens: values.max_tokens,
          instructions: values.instructions,
          response_sources: {
            useDocuments: values.useDocuments,
            useKnowledgeBase: values.useKnowledgeBase,
            useExternalSearch: values.useExternalSearch,
          },
          auto_save_conversations: values.autoSaveConversations,
          show_citations: values.showCitations,
          citation_style: values.citationStyle,
        });

      if (error) throw error;

      // Save autoSaveConversations to localStorage for immediate use
      localStorage.setItem('autoSaveConversations', values.autoSaveConversations.toString());

      toast({
        title: "Settings saved",
        description: "Your preferences have been updated successfully.",
      });
    } catch (error) {
      console.error("Error saving settings:", error);
      toast({
        title: "Error",
        description: "Failed to save settings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">AI Preferences</h3>
        <p className="text-sm text-muted-foreground">
          Customize how the AI responds to your queries and manages your data.
        </p>
      </div>

      {isLoadingSettings ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <Accordion type="single" collapsible defaultValue="model">
              <AccordionItem value="model">
                <AccordionTrigger>Model Settings</AccordionTrigger>
                <AccordionContent className="space-y-4 pt-4">
                  <FormField
                    control={form.control}
                    name="model"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>AI Model</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a model" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="gpt-4o">GPT-4o</SelectItem>
                            <SelectItem value="gpt-4o-mini">GPT-4o Mini</SelectItem>
                            <SelectItem value="gpt-4">GPT-4</SelectItem>
                            <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
                            <SelectItem value="claude-3-opus">Claude 3 Opus</SelectItem>
                            <SelectItem value="claude-3-sonnet">Claude 3 Sonnet</SelectItem>
                            <SelectItem value="claude-3-haiku">Claude 3 Haiku</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Select the AI model to use for generating responses.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="temperature"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Temperature: {field.value.toFixed(1)}</FormLabel>
                        <FormControl>
                          <Slider
                            min={0}
                            max={2}
                            step={0.1}
                            defaultValue={[field.value]}
                            onValueChange={(values) => field.onChange(values[0])}
                          />
                        </FormControl>
                        <FormDescription className="flex justify-between">
                          <span>More precise</span>
                          <span>More creative</span>
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="max_tokens"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Max Response Length: {field.value}</FormLabel>
                        <FormControl>
                          <Slider
                            min={100}
                            max={8000}
                            step={100}
                            defaultValue={[field.value]}
                            onValueChange={(values) => field.onChange(values[0])}
                          />
                        </FormControl>
                        <FormDescription className="flex justify-between">
                          <span>Shorter</span>
                          <span>Longer</span>
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="instructions"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>System Instructions</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Instructions for the AI"
                            className="resize-y min-h-[100px]"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Custom instructions that guide how the AI responds to you.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="sources">
                <AccordionTrigger>Response Sources</AccordionTrigger>
                <AccordionContent className="space-y-4 pt-4">
                  <FormField
                    control={form.control}
                    name="useDocuments"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Use My Documents</FormLabel>
                          <FormDescription>
                            Allow the AI to reference documents you've uploaded.
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="useKnowledgeBase"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Use Knowledge Base</FormLabel>
                          <FormDescription>
                            Allow the AI to use its built-in knowledge.
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="useExternalSearch"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Use Web Search</FormLabel>
                          <FormDescription>
                            Allow the AI to search the web for current information.
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="citations">
                <AccordionTrigger>Citations & References</AccordionTrigger>
                <AccordionContent className="space-y-4 pt-4">
                  <FormField
                    control={form.control}
                    name="showCitations"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Show Citations</FormLabel>
                          <FormDescription>
                            Include citations in AI responses when information comes from your documents.
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="citationStyle"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Citation Style</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          disabled={!form.watch("showCitations")}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select citation style" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="inline">Inline Citations [1]</SelectItem>
                            <SelectItem value="footnote">Footnote Citations</SelectItem>
                            <SelectItem value="parenthetical">(Parenthetical Citations)</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Choose how citations appear in responses.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="conversations">
                <AccordionTrigger>Conversation Settings</AccordionTrigger>
                <AccordionContent className="space-y-4 pt-4">
                  <FormField
                    control={form.control}
                    name="autoSaveConversations"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Auto-save Conversations</FormLabel>
                          <FormDescription>
                            Automatically save your conversations for future reference.
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            <Button type="submit" disabled={isLoading} className="w-full sm:w-auto">
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Preferences
                </>
              )}
            </Button>
          </form>
        </Form>
      )}
    </div>
  );
}
