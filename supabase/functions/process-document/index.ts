
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

// Simplified PDF text extraction with better encoding handling
function extractTextFromPDF(buffer: ArrayBuffer): string {
  try {
    // Use plain text decoder first to check for UTF-8 content
    const textDecoder = new TextDecoder('utf-8', { fatal: false });
    const decodedText = textDecoder.decode(buffer);
    
    // Check if we got readable text from standard decoding
    if (isReadableText(decodedText)) {
      console.log("Successfully extracted readable text with standard UTF-8 decoding");
      return cleanupExtractedText(decodedText);
    }
    
    // If standard method fails, try to extract text objects
    const text = decodedText;
    const extractedText: string[] = [];
    
    // Extract text directly using regex patterns common in PDFs
    // Look for text blocks
    const textBlocks = text.match(/\(\s*([A-Za-z0-9\s.,;:'"!?-]{3,})\s*\)/g) || [];
    for (const block of textBlocks) {
      const content = block.slice(1, -1).trim();
      if (content.length > 0 && isReadableText(content)) {
        extractedText.push(content);
      }
    }
    
    // If we found readable text via regex
    if (extractedText.length > 0) {
      console.log(`Extracted ${extractedText.length} text blocks from PDF using regex pattern matching`);
      return cleanupExtractedText(extractedText.join(' '));
    }
    
    // Last resort: try to extract any ASCII text
    const asciiText = Array.from(new Uint8Array(buffer))
      .filter(byte => byte >= 32 && byte <= 126) // ASCII printable characters
      .map(byte => String.fromCharCode(byte))
      .join('');
      
    const cleanedAsciiText = asciiText
      .replace(/[^\x20-\x7E\n\r\t]/g, '') // Keep only printable ASCII
      .replace(/\s+/g, ' ')
      .trim();
      
    if (cleanedAsciiText.length > 200 && isReadableText(cleanedAsciiText)) {
      console.log("Extracted text using ASCII character filtering");
      return cleanupExtractedText(cleanedAsciiText);
    }
    
    return "This document appears to be in a binary format or encrypted. Text extraction was unsuccessful.";
  } catch (e) {
    console.error("Error in PDF extraction:", e);
    return "Error extracting text from PDF. The document may be scanned, encrypted or in an unsupported format.";
  }
}

// Check if text is likely human-readable (not gibberish)
function isReadableText(text: string): boolean {
  if (!text || text.length < 20) return false;
  
  // Sample the text to check for readability
  const sample = text.slice(0, 500);
  
  // Check for reasonable character distribution
  const letterCount = (sample.match(/[a-zA-Z]/g) || []).length;
  const spaceCount = (sample.match(/\s/g) || []).length;
  const digitCount = (sample.match(/\d/g) || []).length;
  const punctuationCount = (sample.match(/[.,;:'"!?-]/g) || []).length;
  const totalCount = sample.length;
  
  // Text should have a reasonable proportion of letters
  const letterRatio = letterCount / totalCount;
  // Text should have spaces between words
  const spaceRatio = spaceCount / totalCount;
  // Text shouldn't be mostly special characters
  const specialCharRatio = (totalCount - letterCount - spaceCount - digitCount - punctuationCount) / totalCount;
  
  // For readable text, we expect:
  // - A significant portion to be letters (typically >30%)
  // - Some spaces between words (typically >5%)
  // - Not too many special characters (typically <30%)
  return (
    letterRatio > 0.3 && 
    spaceRatio > 0.05 && 
    specialCharRatio < 0.3
  );
}

// Clean up extracted text for better readability
function cleanupExtractedText(text: string): string {
  return text
    .replace(/[\x00-\x1F\x7F-\x9F]/g, '') // Remove control characters
    .replace(/\s+/g, ' ')                 // Normalize whitespace
    .replace(/\r\n|\r|\n/g, '\n')         // Normalize line breaks
    .replace(/(\n\s*){3,}/g, '\n\n')      // Remove excessive line breaks
    .trim();
}

// Extract text from Word documents
function extractTextFromDOCX(buffer: ArrayBuffer): string {
  try {
    // Simple approach since we can't use libraries in Deno
    const text = new TextDecoder().decode(buffer);
    
    // Check if it's readable as is (XML format)
    if (isReadableText(text)) {
      // Look for text content between XML tags that typically contain document text
      const contentMatches = text.match(/<w:t[^>]*>(.*?)<\/w:t>/g) || [];
      if (contentMatches.length > 0) {
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
        
        console.log(`Successfully extracted ${extractedText.length} characters from DOCX XML structure`);
        return extractedText;
      }
    }
    
    // Fallback to extracting any text-like content
    const wordMatches = text.match(/>[A-Za-z0-9\s.,;:'"!?-]{3,}</g) || [];
    const potentialText = wordMatches
      .map(match => match.slice(1, -1))
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
      
    if (potentialText.length > 0 && isReadableText(potentialText)) {
      console.log(`Extracted text of length ${potentialText.length} from DOCX using pattern matching`);
      return potentialText;
    }
    
    // ASCII extraction as last resort
    const asciiText = Array.from(new Uint8Array(buffer))
      .filter(byte => byte >= 32 && byte <= 126) // ASCII printable characters
      .map(byte => String.fromCharCode(byte))
      .join('');
      
    const cleanedAsciiText = asciiText
      .replace(/[^\x20-\x7E\n\r\t]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
      
    if (cleanedAsciiText.length > 200 && isReadableText(cleanedAsciiText)) {
      console.log("Extracted DOCX text using ASCII filtering");
      return cleanupExtractedText(cleanedAsciiText);
    }
    
    return "This document appears to be a Word document but text extraction is limited on this platform.";
  } catch (e) {
    console.error('Error extracting text from DOCX:', e);
    return "Error extracting text from Word document. The file may be corrupt or in an unsupported format.";
  }
}

// Main handler function
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
    
    // Check if document already has content that's readable
    if (document.content && document.content.length > 100 && isReadableText(document.content)) {
      console.log('Document already has readable content, skipping extraction');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Document already has content',
          content_extracted: true 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // If no content or unreadable content, try to extract it from the URL or storage
    let fetchSuccess = false;
    if (document.url) {
      try {
        console.log(`Attempting to fetch content from URL: ${document.url}`);
        const response = await fetch(document.url);
        
        if (response.ok) {
          fetchSuccess = true;
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
            console.log(`Extracted ${content.length} characters from PDF`);
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
            // Try to extract as plain text anyway
            const text = await response.text();
            if (isReadableText(text)) {
              content = cleanupExtractedText(text);
              console.log(`Treated as plain text, extracted ${content.length} characters`);
            } else {
              content = `Document type (${contentType}) not supported for direct content extraction.`;
            }
          }
        } else {
          console.error(`Failed to fetch from URL: ${response.status} ${response.statusText}`);
        }
      } catch (fetchError) {
        console.error('Error fetching document content from URL:', fetchError);
      }
    }

    // If still no content and we have user_id, try to get from storage
    if ((!content || !isReadableText(content)) && document.user_id) {
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
          } else if (document.name.endsWith('.docx') || 
                    contentType.includes('application/vnd.openxmlformats-officedocument.wordprocessingml.document')) {
            // Word documents
            const buffer = await fileData.arrayBuffer();
            content = extractTextFromDOCX(buffer);
            console.log(`Extracted content from DOCX in storage: ${content.length} characters`);
          } else {
            // Try generic text extraction for other types
            try {
              const text = await fileData.text();
              if (isReadableText(text)) {
                content = cleanupExtractedText(text);
                console.log(`Treated as plain text from storage, extracted ${content.length} characters`);
              } else {
                // Try binary extraction
                const buffer = await fileData.arrayBuffer();
                const asciiText = Array.from(new Uint8Array(buffer))
                  .filter(byte => byte >= 32 && byte <= 126)
                  .map(byte => String.fromCharCode(byte))
                  .join('');
                  
                const cleanedText = asciiText
                  .replace(/[^\x20-\x7E\n\r\t]/g, '')
                  .replace(/\s+/g, ' ')
                  .trim();
                  
                if (cleanedText.length > 200 && isReadableText(cleanedText)) {
                  content = cleanedText;
                  console.log(`Extracted readable ASCII text from binary file: ${content.length} characters`);
                } else {
                  content = `Document type (${contentType}) not supported for storage content extraction.`;
                }
              }
            } catch (textError) {
              console.error('Error extracting text from file:', textError);
              content = "Failed to extract readable text from this document.";
            }
          }
        }
      } catch (storageError) {
        console.error('Error accessing storage:', storageError);
      }
    }
    
    // Only update if we extracted content
    if (content && (!document.content || !isReadableText(document.content))) {
      // Final check for readability
      if (!isReadableText(content)) {
        content = "The system was unable to extract readable text from this document. It may be a scanned image, encrypted, or in a format that's not supported for text extraction.";
      }
      
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
    } else if (!content) {
      console.log('No content could be extracted from the document');
      // Set a placeholder message when no content could be extracted
      content = "The system was unable to extract any content from this document.";
      try {
        const { error: updateError } = await supabase
          .from('documents')
          .update({ content })
          .eq('document_id', documentId);
          
        if (updateError) {
          console.error('Error updating document with placeholder content:', updateError);
        }
      } catch (updateError) {
        console.error('Error updating document with placeholder:', updateError);
      }
    }
    
    // Return success response
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Document processed',
        content_extracted: content !== null,
        document_type: document.type,
        document_name: document.name,
        readable_content: content ? isReadableText(content) : false
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
