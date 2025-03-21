
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { documentId } = await req.json();
    
    console.log(`Processing document with ID: ${documentId}`);
    
    if (!documentId) {
      return new Response(
        JSON.stringify({ error: 'Document ID is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Create a Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the document metadata from the database
    const { data: document, error: documentError } = await supabase
      .from('documents')
      .select('*')
      .eq('document_id', documentId)
      .single();

    if (documentError || !document) {
      console.error('Error fetching document:', documentError);
      return new Response(
        JSON.stringify({ error: 'Document not found', details: documentError }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    console.log(`Found document: ${document.name} (type: ${document.type})`);
    
    let content = null;
    
    // Check if document already has content
    if (document.content) {
      console.log('Document already has content, skipping extraction');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Document already has content',
          content_extracted: true 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // If no content, try to extract it from the URL or storage
    if (document.url) {
      try {
        console.log(`Attempting to fetch content from URL: ${document.url}`);
        const response = await fetch(document.url);
        
        if (response.ok) {
          if (document.type === 'text/plain' || 
              document.name.endsWith('.txt') || 
              document.name.endsWith('.md')) {
            content = await response.text();
            console.log(`Successfully extracted ${content.length} characters of text`);
          } else {
            console.log(`Unsupported document type for direct extraction: ${document.type}`);
            // For other types, we'd need more complex processing
          }
        } else {
          console.error(`Failed to fetch from URL: ${response.status} ${response.statusText}`);
        }
      } catch (fetchError) {
        console.error('Error fetching document content from URL:', fetchError);
      }
    }

    // If still no content and we have user_id, try to get from storage
    if (!content && document.user_id) {
      try {
        const userId = document.user_id;
        const filePath = `${userId}/${documentId}`;
        
        console.log(`Attempting to download from storage: ${filePath}`);
        
        const { data: fileData, error: fileError } = await supabase
          .storage
          .from('documents')
          .download(filePath);

        if (fileError) {
          console.error('Error downloading file from storage:', fileError);
        } else if (fileData) {
          // For text files, extract content
          if (document.type === 'text/plain' || 
              document.name.endsWith('.txt') || 
              document.name.endsWith('.md')) {
            content = await fileData.text();
            console.log(`Successfully extracted ${content.length} characters of text from storage`);
          } else {
            console.log(`Unsupported document type for direct extraction: ${document.type}`);
            // For other types, we'd need more complex processing
          }
        }
      } catch (storageError) {
        console.error('Error accessing storage:', storageError);
      }
    }
    
    // Only update if we extracted content
    if (content) {
      console.log(`Updating document ${documentId} with ${content.length} characters of content`);
      
      // Update the document with the extracted content
      const { error: updateError } = await supabase
        .from('documents')
        .update({ content })
        .eq('document_id', documentId);

      if (updateError) {
        console.error('Error updating document content:', updateError);
        return new Response(
          JSON.stringify({ 
            error: 'Failed to update document content', 
            details: updateError 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        );
      }
      
      console.log('Document content updated successfully');
    } else {
      console.log('No content could be extracted from the document');
    }
    
    // Return success response
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Document processed',
        content_extracted: content !== null,
        document_type: document.type,
        document_name: document.name
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error processing document:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to process document',
        details: error.message 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
