
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import * as mammoth from "https://esm.sh/mammoth@1.6.0";
import * as pdfParse from "https://esm.sh/pdf-parse@1.1.1";

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
    let isReadable = false;
    const fileName = document.name.toLowerCase();
    const fileType = document.type || getMimeTypeFromFileName(fileName);
    
    try {
      // Convert blob to ArrayBuffer for processing
      const arrayBuffer = await fileData.arrayBuffer();
      
      // Process based on file type
      if (fileName.endsWith('.txt') || 
          fileName.endsWith('.md') || 
          fileType.includes('text/plain') || 
          fileType.includes('markdown')) {
        console.log('Extracting text from plain text document');
        // For text files, we can safely use text decoding
        const textDecoder = new TextDecoder('utf-8');
        content = textDecoder.decode(arrayBuffer);
        extractionMethod = "text";
        isReadable = true;
      } 
      else if (fileName.endsWith('.pdf') || fileType.includes('pdf')) {
        console.log('Processing PDF document with pdf-parse');
        try {
          // Use pdf-parse to extract text from PDF
          const pdfData = await pdfParse.default(new Uint8Array(arrayBuffer));
          content = pdfData.text || "";
          
          // Check if we got meaningful content
          if (content && content.trim().length > 100) {
            extractionMethod = "pdf_extracted";
            isReadable = true;
            console.log(`Successfully extracted PDF text, length: ${content.length} chars`);
          } else {
            extractionMethod = "pdf_extraction_failed";
            content = "This PDF document could not be parsed automatically. It may be a scanned document requiring OCR processing.";
            isReadable = false;
          }
        } catch (pdfError) {
          console.error('PDF extraction error:', pdfError);
          extractionMethod = "pdf_extraction_error";
          content = "There was an error processing this PDF document. It may require specialized handling.";
          isReadable = false;
        }
      } 
      else if (fileName.endsWith('.docx') || 
                fileType.includes('word') || 
                fileType.includes('officedocument')) {
        console.log('Processing DOCX document with mammoth');
        try {
          // Use mammoth to extract text from DOCX
          const result = await mammoth.extractRawText({ arrayBuffer });
          content = result.value || "";
          
          // Check if we got meaningful content
          if (content && content.trim().length > 50) {
            extractionMethod = "docx_extracted";
            isReadable = true;
            console.log(`Successfully extracted DOCX text, length: ${content.length} chars`);
          } else {
            extractionMethod = "docx_extraction_failed";
            content = "This DOCX document could not be parsed automatically. It may require specialized handling.";
            isReadable = false;
          }
        } catch (docxError) {
          console.error('DOCX extraction error:', docxError);
          extractionMethod = "docx_extraction_error";
          content = "There was an error processing this DOCX document. It may require specialized handling.";
          isReadable = false;
        }
      } 
      else {
        // For other files, we don't attempt text extraction
        console.log('Unknown document type - cannot extract text');
        extractionMethod = "unsupported_format";
        content = "This document type is not supported for automatic text extraction.";
        isReadable = false;
      }
    } catch (extractionError) {
      console.error('Extraction error:', extractionError);
      extractionMethod = "error";
      content = "There was an error processing this document. It may require specialized handling.";
      isReadable = false;
    }
    
    // Update the document with extracted content
    try {                         
      const { error: updateError } = await supabase
        .from('documents')
        .update({ 
          content,
          extraction_method: extractionMethod,
          is_readable: isReadable,
          needs_processing: !isReadable
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
        content_extracted: isReadable,
        extraction_method: extractionMethod,
        document_type: document.type,
        document_name: document.name,
        readable_content: isReadable,
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
