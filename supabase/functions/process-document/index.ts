
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Enhanced function to extract meaningful content from HTML
function extractTextFromHTML(html: string): string {
  // Remove script and style tags and their content
  let text = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ');
  text = text.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ');
  
  // Remove HTML comments
  text = text.replace(/<!--[\s\S]*?-->/g, ' ');
  
  // Remove HTML tags but preserve headings with more weight
  text = text.replace(/<h[1-6][^>]*>(.*?)<\/h[1-6]>/gi, (match, content) => {
    return content + ' ' + content + ' '; // Duplicate heading content for more weight
  });
  
  // Handle other tags
  text = text.replace(/<\/?(p|div|section|article)[^>]*>/gi, '\n'); // Add newlines for block elements
  text = text.replace(/<li[^>]*>(.*?)<\/li>/gi, '• $1\n'); // Preserve list items
  text = text.replace(/<\/?(strong|b|em|i|u|span)[^>]*>/gi, ''); // Remove inline formatting tags
  text = text.replace(/<[^>]+>/g, ' '); // Remove all other tags
  
  // Clean up whitespace
  text = text.replace(/\s+/g, ' ');
  
  // Decode HTML entities
  text = text.replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&mdash;/g, "—")
    .replace(/&ndash;/g, "–")
    .replace(/&hellip;/g, "...");
  
  return text.trim();
}

// Improved parser for extracting text from PDFs
function extractTextFromPDF(buffer: ArrayBuffer): string {
  const textDecoder = new TextDecoder();
  const text = textDecoder.decode(buffer);
  
  // Extract PDF structure
  const extractedText: string[] = [];
  
  // Find text objects
  const textObjects = text.match(/BT[\s\S]*?ET/g) || [];
  
  for (const textObject of textObjects) {
    // Extract text strings (between parentheses or with hex encoding)
    const stringMatches = textObject.match(/\((.*?)\)|<([0-9A-Fa-f]+)>/g) || [];
    
    for (const stringMatch of stringMatches) {
      if (stringMatch.startsWith('(') && stringMatch.endsWith(')')) {
        // Handle escaped parentheses and other characters
        let content = stringMatch.slice(1, -1)
          .replace(/\\\(/g, '(')
          .replace(/\\\)/g, ')')
          .replace(/\\\\/g, '\\');
        
        // Remove control characters
        content = content.replace(/[\x00-\x1F\x7F]/g, '');
        
        if (content.trim().length > 0) {
          extractedText.push(content);
        }
      } else if (stringMatch.startsWith('<') && stringMatch.endsWith('>')) {
        // Hex encoded text
        try {
          const hexContent = stringMatch.slice(1, -1);
          // Convert pairs of hex digits to characters
          const hexPairs = hexContent.match(/.{1,2}/g) || [];
          const decodedText = hexPairs
            .map(hex => String.fromCharCode(parseInt(hex, 16)))
            .join('')
            .replace(/[\x00-\x1F\x7F]/g, ''); // Remove control characters
          
          if (decodedText.trim().length > 0) {
            extractedText.push(decodedText);
          }
        } catch (e) {
          // Skip if there's an error in conversion
        }
      }
    }
  }
  
  // If standard extraction yields insufficient results, try fallback approaches
  if (extractedText.join(' ').length < 200) {
    // Look for text in content streams
    const streamMatches = text.match(/stream\s([\s\S]*?)\sendstream/g) || [];
    for (const stream of streamMatches) {
      const cleanStream = stream
        .replace(/stream\s/, '')
        .replace(/\sendstream/, '')
        .replace(/[\x00-\x1F\x7F]/g, ' ');
      
      // Extract text that looks like words (3+ characters)
      const potentialWords = cleanStream.match(/[A-Za-z]{3,}/g) || [];
      if (potentialWords.length > 0) {
        extractedText.push(potentialWords.join(' '));
      }
    }
    
    // Simple text extraction as last resort
    const simpleMatches = text.match(/\(\s*([A-Za-z0-9\s.,;:'"!?-]{3,})\s*\)/g) || [];
    for (const match of simpleMatches) {
      const content = match.slice(1, -1).trim();
      if (content.length > 0) {
        extractedText.push(content);
      }
    }
  }
  
  // Join all extracted text fragments
  let result = extractedText.join(' ')
    .replace(/\s+/g, ' ')
    .trim();
  
  if (result.length < 100) {
    // If extraction still yields minimal results, include a note
    result += "\n\nNote: This PDF appears to be mostly image-based or contains minimal extractable text.";
  }
  
  return result;
}

// Extract text from Word documents
function extractTextFromDOCX(buffer: ArrayBuffer): string {
  try {
    // This is a simplified approach since we can't use libraries like mammoth.js in Deno
    const text = new TextDecoder().decode(buffer);
    
    // Look for text content between XML tags that typically contain document text
    const contentMatches = text.match(/<w:t[^>]*>(.*?)<\/w:t>/g) || [];
    const extractedText = contentMatches
      .map(match => {
        // Extract content between tags
        const content = match.replace(/<w:t[^>]*>/, '').replace(/<\/w:t>/, '');
        // Decode XML entities
        return content
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&apos;/g, "'");
      })
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    if (extractedText.length > 0) {
      return extractedText;
    } else {
      // Fallback to looking for any text-like content
      const wordMatches = text.match(/>[A-Za-z0-9\s.,;:'"!?-]{3,}</g) || [];
      if (wordMatches.length > 0) {
        return wordMatches
          .map(match => match.slice(1, -1))
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim();
      }
    }
    
    return "This document appears to be a Word document but text extraction is limited.";
  } catch (e) {
    console.error('Error extracting text from DOCX:', e);
    return "Document type (DOCX) encountered an error during content extraction.";
  }
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
          } else if (document.name.endsWith('.docx') || 
                    contentType.includes('application/vnd.openxmlformats-officedocument.wordprocessingml.document')) {
            // Word documents
            const buffer = await response.arrayBuffer();
            content = extractTextFromDOCX(buffer);
            console.log(`Extracted content from DOCX: ${content.length} characters`);
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
          } else if (document.name.endsWith('.docx') || 
                    contentType.includes('application/vnd.openxmlformats-officedocument.wordprocessingml.document')) {
            // Word documents
            const buffer = await fileData.arrayBuffer();
            content = extractTextFromDOCX(buffer);
            console.log(`Extracted content from DOCX in storage: ${content.length} characters`);
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
      
      try {
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
      } catch (updateError) {
        console.error('Error updating document:', updateError);
        return new Response(
          JSON.stringify({ 
            error: 'Failed to update document', 
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
