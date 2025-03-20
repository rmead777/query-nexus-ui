
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
        JSON.stringify({ error: 'Document not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    // Get the file from storage
    const userId = document.user_id;
    const filePath = `${userId}/${documentId}`;
    
    const { data: fileData, error: fileError } = await supabase
      .storage
      .from('documents')
      .download(filePath);

    if (fileError || !fileData) {
      console.error('Error fetching file:', fileError);
      return new Response(
        JSON.stringify({ error: 'File not found in storage' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    // Extract content based on file type
    let content = null;
    
    // For text files, we can extract and store the content directly
    if (document.type === 'txt' || document.type === 'text/plain' || 
        document.name.endsWith('.txt') || document.name.endsWith('.md')) {
      content = await fileData.text();
    }
    // For other document types, we would typically use dedicated libraries
    // This would require more complex processing with specialized libraries
    // For now, we'll just handle text files, but this can be expanded
    
    // Only update if we extracted content
    if (content) {
      // Update the document with the extracted content
      const { error: updateError } = await supabase
        .from('documents')
        .update({ content })
        .eq('document_id', documentId);

      if (updateError) {
        console.error('Error updating document content:', updateError);
        return new Response(
          JSON.stringify({ error: 'Failed to update document content' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        );
      }
    }
    
    // Return success response
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Document processed successfully',
        content_extracted: content !== null 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error processing document:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to process document' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
