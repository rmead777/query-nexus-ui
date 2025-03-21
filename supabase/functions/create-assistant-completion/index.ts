
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

// Calculate semantic similarity between two texts (simple version)
function calculateTextSimilarity(text1: string, text2: string): number {
  if (!text1 || !text2) return 0;
  
  // Convert to lowercase for better matching
  const text1Lower = text1.toLowerCase();
  const text2Lower = text2.toLowerCase();
  
  // Extract keywords (words longer than 3 characters)
  const text1Words = text1Lower.split(/\s+/).filter(word => word.length > 3);
  const text2Words = text2Lower.split(/\s+/).filter(word => word.length > 3);
  
  // Count matching words
  let matchCount = 0;
  let totalWords = text1Words.length;
  
  for (const word of text1Words) {
    if (text2Words.includes(word)) {
      matchCount++;
    }
  }
  
  // Prevent division by zero
  if (totalWords === 0) return 0;
  
  // Calculate a similarity score (0-100)
  return Math.min(100, Math.round((matchCount / totalWords) * 100));
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
    let documentSourcesData = [];
    
    if (sources.useDocuments && documentIds && documentIds.length > 0) {
      const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
      
      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      // Log the document IDs we're looking for
      console.log(`Attempting to fetch ${documentIds.length} documents with IDs:`, documentIds);

      // Fetch document content for the provided document IDs
      const { data: documents, error } = await supabase
        .from('documents')
        .select('document_id, name, content, url, type')
        .in('document_id', documentIds);

      if (error) {
        console.error("Error fetching documents:", error);
      }

      if (!error && documents && documents.length > 0) {
        console.log(`Found ${documents.length} documents for context`);
        
        // Check for documents without content
        const docsWithoutContent = documents.filter(doc => !doc.content);
        if (docsWithoutContent.length > 0) {
          console.log(`${docsWithoutContent.length} documents have no content, attempting to process them`);
          
          // Try to process each document that doesn't have content
          for (const doc of docsWithoutContent) {
            try {
              console.log(`Processing document: ${doc.name} (${doc.document_id})`);
              
              // Call the process-document function to extract content
              const { error: processError } = await supabase.functions.invoke('process-document', {
                body: { documentId: doc.document_id }
              });
              
              if (processError) {
                console.error(`Error processing document ${doc.document_id}:`, processError);
              }
            } catch (e) {
              console.error(`Failed to process document ${doc.document_id}:`, e);
            }
          }
          
          // Fetch the documents again to get the updated content
          const { data: updatedDocs, error: refetchError } = await supabase
            .from('documents')
            .select('document_id, name, content, url, type')
            .in('document_id', documentIds);
            
          if (!refetchError && updatedDocs) {
            console.log(`Refetched ${updatedDocs.length} documents after processing`);
            documents.length = 0; // Clear the array
            documents.push(...updatedDocs); // Add the updated documents
          }
        }
        
        // Format document content for inclusion in the prompt
        documentContent = documents.map(doc => {
          if (!doc.content) {
            return `--- Document: ${doc.name} ---\nNo content available for this document.\n\n`;
          }
          return `--- Document: ${doc.name} ---\n${doc.content}\n\n`;
        }).join("\n");
        
        // Calculate relevance scores using the prompt and document content
        documentSourcesData = documents.map(doc => {
          const contentForScoring = doc.content || '';
          
          // Calculate a more accurate relevance score based on text similarity
          let relevanceScore = 60; // Base score
          
          if (contentForScoring && contentForScoring.length > 0 && prompt && prompt.length > 0) {
            // Calculate similarity between prompt and document content
            const similarityScore = calculateTextSimilarity(prompt, contentForScoring);
            
            // Adjust final score to be in range 65-98 based on similarity
            relevanceScore = 65 + Math.min(33, Math.round(similarityScore / 3));
            
            // Boost score for exact keyword matches
            const promptKeywords = prompt.toLowerCase().split(/\s+/).filter(word => word.length > 3);
            for (const keyword of promptKeywords) {
              if (contentForScoring.toLowerCase().includes(keyword)) {
                // Add a small boost for each exact keyword match
                relevanceScore += 2;
              }
            }
            
            // Cap at 98% (save 99-100% for perfect matches)
            relevanceScore = Math.min(98, relevanceScore);
          }
          
          // Make sure each document has a unique score for better visualization
          const randomAdjustment = Math.floor(Math.random() * 3) - 1;
          
          return {
            id: doc.document_id,
            title: doc.name,
            content: (doc.content || '').substring(0, 1000) + ((doc.content || '').length > 1000 ? '...' : ''),
            documentName: doc.name,
            url: doc.url,
            documentType: doc.type || 'unknown',
            relevanceScore: Math.max(60, Math.min(98, relevanceScore + randomAdjustment))
          };
        });
        
        // Sort documents by relevance score (highest first)
        documentSourcesData.sort((a, b) => b.relevanceScore - a.relevanceScore);
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
    
    // Add a specific instruction to make sure the AI tries harder to find information in documents
    if (sources.useDocuments && documentContent) {
      systemContent += " Make sure to thoroughly examine all provided documents for relevant information before responding that you don't have the information.";
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
        hasDocumentContext: true,
        sources: documentSourcesData
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
