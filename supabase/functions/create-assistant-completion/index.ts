
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helper function to replace template placeholders
function formatTemplate(template: any, values: Record<string, any>): any {
  if (typeof template === 'string') {
    let result = template;
    for (const [key, value] of Object.entries(values)) {
      result = result.replace(`{${key}}`, value);
    }
    return result;
  } else if (Array.isArray(template)) {
    return template.map(item => formatTemplate(item, values));
  } else if (typeof template === 'object' && template !== null) {
    const result: Record<string, any> = {};
    for (const [key, value] of Object.entries(template)) {
      result[key] = formatTemplate(value, values);
    }
    return result;
  }
  return template;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not set');
    }

    const { 
      prompt, 
      model, 
      temperature, 
      top_p, 
      max_tokens, 
      instructions,
      functions,
      documentIds = [],
      sources = {
        useDocuments: true,
        useKnowledgeBase: true, 
        useExternalSearch: false
      },
      requestTemplate,
      apiEndpoint,
      apiKey,
      provider
    } = await req.json();

    console.log("Processing request with documents:", documentIds);

    // Create Supabase client to access documents if needed
    let documentContent = "";
    if (sources.useDocuments && documentIds && documentIds.length > 0) {
      const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
      
      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      // Fetch document content for the provided document IDs
      const { data: documents, error } = await supabase
        .from('documents')
        .select('name, content')
        .in('document_id', documentIds)
        .not('content', 'is', null);

      if (error) {
        console.error("Error fetching documents:", error);
      }

      if (!error && documents && documents.length > 0) {
        console.log(`Found ${documents.length} documents for context`);
        
        // Format document content for inclusion in the prompt
        documentContent = documents.map(doc => {
          return `--- Document: ${doc.name} ---\n${doc.content}\n\n`;
        }).join("\n");
      } else {
        console.log("No document content found for IDs:", documentIds);
      }
    }

    // Modify system instructions based on source settings and add document content
    let systemContent = instructions || "You are a helpful assistant.";
    
    if (sources.useDocuments && !sources.useKnowledgeBase && !sources.useExternalSearch) {
      systemContent += " Only use information found in the provided documents to answer questions. If the information is not in the documents, say you don't have that information rather than using your general knowledge.";
    } else if (sources.useDocuments && sources.useKnowledgeBase && !sources.useExternalSearch) {
      systemContent += " Prioritize information from the provided documents when answering, but you can also use your built-in knowledge when necessary.";
    } else if (sources.useDocuments && sources.useKnowledgeBase && sources.useExternalSearch) {
      systemContent += " Use information from provided documents, your knowledge base, and information from external searches to provide comprehensive answers.";
    }

    // Handle custom request template if provided
    let requestBody: any;
    let endpoint = apiEndpoint || "https://api.openai.com/v1/chat/completions";
    let requestHeaders: Record<string, string> = {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey || OPENAI_API_KEY}`
    };

    if (requestTemplate) {
      console.log("Using custom request template");
      
      // Prepare values for template placeholders
      const templateValues = {
        model: model || "gpt-4o-mini",
        prompt: prompt,
        instructions: systemContent,
        temperature: temperature !== undefined ? temperature : 0.7,
        max_tokens: max_tokens || 2048
      };
      
      // Format the template with the values
      requestBody = formatTemplate(requestTemplate, templateValues);
      
      console.log("Formatted request:", JSON.stringify(requestBody, null, 2));
    } else {
      // Default OpenAI format
      // Create messages array, including document content if available
      const messages = [
        { role: "system", content: systemContent }
      ];

      // Add document content as a system message if available
      if (documentContent) {
        console.log("Adding document content to the prompt");
        messages.push({ 
          role: "system", 
          content: `Here are the relevant documents to use for answering the user's question:\n\n${documentContent}`
        });
      }

      // Add the user's prompt
      messages.push({ role: "user", content: prompt });

      // Default OpenAI request format
      requestBody = {
        model: model || "gpt-4o-mini",
        messages,
        temperature: temperature !== undefined ? temperature : 0.7,
        top_p: top_p !== undefined ? top_p : 1,
        max_tokens: max_tokens || 2048,
      };

      if (functions && functions.length > 0) {
        requestBody.tools = functions.map((func: any) => ({
          type: "function",
          function: {
            name: func.name,
            description: func.description,
            parameters: func.parameters || { type: "object", properties: {} }
          }
        }));
      }
    }

    // Adjust request based on provider if using custom provider with specific endpoint
    if (provider === "Custom") {
      // Check if endpoint contains 'azure' in the URL, which might indicate Azure OpenAI
      if (endpoint.includes("azure")) {
        // Azure OpenAI service requires different parameter names
        console.log("Using Azure OpenAI format");
        // No changes needed here - Azure now uses the same format as OpenAI
      } else if (endpoint.includes("responses")) {
        // This appears to be a custom endpoint that might require 'input' parameter
        console.log("Using custom responses endpoint format");
        
        // If no custom template, convert to expected format
        if (!requestTemplate) {
          // Add 'input' parameter required by some APIs
          requestBody = {
            input: prompt,
            model: model || "gpt-4o-mini",
            instructions: systemContent,
            temperature: temperature !== undefined ? temperature : 0.7,
            max_tokens: max_tokens || 2048
          };
        }
      }
    } else if (provider === "OpenAI") {
      // Make sure the endpoint is correctly formed for OpenAI chat completions
      if (!endpoint.endsWith("chat/completions") && !endpoint.endsWith("/")) {
        endpoint = endpoint + "/chat/completions";
      } else if (endpoint.endsWith("/")) {
        endpoint = endpoint + "chat/completions";
      }
    }

    console.log("Provider:", provider);
    console.log("Endpoint:", endpoint);
    console.log("Sending request to AI provider:", JSON.stringify(requestBody, null, 2));

    const response = await fetch(endpoint, {
      method: "POST",
      headers: requestHeaders,
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Error response:", errorText);
      let errorObj;
      try {
        errorObj = JSON.parse(errorText);
      } catch (e) {
        errorObj = { error: errorText };
      }
      throw new Error(`API error: ${errorObj.error?.message || errorObj.error || response.statusText}`);
    }

    const data = await response.json();
    
    console.log("AI provider response:", JSON.stringify(data, null, 2));

    // Prepare response with sources information
    let responseData = data;
    
    // If we have document content, add sources information
    if (documentContent && documentIds.length > 0) {
      responseData = {
        ...data,
        documentIdsUsed: documentIds,
        hasDocumentContext: true
      };
    }

    return new Response(JSON.stringify(responseData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});
