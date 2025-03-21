
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

// Improved PDF text extraction with better binary handling
function extractTextFromPDF(buffer: ArrayBuffer): string {
  try {
    // First, try a simple text decoder approach for text-based PDFs
    const decoder = new TextDecoder('utf-8', { fatal: false });
    let text = decoder.decode(buffer);
    
    // If we have a readable result, return it after cleanup
    if (isReadableText(text)) {
      console.log("Successfully extracted readable text from PDF with standard decoding");
      return cleanupExtractedText(text);
    }
    
    // If basic approach fails, try more aggressive pattern matching for text objects in PDF
    console.log("Basic PDF text extraction failed, trying pattern matching...");
    
    // Convert binary data to a string representation we can search
    const bytes = new Uint8Array(buffer);
    let binaryString = '';
    for (let i = 0; i < bytes.length; i++) {
      binaryString += String.fromCharCode(bytes[i]);
    }
    
    // Look for text objects in PDF format (enclosed in () or <>)
    const textMatches = [];
    
    // Match text within parentheses (common in PDFs)
    const parenthesesRegex = /\(([^\)]{3,})\)/g;
    let match;
    while ((match = parenthesesRegex.exec(binaryString)) !== null) {
      if (match[1] && match[1].length > 3) {
        // Filter out binary noise
        const cleanText = match[1].replace(/[^\x20-\x7E\n\r\t]/g, '');
        if (cleanText.length > 3) {
          textMatches.push(cleanText);
        }
      }
    }
    
    // Match hex-encoded text (also common in PDFs)
    const hexRegex = /<([0-9A-Fa-f]{6,})>/g;
    while ((match = hexRegex.exec(binaryString)) !== null) {
      if (match[1] && match[1].length > 6) {
        // Convert hex to text
        try {
          let hexText = '';
          for (let i = 0; i < match[1].length; i += 2) {
            const hexPair = match[1].substr(i, 2);
            const charCode = parseInt(hexPair, 16);
            if (charCode >= 32 && charCode <= 126) { // Printable ASCII
              hexText += String.fromCharCode(charCode);
            }
          }
          if (hexText.length > 3) {
            textMatches.push(hexText);
          }
        } catch (e) {
          // Ignore conversion errors
        }
      }
    }
    
    // If we found text matches, join them together
    if (textMatches.length > 0) {
      const extractedText = textMatches.join(' ');
      console.log(`Extracted ${textMatches.length} text fragments from PDF`);
      return cleanupExtractedText(extractedText);
    }
    
    // Last resort: try to extract any ASCII printable text
    console.log("Using ASCII filtering as last resort for PDF extraction");
    const asciiText = Array.from(bytes)
      .filter(byte => byte >= 32 && byte <= 126) // ASCII printable range
      .map(byte => String.fromCharCode(byte))
      .join('');
    
    const filteredText = asciiText
      .replace(/[^\x20-\x7E\n\r\t]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    
    // Check if we have something readable
    if (filteredText.length > 200 && isReadableText(filteredText)) {
      return cleanupExtractedText(filteredText);
    }
    
    return "This document appears to be in a binary format. Text extraction was unsuccessful. Please try uploading a text-based PDF.";
  } catch (e) {
    console.error("Error extracting PDF text:", e);
    return "Error extracting text from PDF. The document may be encrypted, scanned (image-based), or in an unsupported format.";
  }
}

// Improved DOCX text extraction
function extractTextFromDOCX(buffer: ArrayBuffer): string {
  try {
    // DOCXs are ZIP archives with XML files inside
    // Simple extraction looking for text content in XML
    const textDecoder = new TextDecoder('utf-8');
    const content = textDecoder.decode(buffer);
    
    // If we get readable content already, use it
    if (isReadableText(content)) {
      console.log("Successfully extracted readable text from DOCX with direct decoding");
      return cleanupExtractedText(content);
    }
    
    // Extract text content between XML tags that typically contain document text
    console.log("Using XML pattern matching for DOCX text extraction");
    const textNodes = [];
    
    // Match text in <w:t> tags (Word document text)
    const paragraphRegex = /<w:t[^>]*>(.*?)<\/w:t>/g;
    let match;
    while ((match = paragraphRegex.exec(content)) !== null) {
      if (match[1]) {
        textNodes.push(match[1].trim());
      }
    }
    
    if (textNodes.length > 0) {
      const extractedText = textNodes.join(' ');
      console.log(`Extracted ${textNodes.length} text nodes from DOCX XML`);
      return cleanupExtractedText(extractedText);
    }
    
    // If we couldn't find <w:t> tags, try to find any readable text
    console.log("Using general text pattern matching for DOCX");
    const textMatches = [];
    
    // Look for anything that resembles readable text between tags
    const generalTextRegex = />([A-Za-z0-9\s.,;:'"!?-]{10,})</g;
    while ((match = generalTextRegex.exec(content)) !== null) {
      if (match[1] && match[1].trim().length > 10) {
        textMatches.push(match[1].trim());
      }
    }
    
    if (textMatches.length > 0) {
      const extractedText = textMatches.join(' ');
      console.log(`Extracted ${textMatches.length} general text fragments from DOCX`);
      return cleanupExtractedText(extractedText);
    }
    
    // Last resort: extract ASCII printable characters
    console.log("Using ASCII filtering for DOCX extraction");
    const bytes = new Uint8Array(buffer);
    const asciiText = Array.from(bytes)
      .filter(byte => byte >= 32 && byte <= 126) // ASCII printable range
      .map(byte => String.fromCharCode(byte))
      .join('');
    
    const filteredText = asciiText
      .replace(/[^\x20-\x7E\n\r\t]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    
    if (filteredText.length > 200 && isReadableText(filteredText)) {
      return cleanupExtractedText(filteredText);
    }
    
    return "This Word document appears to be in a format that couldn't be processed. Please try saving it as plain text or PDF.";
  } catch (e) {
    console.error("Error extracting DOCX text:", e);
    return "Error extracting text from Word document. The file may be corrupted or in an unsupported format.";
  }
}

// Improved function to check if text is actually readable human language
function isReadableText(text: string): boolean {
  if (!text || text.length < 20) return false;
  
  // Sample the text to check for readability
  const sample = text.slice(0, Math.min(500, text.length));
  
  // Check for reasonable character distribution
  const letterCount = (sample.match(/[a-zA-Z]/g) || []).length;
  const spaceCount = (sample.match(/\s/g) || []).length;
  const punctuationCount = (sample.match(/[.,;:'"!?-]/g) || []).length;
  const totalCount = sample.length;
  
  // Text should have a reasonable proportion of letters
  const letterRatio = letterCount / totalCount;
  // Text should have spaces between words
  const spaceRatio = spaceCount / totalCount;
  // Binary/gibberish data often has unusual distributions
  const weirdCharCount = (sample.match(/[^\x20-\x7E\n\r\t]/g) || []).length;
  const weirdCharRatio = weirdCharCount / totalCount;
  
  // Check for binary data signatures or common patterns in corrupt files
  const hasBinarySignatures = /^\%PDF|^PK\x03\x04|^\x50\x4B\x03\x04|^\x89PNG|^GIF8|^\xFF\xD8\xFF|^BM/.test(sample);
  
  // Check for sequences of random-looking characters
  const hasRandomPatterns = /(\W{5,})/.test(sample) || /([^\s\w,.?!:;'"(){}\[\]]{4,})/.test(sample);

  // For readability we typically expect:
  // - A significant portion of letters (typically >30%)
  // - Some spaces between words (typically >5%)
  // - Not too many weird characters (typically <20%)
  // - No binary file signatures
  // - No long sequences of random symbols
  return (
    letterRatio > 0.3 && 
    spaceRatio > 0.05 && 
    weirdCharRatio < 0.2 &&
    !hasBinarySignatures &&
    !hasRandomPatterns
  );
}

// Improved function to clean up extracted text
function cleanupExtractedText(text: string): string {
  return text
    .replace(/[\x00-\x1F\x7F-\x9F]/g, '') // Remove control characters
    .replace(/�/g, '') // Remove replacement character
    .replace(/[^\x20-\x7E\n\r\t\u00A0-\u00FF]/g, ' ') // Keep ASCII and some extended Latin
    .replace(/\s+/g, ' ') // Normalize whitespace
    .replace(/(\s*\n\s*){3,}/g, '\n\n') // Normalize excessive line breaks
    .trim();
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
          message: 'Document already has readable content',
          content_extracted: true,
          content_sample: document.content.substring(0, 100) + '...'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // If no content or unreadable content, try to extract it
    console.log('Document needs content extraction');
    
    // Try to extract from URL first
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
            console.log(`Trying generic text extraction for type: ${contentType}`);
            // Try to extract as plain text anyway
            const text = await response.text();
            if (isReadableText(text)) {
              content = cleanupExtractedText(text);
              console.log(`Treated as plain text, extracted ${content.length} characters`);
            } else {
              content = `Could not extract readable text from this document type (${contentType}). Please try converting it to PDF or TXT format.`;
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
          console.log('Successfully downloaded file from storage, attempting content extraction');
          
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
              console.log('Attempting generic text extraction');
              const text = await fileData.text();
              if (isReadableText(text)) {
                content = cleanupExtractedText(text);
                console.log(`Extracted ${content.length} characters of readable text`);
              } else {
                // Try binary extraction
                console.log('Text not readable, attempting binary extraction');
                const buffer = await fileData.arrayBuffer();
                
                // Attempt aggressive pattern-based extraction for common formats
                const bytes = new Uint8Array(buffer);
                const fileHeader = Array.from(bytes.slice(0, 8))
                  .map(b => b.toString(16).padStart(2, '0'))
                  .join('');
                
                console.log(`File header: ${fileHeader}`);
                
                if (fileHeader.startsWith('255044462d')) {
                  // PDF magic number detected
                  content = extractTextFromPDF(buffer);
                  console.log(`PDF detected by magic number, extracted ${content.length} characters`);
                } else if (fileHeader.startsWith('504b0304')) {
                  // ZIP/DOCX magic number detected
                  content = extractTextFromDOCX(buffer);
                  console.log(`ZIP/DOCX detected by magic number, extracted ${content.length} characters`);
                } else {
                  // Generic binary approach - try to extract ASCII text
                  const asciiText = Array.from(bytes)
                    .filter(byte => byte >= 32 && byte <= 126)
                    .map(byte => String.fromCharCode(byte))
                    .join('');
                    
                  const cleanedText = asciiText
                    .replace(/[^\x20-\x7E\n\r\t]/g, '')
                    .replace(/\s+/g, ' ')
                    .trim();
                    
                  if (cleanedText.length > 200 && isReadableText(cleanedText)) {
                    content = cleanedText;
                    console.log(`Extracted ${content.length} characters of readable ASCII text from binary file`);
                  } else {
                    content = `Could not extract readable text from this document. It may be in a binary format, encrypted, or a scanned image.`;
                  }
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
    if (content) {
      // Final check for readability
      if (!isReadableText(content) && content.length > 100) {
        console.log('Extracted content is not readable, adding warning message');
        content = "WARNING: The system had difficulty extracting readable text from this document. It may be scanned, encrypted, or in a format that's not fully supported. Below is the best extraction possible:\n\n" + content;
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
    } else {
      console.log('No content could be extracted from the document');
      // Set a placeholder message when no content could be extracted
      content = "The system was unable to extract any readable content from this document. It may be encrypted, password-protected, or in an unsupported format. Please try uploading a different version or format of this document.";
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
        readable_content: content ? isReadableText(content) : false,
        content_sample: content ? content.substring(0, 100) + '...' : null
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
