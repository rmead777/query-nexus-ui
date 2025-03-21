
import { useState, useRef } from 'react';
import { FileUp, X, File, Loader2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { v4 as uuidv4 } from '@/lib/uuid';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';

interface FileUploadProps {
  onUpload: (files: File[]) => void;
  accept?: string;
  multiple?: boolean;
  maxSize?: number; // in MB
  className?: string;
}

export function DocumentUpload({ 
  onUpload, 
  accept = ".pdf,.docx,.txt,.md", 
  multiple = true, 
  maxSize = 10, 
  className 
}: FileUploadProps) {
  const [dragActive, setDragActive] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };
  
  const validateFiles = (filesToValidate: File[]) => {
    return filesToValidate.filter(file => {
      if (file.size > maxSize * 1024 * 1024) {
        toast({
          title: "File too large",
          description: `${file.name} exceeds maximum size of ${maxSize}MB`,
          variant: "destructive"
        });
        return false;
      }
      
      if (accept !== '*') {
        const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
        const acceptedTypes = accept.split(',');
        
        if (!acceptedTypes.some(type => {
          return type.trim().toLowerCase() === fileExtension || 
                 type.trim() === '*' || 
                 type.trim() === '';
        })) {
          toast({
            title: "Invalid file type",
            description: `${file.name} is not an accepted file type`,
            variant: "destructive"
          });
          return false;
        }
      }
      
      return true;
    });
  };
  
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFiles = Array.from(e.dataTransfer.files);
      const validFiles = validateFiles(droppedFiles);
      setFiles(validFiles);
    }
  };
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    
    if (e.target.files && e.target.files.length > 0) {
      const selectedFiles = Array.from(e.target.files);
      const validFiles = validateFiles(selectedFiles);
      setFiles(validFiles);
    }
  };
  
  const handleUpload = async () => {
    if (files.length === 0) return;
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to upload documents",
        variant: "destructive"
      });
      return;
    }
    
    setUploading(true);
    setProgress(0);
    
    const uploadedFiles: File[] = [];
    let completedUploads = 0;
    
    try {
      for (const file of files) {
        const documentId = uuidv4();
        const filePath = `${user.id}/${documentId}`;
        
        const { error: uploadError } = await supabase.storage
          .from('documents')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false
          });
        
        if (uploadError) {
          toast({
            title: "Upload failed",
            description: `Failed to upload ${file.name}: ${uploadError.message}`,
            variant: "destructive"
          });
          continue;
        }
        
        const { data: urlData } = supabase.storage
          .from('documents')
          .getPublicUrl(filePath);
        
        const { error: dbError } = await supabase
          .from('documents')
          .insert({
            name: file.name,
            type: file.type || file.name.split('.').pop() || 'unknown',
            size: file.size,
            url: urlData.publicUrl,
            user_id: user.id,
            document_id: documentId
          });
        
        if (dbError) {
          toast({
            title: "Database error",
            description: `Failed to save document metadata: ${dbError.message}`,
            variant: "destructive"
          });
          continue;
        }
        
        try {
          console.log(`Processing document ${documentId}`);
          const { data, error } = await supabase.functions.invoke('process-document', {
            body: { 
              documentId,
              forceReprocess: true
            }
          });
            
          if (error) {
            console.error('Error processing document:', error);
            toast({
              title: "Processing issue",
              description: "The document was uploaded but there was an issue processing its contents. You can try reprocessing it later.",
              variant: "destructive"
            });
          } else {
            console.log('Document processed:', data);
            if (data && data.readable_content === false) {
              toast({
                title: "Document processing issue",
                description: "The document was uploaded but its content may not be fully readable. The system will continue trying to extract text.",
                variant: "default"
              });
            }
          }
        } catch (processError) {
          console.error('Error processing document:', processError);
        }
        
        uploadedFiles.push(file);
        completedUploads++;
        setProgress(Math.round((completedUploads / files.length) * 100));
      }
      
      if (uploadedFiles.length > 0) {
        onUpload(uploadedFiles);
        setFiles([]);
        toast({
          title: "Upload complete",
          description: `Successfully uploaded ${uploadedFiles.length} document${uploadedFiles.length === 1 ? '' : 's'}.`,
        });
      }
      
    } catch (error) {
      console.error("Upload failed:", error);
      toast({
        title: "Upload failed",
        description: "An unexpected error occurred during upload.",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };
  
  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
  };
  
  return (
    <div className={cn("w-full", className)}>
      <div
        className={cn(
          "relative flex flex-col items-center justify-center w-full rounded-lg border-2 border-dashed transition-colors duration-200 p-6",
          dragActive ? "border-primary/70 bg-primary/5" : "border-border bg-background/50",
          uploading && "pointer-events-none opacity-80"
        )}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept={accept}
          multiple={multiple}
          onChange={handleChange}
          disabled={uploading}
        />
        
        <div className="flex flex-col items-center justify-center gap-3 text-center">
          <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
            <FileUp className="h-6 w-6 text-primary" />
          </div>
          
          <div>
            <h3 className="text-lg font-medium">Upload Documents</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-xs">
              Drag and drop your files here, or click to browse. Supports PDF, DOCX, TXT, and MD up to {maxSize}MB.
            </p>
          </div>
          
          <Button
            type="button"
            variant="outline"
            className="mt-2"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
          >
            Browse Files
          </Button>
        </div>
      </div>
      
      {files.length > 0 && (
        <div className="mt-4 space-y-3 animate-fade-in">
          {files.map((file, index) => (
            <div 
              key={`${file.name}-${index}`}
              className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card"
            >
              <div className="h-8 w-8 rounded flex items-center justify-center bg-primary/10">
                <File className="h-4 w-4 text-primary" />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">
                  {file.name}
                </div>
                <div className="text-xs text-muted-foreground">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </div>
              </div>
              
              {!uploading && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 rounded-full hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => removeFile(index)}
                >
                  <X className="h-3.5 w-3.5" />
                  <span className="sr-only">Remove file</span>
                </Button>
              )}
            </div>
          ))}
          
          {uploading ? (
            <div className="animate-fade-in">
              <div className="flex items-center gap-2 text-sm mb-1.5">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Uploading...</span>
                <span className="ml-auto">{progress}%</span>
              </div>
              <Progress value={progress} className="h-1.5" />
            </div>
          ) : (
            <Button
              className="w-full mt-2"
              onClick={handleUpload}
            >
              Upload {files.length} {files.length === 1 ? 'file' : 'files'}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
