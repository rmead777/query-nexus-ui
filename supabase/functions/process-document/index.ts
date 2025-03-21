
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// PDF.js for proper PDF text extraction - we use a CDN version for the edge function
import 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.4.120/build/pdf.min.js';
const pdfjsLib = (globalThis as any).pdfjsLib;

// For proper DOCX text extraction
import * as JSZip from 'https://esm.sh/jszip@3.10.1';

// Main document processing function
serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { documentId, forceReprocess } = await req.json();
    
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
    
    // Skip processing if document already has readable content and not forcing reprocess
    if (!forceReprocess && document.content && document.content.length > 100 && isReadableText(document.content)) {
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
    
    console.log('Document needs content extraction');
    
    // Download the document file from storage
    const userId = document.user_id;
    const filePath = `${userId}/${documentId}`;
    
    console.log(`Attempting to download from storage: ${filePath}`);
    
    const { data: fileData, error: fileError } = await supabase
      .storage
      .from('documents')
      .download(filePath);

    if (fileError) {
      console.error('Error downloading file from storage:', fileError);
      return new Response(
        JSON.stringify({ error: 'Failed to download document file', details: fileError }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }
    
    if (!fileData) {
      console.error('No file data received from storage');
      return new Response(
        JSON.stringify({ error: 'No file data received from storage' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }
    
    console.log(`Successfully downloaded file, size: ${fileData.size} bytes`);
    
    // Extract content based on file type
    let content = "";
    const fileType = document.type || getMimeTypeFromFileName(document.name);
    
    try {
      if (fileType.includes('pdf') || document.name.toLowerCase().endsWith('.pdf')) {
        // Use PDF.js for PDF extraction
        content = await extractPdfTextWithPdfJs(fileData);
      } else if (fileType.includes('word') || document.name.toLowerCase().endsWith('.docx')) {
        // Use JSZip for DOCX extraction
        content = await extractDocxText(fileData);
      } else if (fileType.includes('text/plain') || document.name.endsWith('.txt') || document.name.endsWith('.md')) {
        // Simple text extraction
        content = await fileData.text();
      } else {
        // Try as text first
        try {
          const text = await fileData.text();
          if (isReadableText(text)) {
            content = text;
          } else {
            // Fall back to trying as PDF then DOCX
            try {
              content = await extractPdfTextWithPdfJs(fileData);
            } catch (pdfError) {
              try {
                content = await extractDocxText(fileData);
              } catch (docxError) {
                content = "Could not extract readable text from this document format.";
              }
            }
          }
        } catch (error) {
          console.error('Error extracting text:', error);
          content = "Error extracting text from this document.";
        }
      }
    } catch (extractionError) {
      console.error('Error during content extraction:', extractionError);
      content = `Error extracting content: ${extractionError.message}`;
    }
    
    // Clean up the extracted content
    content = cleanupExtractedText(content);
    
    // Check if content is readable
    const isReadable = isReadableText(content);
    console.log(`Extracted content is readable: ${isReadable}`);
    
    if (!isReadable && content.length > 50) {
      content = "WARNING: The system had difficulty extracting readable text from this document. It may be scanned, encrypted, or in a format that's not fully supported. Below is the best extraction possible:\n\n" + content;
    }
    
    // Update the document with the extracted content
    try {
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
    
    // Return success response
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Document processed',
        content_extracted: true,
        document_type: document.type,
        document_name: document.name,
        readable_content: isReadable,
        content_sample: content.substring(0, 100) + '...',
        content_length: content.length
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

// Function to extract text from a PDF using PDF.js
async function extractPdfTextWithPdfJs(file) {
  try {
    console.log("Extracting PDF text with PDF.js");
    const arrayBuffer = await file.arrayBuffer();
    
    // Load the PDF document
    const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
    const pdf = await loadingTask.promise;
    console.log(`PDF loaded with ${pdf.numPages} pages`);
    
    let fullText = "";
    
    // Extract text from each page
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      
      // Concatenate the text items with proper spacing
      const pageText = textContent.items
        .map(item => item.str)
        .join(' ');
      
      fullText += pageText + "\n\n";
    }
    
    console.log(`Successfully extracted ${fullText.length} characters from PDF`);
    return fullText;
  } catch (error) {
    console.error("Error extracting PDF text with PDF.js:", error);
    throw new Error(`PDF extraction failed: ${error.message}`);
  }
}

// Function to extract text from a DOCX file using JSZip
async function extractDocxText(file) {
  try {
    console.log("Extracting DOCX text with JSZip");
    const arrayBuffer = await file.arrayBuffer();
    
    // Load the DOCX as a ZIP file
    const zip = await JSZip.loadAsync(arrayBuffer);
    
    // DOCX files store their content in word/document.xml
    const documentXml = await zip.file("word/document.xml")?.async("text");
    
    if (!documentXml) {
      throw new Error("Could not find content in DOCX file");
    }
    
    // Extract text from XML (simple approach)
    let text = documentXml;
    
    // Remove XML tags
    text = text.replace(/<[^>]+>/g, ' ');
    
    // Clean up whitespace
    text = text.replace(/\s+/g, ' ').trim();
    
    // Decode XML entities
    text = text
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
    
    console.log(`Successfully extracted ${text.length} characters from DOCX`);
    return text;
  } catch (error) {
    console.error("Error extracting DOCX text:", error);
    throw new Error(`DOCX extraction failed: ${error.message}`);
  }
}

// Function to determine if text is readable
function isReadableText(text) {
  if (!text || text.length < 20) return false;
  
  // Sample the text to check for readability
  const sample = text.slice(0, Math.min(500, text.length));
  
  // Check for reasonable character distribution
  const letterCount = (sample.match(/[a-zA-Z]/g) || []).length;
  const spaceCount = (sample.match(/\s/g) || []).length;
  const totalCount = sample.length;
  
  // Text should have a reasonable proportion of letters
  const letterRatio = letterCount / totalCount;
  // Text should have spaces between words
  const spaceRatio = spaceCount / totalCount;
  
  // Check for binary data signatures
  const hasBinarySignatures = sample.includes('%PDF') || 
                              sample.includes('PK\x03\x04') ||
                              /[\x00-\x08\x0B\x0C\x0E-\x1F]/.test(sample);
  
  // For readability we typically expect:
  // - A significant portion of letters (typically >30%)
  // - Some spaces between words (typically >5%)
  // - No binary file signatures
  return (
    letterRatio > 0.3 && 
    spaceRatio > 0.05 && 
    !hasBinarySignatures
  );
}

// Function to clean up extracted text
function cleanupExtractedText(text) {
  if (!text) return "";
  
  return text
    .replace(/[\x00-\x1F\x7F-\x9F]/g, '') // Remove control characters
    .replace(/�/g, '') // Remove replacement character
    .replace(/[^\x20-\x7E\n\r\t\u00A0-\u00FF]/g, ' ') // Keep ASCII and some extended Latin
    .replace(/\s+/g, ' ') // Normalize whitespace
    .replace(/(\s*\n\s*){3,}/g, '\n\n') // Normalize excessive line breaks
    .trim();
}

// Function to determine MIME type from filename
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
