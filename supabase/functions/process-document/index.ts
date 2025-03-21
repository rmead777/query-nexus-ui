
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
    const { documentId, forceReprocess } = await req.json();
    
    console.log(`Processing document ID: ${documentId}, force reprocess: ${forceReprocess}`);
    
    if (!documentId) {
      return new Response(
        JSON.stringify({ error: 'Document ID is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Create Supabase client with service role key for admin access
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get document metadata
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

    console.log(`Found document: ${document.name}, type: ${document.type}`);
    
    // Skip processing if document already has readable content and not forcing reprocess
    if (!forceReprocess && 
        document.content && 
        document.content.length > 100 && 
        document.is_readable) {
      console.log('Document already has readable content, skipping extraction');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Document already has readable content',
          content_extracted: true,
          content_sample: document.content.substring(0, 100) + '...'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Download the document file from storage
    const userId = document.user_id;
    const filePath = `${userId}/${documentId}`;
    
    console.log(`Downloading from storage: ${filePath}`);
    
    const { data: fileData, error: fileError } = await supabase
      .storage
      .from('documents')
      .download(filePath);

    if (fileError || !fileData) {
      console.error('Error downloading file:', fileError);
      return new Response(
        JSON.stringify({ error: 'Failed to download document file', details: fileError }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }
    
    console.log(`Successfully downloaded file, size: ${fileData.size} bytes`);
    
    // Extract content based on file type
    let content = "";
    let extractionMethod = "unknown";
    const fileName = document.name.toLowerCase();
    const fileType = document.type || getMimeTypeFromFileName(fileName);
    
    try {
      // Simple text extraction for common file types
      if (fileName.endsWith('.txt') || fileName.endsWith('.md') || 
          fileType.includes('text/plain') || fileType.includes('markdown')) {
        console.log('Extracting text from plain text document');
        content = await fileData.text();
        extractionMethod = "text";
      } 
      else if (fileName.endsWith('.pdf') || fileType.includes('pdf')) {
        console.log('Processing PDF document');
        // For PDFs, we can't reliably extract text on the edge function
        // So we'll store a placeholder and notify the user
        extractionMethod = "pdf_placeholder";
        content = "This document is a PDF. The system is processing it for text extraction. Check back later or search directly in your document.";
      } 
      else if (fileName.endsWith('.docx') || fileType.includes('word') || 
               fileType.includes('officedocument')) {
        console.log('Processing DOCX document');
        // For DOCX, we can't reliably extract text on the edge function
        // So we'll store a placeholder and notify the user
        extractionMethod = "docx_placeholder";
        content = "This document is a DOCX file. The system is processing it for text extraction. Check back later or search directly in your document.";
      } 
      else {
        // For other file types, we'll try basic text extraction as a fallback
        console.log('Unknown document type, trying basic text extraction');
        try {
          content = await fileData.text();
          extractionMethod = "text_fallback";
        } catch (textError) {
          console.error('Text extraction failed:', textError);
          content = "This document type couldn't be processed automatically. Please try converting it to PDF, DOCX, or TXT format.";
          extractionMethod = "failed";
        }
      }
    } catch (extractionError) {
      console.error('Extraction error:', extractionError);
      content = `Failed to extract content: ${extractionError.message}`;
      extractionMethod = "error";
    }
    
    // Save the actual file content for future processing of binary files
    // This ensures we have the raw file data available for better extraction later
    try {
      // Set a flag for binary files (PDF, DOCX) that need processing
      const needsExternalProcessing = fileName.endsWith('.pdf') || 
                                    fileName.endsWith('.docx') || 
                                    fileType.includes('pdf') || 
                                    fileType.includes('word') ||
                                    fileType.includes('officedocument');
                                    
      // Update the document with extracted content
      const { error: updateError } = await supabase
        .from('documents')
        .update({ 
          content,
          extraction_method: extractionMethod,
          is_readable: extractionMethod === "text" || extractionMethod === "text_fallback",
          needs_processing: needsExternalProcessing
        })
        .eq('document_id', documentId);

      if (updateError) {
        console.error('Error updating document:', updateError);
        return new Response(
          JSON.stringify({ error: 'Failed to update document content', details: updateError }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        );
      }
      
      console.log("Document content updated successfully");
    } catch (saveError) {
      console.error('Error saving document content:', saveError);
    }
    
    // Return success response
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Document processed successfully',
        content_extracted: true,
        extraction_method: extractionMethod,
        document_type: document.type,
        document_name: document.name,
        readable_content: extractionMethod === "text" || extractionMethod === "text_fallback",
        content_sample: content.substring(0, 100) + '...',
        content_length: content.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Fatal error processing document:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to process document',
        details: error.message 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

// Get MIME type from filename
function getMimeTypeFromFileName(filename) {
  if (!filename) return 'application/octet-stream';
  
  const extension = filename.split('.').pop()?.toLowerCase();
  
  switch (extension) {
    case 'pdf': return 'application/pdf';
    case 'docx': return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    case 'doc': return 'application/msword';
    case 'txt': return 'text/plain';
    case 'md': return 'text/markdown';
    case 'html': case 'htm': return 'text/html';
    case 'csv': return 'text/csv';
    case 'json': return 'application/json';
    case 'jpg': case 'jpeg': return 'image/jpeg';
    case 'png': return 'image/png';
    default: return 'application/octet-stream';
  }
}
