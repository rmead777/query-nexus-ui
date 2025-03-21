import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper function to extract meaningful content from HTML
function extractTextFromHTML(html: string): string {
  // Remove script and style tags and their content
  let text = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ');
  text = text.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ');
  
  // Remove HTML tags
  text = text.replace(/<\/?[^>]+(>|$)/g, ' ');
  
  // Replace multiple spaces with a single space
  text = text.replace(/\s+/g, ' ');
  
  // Decode HTML entities
  text = text.replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
  
  return text.trim();
}

// Simple parser for extracting text from PDFs
function extractTextFromPDF(buffer: ArrayBuffer): string {
  // This is a simplified approach - in a real application, you would use a dedicated PDF parsing library
  // Convert buffer to string and look for text content
  const text = new TextDecoder().decode(buffer);
  
  // Look for text blocks in the PDF string representation
  // This is not a complete solution but can extract some plain text
  let extractedText = '';
  
  // Find text blocks between BT and ET markers
  const textMatches = text.match(/BT([\s\S]*?)ET/g);
  if (textMatches) {
    for (const match of textMatches) {
      // Extract text strings (usually between parentheses or angle brackets)
      const stringMatches = match.match(/\((.*?)\)|\<(.*?)\>/g);
      if (stringMatches) {
        for (const stringMatch of stringMatches) {
          // Clean up the extracted text
          let cleanText = stringMatch.replace(/^\(|\)$|^\<|\>$/g, '');
          // Convert hex encoded text
          if (stringMatch.startsWith('<') && stringMatch.endsWith('>')) {
            try {
              // Convert hex pairs to characters
              const hexPairs = cleanText.match(/.{1,2}/g) || [];
              cleanText = hexPairs.map(hex => String.fromCharCode(parseInt(hex, 16))).join('');
            } catch (e) {
              // If conversion fails, keep the original
            }
          }
          extractedText += cleanText + ' ';
        }
      }
    }
  }
  
  // If we couldn't extract text with the above method, try a simpler approach
  if (extractedText.trim().length < 100) {
    // Look for any text that might be between parentheses
    const simpleMatches = text.match(/\((.*?)\)/g);
    if (simpleMatches) {
      extractedText = simpleMatches.map(m => m.slice(1, -1)).join(' ');
    }
  }
  
  return extractedText.trim();
}

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
          const contentType = document.type || response.headers.get('content-type') || '';
          
          if (contentType.includes('text/plain') || 
              document.name.endsWith('.txt') || 
              document.name.endsWith('.md')) {
            // Plain text files
            content = await response.text();
            console.log(`Successfully extracted ${content.length} characters of text`);
          } else if (contentType.includes('text/html') || document.name.endsWith('.html') || document.name.endsWith('.htm')) {
            // HTML files
            const html = await response.text();
            content = extractTextFromHTML(html);
            console.log(`Successfully extracted ${content.length} characters from HTML`);
          } else if (contentType.includes('application/pdf') || document.name.toLowerCase().endsWith('.pdf')) {
            // PDF files
            const buffer = await response.arrayBuffer();
            content = extractTextFromPDF(buffer);
            console.log(`Successfully extracted ${content.length} characters from PDF`);
            
            // If the PDF extraction returned very little text, it's likely a scanned document
            if (content.length < 200) {
              console.log("PDF appears to be image-based or has limited extractable text");
              content += "\n\nNote: This document appears to be image-based or has limited extractable text.";
            }
          } else if (contentType.includes('application/json') || document.name.endsWith('.json')) {
            // JSON files
            const json = await response.json();
            content = JSON.stringify(json, null, 2);
            console.log(`Successfully extracted ${content.length} characters from JSON`);
          } else if (document.name.endsWith('.csv')) {
            // CSV files
            const text = await response.text();
            content = text;
            console.log(`Successfully extracted ${content.length} characters from CSV`);
          } else if (document.name.endsWith('.docx') || contentType.includes('application/vnd.openxmlformats-officedocument.wordprocessingml.document')) {
            // Word documents - limited extraction
            content = "This document is a Word document (.docx) which requires specialized parsing.";
            console.log("Word document detected, extraction limited");
          } else {
            console.log(`Unsupported document type for direct extraction: ${contentType}`);
            content = `Document type (${contentType}) not supported for direct content extraction.`;
          }
        } else {
          console.error(`Failed to fetch from URL: ${response.status} ${response.statusText}`);
        }
      } catch (fetchError) {
        console.error('Error fetching document content from URL:', fetchError);
      }
    }

    // If still no content and we have user_id, try to get from storage
    if ((!content || content.length < 50) && document.user_id) {
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
          const contentType = document.type || '';
          
          if (contentType.includes('text/plain') || 
              document.name.endsWith('.txt') || 
              document.name.endsWith('.md')) {
            // Text files
            content = await fileData.text();
            console.log(`Successfully extracted ${content.length} characters of text from storage`);
          } else if (contentType.includes('text/html') || document.name.endsWith('.html') || document.name.endsWith('.htm')) {
            // HTML files
            const html = await fileData.text();
            content = extractTextFromHTML(html);
            console.log(`Successfully extracted ${content.length} characters from HTML in storage`);
          } else if (contentType.includes('application/pdf') || document.name.toLowerCase().endsWith('.pdf')) {
            // PDF files
            const buffer = await fileData.arrayBuffer();
            content = extractTextFromPDF(buffer);
            console.log(`Successfully extracted ${content.length} characters from PDF in storage`);
            
            if (content.length < 200) {
              console.log("PDF appears to be image-based or has limited extractable text");
              content += "\n\nNote: This document appears to be image-based or has limited extractable text.";
            }
          } else {
            console.log(`Unsupported document type for storage extraction: ${contentType}`);
            content = `Document type (${contentType}) not supported for storage content extraction.`;
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
