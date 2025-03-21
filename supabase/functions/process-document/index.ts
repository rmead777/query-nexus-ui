
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// PDF.js for PDF text extraction via CDN
import 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.4.120/build/pdf.min.js';
const pdfjsLib = (globalThis as any).pdfjsLib;

// For DOCX text extraction
import * as JSZip from 'https://esm.sh/jszip@3.10.1';

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
        isReadableText(document.content)) {
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
      if (fileName.endsWith('.pdf') || fileType.includes('pdf')) {
        console.log('Extracting text from PDF document');
        content = await extractPdfText(fileData);
        extractionMethod = "pdf";
      } 
      else if (fileName.endsWith('.docx') || fileType.includes('word') || fileType.includes('officedocument')) {
        console.log('Extracting text from DOCX document');
        content = await extractDocxText(fileData);
        extractionMethod = "docx";
      } 
      else if (fileName.endsWith('.txt') || fileName.endsWith('.md') || 
               fileType.includes('text/plain') || fileType.includes('markdown')) {
        console.log('Extracting text from plain text document');
        content = await fileData.text();
        extractionMethod = "text";
      } 
      else {
        // Try different extraction methods in sequence
        console.log('Unknown document type, trying multiple extraction methods');
        try {
          // First try as text
          content = await fileData.text();
          if (isReadableText(content)) {
            console.log('Successfully extracted as plain text');
            extractionMethod = "text";
          } else {
            // Try as PDF
            try {
              content = await extractPdfText(fileData);
              if (isReadableText(content)) {
                console.log('Successfully extracted as PDF');
                extractionMethod = "pdf";
              } else {
                throw new Error("PDF extraction yielded unreadable text");
              }
            } catch (pdfError) {
              console.log('PDF extraction failed, trying DOCX extraction');
              // Try as DOCX
              try {
                content = await extractDocxText(fileData);
                if (isReadableText(content)) {
                  console.log('Successfully extracted as DOCX');
                  extractionMethod = "docx";
                } else {
                  throw new Error("DOCX extraction yielded unreadable text");
                }
              } catch (docxError) {
                console.error('All extraction methods failed');
                throw new Error("Could not extract readable text using any available method");
              }
            }
          }
        } catch (error) {
          console.error('Failed to extract text:', error);
          content = "Could not extract readable text from this document. The file format may not be supported or the document may be encrypted.";
          extractionMethod = "failed";
        }
      }
    } catch (extractionError) {
      console.error('Extraction error:', extractionError);
      content = `Error extracting content: ${extractionError.message}`;
      extractionMethod = "error";
    }
    
    // Clean up the content
    content = cleanupExtractedText(content);
    
    // Check if content is readable
    const isReadable = isReadableText(content);
    console.log(`Text extraction complete. Method: ${extractionMethod}, Readable: ${isReadable}, Length: ${content.length} chars`);
    
    if (!isReadable && content.length > 0) {
      console.log('Content is not readable, adding warning');
      content = "WARNING: The system couldn't extract readable text from this document. It may be scanned, encrypted, or in an unsupported format. Below is the best extraction possible:\n\n" + content;
    }
    
    // Update the document with extracted content
    const { error: updateError } = await supabase
      .from('documents')
      .update({ 
        content,
        extraction_method: extractionMethod,
        is_readable: isReadable
      })
      .eq('document_id', documentId);

    if (updateError) {
      console.error('Error updating document:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update document content', details: updateError }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
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

// Extract text from a PDF using PDF.js
async function extractPdfText(file) {
  console.log("Starting PDF extraction with PDF.js");
  const arrayBuffer = await file.arrayBuffer();
  
  try {
    // Load PDF document
    const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
    const pdf = await loadingTask.promise;
    console.log(`PDF loaded with ${pdf.numPages} pages`);
    
    let fullText = "";
    
    // Process each page
    for (let i = 1; i <= pdf.numPages; i++) {
      try {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        
        // Extract text with proper spacing
        const pageText = textContent.items
          .map(item => item.str)
          .join(' ');
        
        fullText += pageText + "\n\n";
      } catch (pageError) {
        console.error(`Error extracting text from page ${i}:`, pageError);
      }
    }
    
    console.log(`Extracted ${fullText.length} characters from PDF`);
    return fullText;
  } catch (error) {
    console.error("PDF extraction failed:", error);
    throw new Error(`PDF extraction error: ${error.message}`);
  }
}

// Extract text from a DOCX file using JSZip
async function extractDocxText(file) {
  console.log("Starting DOCX extraction with JSZip");
  const arrayBuffer = await file.arrayBuffer();
  
  try {
    // Load DOCX as ZIP
    const zip = await JSZip.loadAsync(arrayBuffer);
    
    // DOCX files store content in word/document.xml
    const documentXml = await zip.file("word/document.xml")?.async("text");
    
    if (!documentXml) {
      throw new Error("Missing word/document.xml in DOCX file");
    }
    
    // Process XML content
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
    
    console.log(`Extracted ${text.length} characters from DOCX`);
    return text;
  } catch (error) {
    console.error("DOCX extraction failed:", error);
    throw new Error(`DOCX extraction error: ${error.message}`);
  }
}

// Determine if text is readable
function isReadableText(text) {
  if (!text || text.length < 50) return false;
  
  // Get a sample of the text
  const sample = text.slice(0, Math.min(1000, text.length));
  
  // Check character distribution
  const letterCount = (sample.match(/[a-zA-Z]/g) || []).length;
  const spaceCount = (sample.match(/\s/g) || []).length;
  const totalCount = sample.length;
  
  // Calculate ratios for readability
  const letterRatio = letterCount / totalCount;
  const spaceRatio = spaceCount / totalCount;
  
  // Check for binary data markers
  const hasBinarySignatures = 
    sample.includes('%PDF') || 
    sample.includes('PK\x03\x04') ||
    /[\x00-\x08\x0B\x0C\x0E-\x1F]/.test(sample);
  
  // For human-readable text we expect:
  // - Sufficient letters (>30%)
  // - Adequate spaces (>5%)
  // - No binary signatures
  return (
    letterRatio > 0.3 && 
    spaceRatio > 0.05 && 
    !hasBinarySignatures
  );
}

// Clean up extracted text
function cleanupExtractedText(text) {
  if (!text) return "";
  
  // Multi-stage cleanup for better results
  return text
    .replace(/[\x00-\x1F\x7F-\x9F]/g, '') // Remove control characters
    .replace(/�/g, '') // Remove replacement character
    .replace(/[^\x20-\x7E\n\r\t\u00A0-\u00FF]/g, ' ') // Keep ASCII and basic Latin
    .replace(/\s+/g, ' ') // Normalize whitespace
    .replace(/(\s*\n\s*){3,}/g, '\n\n') // Normalize line breaks
    .trim();
}

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
