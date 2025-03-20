
import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { DocumentUpload } from '@/components/documents/DocumentUpload';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Calendar,
  Download,
  FileText,
  Search,
  Trash2,
  Upload,
  X,
  ExternalLink,
  File,
  FileImage,
  FileSpreadsheet,
  AlertCircle,
  Loader2
} from 'lucide-react';

interface Document {
  id: string;
  name: string;
  type: string;
  size: number; // in bytes
  uploadDate: Date;
  url: string;
  document_id?: string;
}

const Documents = () => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  
  useEffect(() => {
    fetchDocuments();
  }, [user]);
  
  const fetchDocuments = async () => {
    if (!user) {
      setDocuments([]);
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .order('upload_date', { ascending: false });
        
      if (error) {
        throw error;
      }
      
      const formattedDocs = data.map(doc => ({
        id: doc.id,
        name: doc.name,
        type: doc.type,
        size: doc.size,
        uploadDate: new Date(doc.upload_date),
        url: doc.url,
        document_id: doc.document_id
      }));
      
      setDocuments(formattedDocs);
    } catch (error) {
      console.error('Error fetching documents:', error);
      toast({
        title: "Error loading documents",
        description: "Failed to load your documents. Please try again later.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleFileUpload = (files: File[]) => {
    // Refresh document list after upload
    fetchDocuments();
  };
  
  const handleDelete = async (id: string) => {
    if (!user) return;
    
    const documentToDelete = documents.find(d => d.id === id);
    if (!documentToDelete || !documentToDelete.document_id) return;
    
    setIsDeleting(true);
    
    try {
      // First delete the file from storage
      if (documentToDelete.document_id) {
        const filePath = `${user.id}/${documentToDelete.document_id}`;
        const { error: storageError } = await supabase
          .storage
          .from('documents')
          .remove([filePath]);
        
        if (storageError) {
          console.error('Error removing file from storage:', storageError);
        }
      }
      
      // Then delete the database entry
      const { error: dbError } = await supabase
        .from('documents')
        .delete()
        .eq('id', id);
        
      if (dbError) {
        throw dbError;
      }
      
      setDocuments(documents.filter(document => document.id !== id));
      
      toast({
        title: "Document Deleted",
        description: `"${documentToDelete.name}" has been deleted.`,
      });
    } catch (error) {
      console.error('Error deleting document:', error);
      toast({
        title: "Error deleting document",
        description: "Failed to delete the document. Please try again later.",
        variant: "destructive"
      });
    } finally {
      setIsDeleting(false);
    }
  };
  
  const formatSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };
  
  const formatDate = (date: Date): string => {
    return date.toLocaleDateString(undefined, { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };
  
  const getFileIcon = (type: string) => {
    if (type.includes('pdf') || type.endsWith('.pdf')) {
      return <File className="h-10 w-10 text-red-500" />;
    } else if (type.includes('word') || type.includes('doc') || type.endsWith('.docx') || type.endsWith('.doc')) {
      return <FileText className="h-10 w-10 text-blue-500" />;
    } else if (type.includes('sheet') || type.includes('excel') || type.includes('csv') || type.endsWith('.xlsx') || type.endsWith('.xls') || type.endsWith('.csv')) {
      return <FileSpreadsheet className="h-10 w-10 text-green-500" />;
    } else if (type.includes('image') || ['jpg', 'jpeg', 'png', 'gif', 'webp'].some(ext => type.endsWith(`.${ext}`))) {
      return <FileImage className="h-10 w-10 text-purple-500" />;
    } else {
      return <FileText className="h-10 w-10 text-gray-500" />;
    }
  };
  
  const filteredDocuments = documents.filter(document => {
    const matchesSearch = searchQuery === '' || 
      document.name.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesType = activeTab === 'all' || 
      (activeTab === 'pdf' && (document.type.includes('pdf') || document.name.endsWith('.pdf'))) ||
      (activeTab === 'docx' && (document.type.includes('doc') || document.name.endsWith('.docx') || document.name.endsWith('.doc'))) ||
      (activeTab === 'other' && !document.type.includes('pdf') && !document.type.includes('doc') && !document.name.endsWith('.pdf') && !document.name.endsWith('.docx') && !document.name.endsWith('.doc'));
    
    return matchesSearch && matchesType;
  });
  
  return (
    <MainLayout>
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Documents</h1>
            <p className="text-muted-foreground mt-1">
              Upload and manage documents for AI analysis.
            </p>
          </div>
          
          <label htmlFor="file-upload">
            <Button className="gap-1.5">
              <Upload className="h-4 w-4" />
              Upload
            </Button>
          </label>
        </div>
        
        <Card className="mb-8">
          <CardContent className="p-6">
            <DocumentUpload onUpload={handleFileUpload} />
          </CardContent>
        </Card>
        
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab} className="w-full sm:w-auto">
              <TabsList>
                <TabsTrigger value="all">All Files</TabsTrigger>
                <TabsTrigger value="pdf">PDFs</TabsTrigger>
                <TabsTrigger value="docx">Documents</TabsTrigger>
                <TabsTrigger value="other">Other</TabsTrigger>
              </TabsList>
            </Tabs>
            
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9 w-full sm:w-[300px]"
                placeholder="Search documents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-10 w-10"
                  onClick={() => setSearchQuery('')}
                >
                  <X className="h-4 w-4" />
                  <span className="sr-only">Clear search</span>
                </Button>
              )}
            </div>
          </div>
          
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-8 w-8 text-primary animate-spin mb-4" />
              <p className="text-muted-foreground">Loading your documents...</p>
            </div>
          ) : filteredDocuments.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredDocuments.map((document) => (
                <Card 
                  key={document.id}
                  className="overflow-hidden transition-all duration-200 hover:shadow-md animate-fade-in"
                >
                  <div className="flex p-4">
                    <div className="flex items-center justify-center h-16 w-16 bg-muted/50 rounded mr-4">
                      {getFileIcon(document.type)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base truncate">
                        {document.name}
                      </CardTitle>
                      
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          <span>{formatDate(document.uploadDate)}</span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatSize(document.size)}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <CardFooter className="p-3 pt-0 flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8"
                      asChild
                    >
                      <a href={document.url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                        View
                      </a>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8"
                      asChild
                    >
                      <a href={document.url} download>
                        <Download className="h-3.5 w-3.5 mr-1.5" />
                        Download
                      </a>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                      onClick={() => handleDelete(document.id)}
                      disabled={isDeleting}
                    >
                      {isDeleting ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 animate-fade-in">
              <div className="h-16 w-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                <FileText className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium mb-2">No documents found</h3>
              {searchQuery || activeTab !== 'all' ? (
                <p className="text-muted-foreground max-w-md mx-auto">
                  No documents match your current filters. Try changing your search or filter criteria.
                </p>
              ) : (
                <p className="text-muted-foreground max-w-md mx-auto">
                  You haven't uploaded any documents yet. Use the upload button above to add documents.
                </p>
              )}
              
              {(searchQuery || activeTab !== 'all') && (
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={() => {
                    setSearchQuery('');
                    setActiveTab('all');
                  }}
                >
                  Clear Filters
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
};

export default Documents;
