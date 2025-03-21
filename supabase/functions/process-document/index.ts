import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// PDF.js library
import 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.4.120/build/pdf.min.js';
const pdfjsLib = (globalThis as any).pdfjsLib;

// For DOCX text extraction
import * as JSZip from 'https://esm.sh/jszip@3.10.1';
import * as xml2js from 'https://esm.sh/xml2js@0.6.2';

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
        // Try different extraction methods
        console.log('Unknown document type, trying multiple extraction methods');
        
        // First try as plain text
        try {
          content = await fileData.text();
          if (content && isReadableText(content)) {
            console.log('Successfully extracted as plain text');
            extractionMethod = "text";
          } else {
            throw new Error("Plain text extraction didn't yield readable results");
          }
        } catch (textError) {
          console.log('Plain text extraction failed, trying PDF extraction');
          
          // Try as PDF
          try {
            content = await extractPdfText(fileData);
            if (content && isReadableText(content)) {
              console.log('Successfully extracted as PDF');
              extractionMethod = "pdf";
            } else {
              throw new Error("PDF extraction didn't yield readable results");
            }
          } catch (pdfError) {
            console.log('PDF extraction failed, trying DOCX extraction');
            
            // Try as DOCX
            try {
              content = await extractDocxText(fileData);
              if (content && isReadableText(content)) {
                console.log('Successfully extracted as DOCX');
                extractionMethod = "docx";
              } else {
                throw new Error("DOCX extraction didn't yield readable results");
              }
            } catch (docxError) {
              console.error('All extraction methods failed');
              content = "The system could not extract readable text from this document. It may be scanned, image-based, encrypted, or in an unsupported format.";
              extractionMethod = "failed";
            }
          }
        }
      }
    } catch (extractionError) {
      console.error('Extraction error:', extractionError);
      content = `Failed to extract content: ${extractionError.message}`;
      extractionMethod = "error";
    }
    
    // Clean up the content - be more aggressive about removing binary content
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

// Improved PDF text extraction with better error handling
async function extractPdfText(file) {
  console.log("Starting PDF extraction with PDF.js");
  
  try {
    const arrayBuffer = await file.arrayBuffer();
    
    // Load PDF document
    const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
    const pdf = await loadingTask.promise;
    console.log(`PDF loaded with ${pdf.numPages} pages`);
    
    let fullText = "";
    
    // Process each page
    for (let i = 1; i <= pdf.numPages; i++) {
      try {
        console.log(`Processing page ${i} of ${pdf.numPages}`);
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        
        if (!textContent || !textContent.items || textContent.items.length === 0) {
          console.log(`No text content in page ${i}, possibly scanned or image-based`);
          continue;
        }
        
        // Extract text with proper spacing
        const pageText = textContent.items
          .map(item => {
            // Check if item has string property
            return item.str || "";
          })
          .join(' ');
        
        fullText += pageText + "\n\n";
      } catch (pageError) {
        console.error(`Error extracting text from page ${i}:`, pageError);
      }
    }
    
    if (fullText.trim().length === 0) {
      throw new Error("No text content extracted from PDF. This might be a scanned document or image-based PDF.");
    }
    
    console.log(`Extracted ${fullText.length} characters from PDF`);
    return fullText;
  } catch (error) {
    console.error("PDF extraction failed:", error);
    throw new Error(`PDF extraction error: ${error.message}`);
  }
}

// Improved DOCX extraction
async function extractDocxText(file) {
  console.log("Starting DOCX extraction with JSZip");
  
  try {
    const arrayBuffer = await file.arrayBuffer();
    
    // Load DOCX as ZIP
    const zip = await JSZip.loadAsync(arrayBuffer);
    let textContent = "";
    
    // DOCX files store content in word/document.xml
    const documentXml = await zip.file("word/document.xml")?.async("text");
    
    if (!documentXml) {
      throw new Error("Missing word/document.xml in DOCX file");
    }
    
    // XML parsing for better text extraction
    try {
      // First, extract text directly from XML by removing tags
      textContent = documentXml
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      
      // Attempt to parse XML for better structure if possible
      const parser = new xml2js.Parser({ explicitArray: false });
      const result = await parser.parseStringPromise(documentXml);
      
      if (result && result.document && result.document.body) {
        const paragraphs = [];
        extractParagraphs(result.document.body, paragraphs);
        
        if (paragraphs.length > 0) {
          textContent = paragraphs.join('\n\n');
        }
      }
    } catch (xmlError) {
      console.log("XML parsing failed, using simple text extraction", xmlError);
      // Already have textContent from regex, so continue
    }
    
    // Clean and decode XML entities
    textContent = textContent
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ')
      .trim();
    
    if (textContent.length === 0) {
      // Check if there's content in document.xml.rels
      try {
        const relationshipsXml = await zip.file("word/_rels/document.xml.rels")?.async("text");
        if (relationshipsXml && relationshipsXml.includes("<Relationship")) {
          console.log("Found relationships but no text content, possibly a complex document with embedded objects");
        }
      } catch (relError) {
        console.log("No relationships found");
      }
      
      throw new Error("No text content extracted from DOCX");
    }
    
    console.log(`Extracted ${textContent.length} characters from DOCX`);
    return textContent;
  } catch (error) {
    console.error("DOCX extraction failed:", error);
    throw new Error(`DOCX extraction error: ${error.message}`);
  }
}

// Helper function to extract paragraphs from XML structure
function extractParagraphs(node, paragraphs) {
  if (!node) return;
  
  if (node.p) {
    if (Array.isArray(node.p)) {
      node.p.forEach(p => {
        const text = extractTextFromParagraph(p);
        if (text) paragraphs.push(text);
      });
    } else {
      const text = extractTextFromParagraph(node.p);
      if (text) paragraphs.push(text);
    }
  }
  
  // Check for tables, sections, etc.
  if (node.tbl) {
    if (Array.isArray(node.tbl)) {
      node.tbl.forEach(tbl => {
        if (tbl.tr) {
          if (Array.isArray(tbl.tr)) {
            tbl.tr.forEach(tr => {
              if (tr.tc) {
                if (Array.isArray(tr.tc)) {
                  tr.tc.forEach(tc => extractParagraphs(tc, paragraphs));
                } else {
                  extractParagraphs(tr.tc, paragraphs);
                }
              }
            });
          } else if (tbl.tr.tc) {
            extractParagraphs(tbl.tr.tc, paragraphs);
          }
        }
      });
    } else if (node.tbl.tr) {
      // Handle single table
      if (Array.isArray(node.tbl.tr)) {
        node.tbl.tr.forEach(tr => {
          if (tr.tc) extractParagraphs(tr.tc, paragraphs);
        });
      } else if (node.tbl.tr.tc) {
        extractParagraphs(node.tbl.tr.tc, paragraphs);
      }
    }
  }
  
  // Check for other container elements
  ['body', 'content', 'div', 'section'].forEach(container => {
    if (node[container]) extractParagraphs(node[container], paragraphs);
  });
}

// Helper function to extract text from paragraph node
function extractTextFromParagraph(p) {
  if (!p) return "";
  
  // Handle nested r/t structure (runs of text)
  let text = "";
  
  if (p.r) {
    if (Array.isArray(p.r)) {
      p.r.forEach(r => {
        if (r.t) text += (typeof r.t === 'string' ? r.t : r.t._) + " ";
      });
    } else if (p.r.t) {
      text += (typeof p.r.t === 'string' ? p.r.t : p.r.t._) + " ";
    }
  } else if (p.t) {
    // Direct text
    text += (typeof p.t === 'string' ? p.t : p.t._) + " ";
  } else if (typeof p === 'string') {
    // Plain text
    text = p;
  } else if (p._) {
    // Text might be in _
    text = p._;
  } else if (p.w_t) {
    // Some variations use w:t instead of t
    text = typeof p.w_t === 'string' ? p.w_t : p.w_t._;
  }
  
  return text.trim();
}

// Improved readability detection
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
    
  // Check for high concentration of Unicode replacement characters
  const replacementCharRatio = (sample.match(/�/g) || []).length / totalCount;
  
  // For human-readable text we expect:
  // - Sufficient letters (>25%)
  // - Adequate spaces (>5%)
  // - Low concentration of replacement chars (<10%)
  // - No binary signatures
  return (
    letterRatio > 0.25 && 
    spaceRatio > 0.05 && 
    replacementCharRatio < 0.1 &&
    !hasBinarySignatures
  );
}

// More aggressive cleanup for extracted text
function cleanupExtractedText(text) {
  if (!text) return "";
  
  // Multi-stage cleanup for better results
  return text
    // Remove control characters
    .replace(/[\x00-\x1F\x7F-\x9F]/g, '') 
    // Remove replacement characters
    .replace(/�/g, '') 
    // Keep ASCII and basic Latin
    .replace(/[^\x20-\x7E\n\r\t\u00A0-\u00FF]/g, ' ') 
    // Normalize whitespace
    .replace(/\s+/g, ' ') 
    // Normalize line breaks
    .replace(/(\s*\n\s*){3,}/g, '\n\n') 
    // Trim
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
