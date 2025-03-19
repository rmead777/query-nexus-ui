import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { DocumentUpload } from '@/components/documents/DocumentUpload';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
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
  FileSpreadsheet
} from 'lucide-react';

interface Document {
  id: string;
  name: string;
  type: 'pdf' | 'docx' | 'txt' | 'xlsx' | 'image';
  size: number; // in bytes
  uploadDate: Date;
  url: string;
}

const Documents = () => {
  const [documents, setDocuments] = useState<Document[]>([
    {
      id: '1',
      name: 'Marketing Strategy Q3 2023.pdf',
      type: 'pdf',
      size: 2457600, // 2.4 MB
      uploadDate: new Date('2023-09-15T14:23:00'),
      url: '#'
    },
    {
      id: '2',
      name: 'Technical Documentation.docx',
      type: 'docx',
      size: 1548288, // 1.5 MB
      uploadDate: new Date('2023-09-10T09:45:00'),
      url: '#'
    },
    {
      id: '3',
      name: 'Research Notes.txt',
      type: 'txt',
      size: 45056, // 44 KB
      uploadDate: new Date('2023-09-05T16:30:00'),
      url: '#'
    }
  ]);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const { toast } = useToast();
  
  const handleFileUpload = (files: File[]) => {
    const newDocuments: Document[] = files.map(file => {
      const fileExt = file.name.split('.').pop()?.toLowerCase() || '';
      let type: Document['type'] = 'txt';
      
      if (['pdf'].includes(fileExt)) type = 'pdf';
      else if (['doc', 'docx'].includes(fileExt)) type = 'docx';
      else if (['xls', 'xlsx', 'csv'].includes(fileExt)) type = 'xlsx';
      else if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileExt)) type = 'image';
      
      return {
        id: Math.random().toString(36).substring(2, 9),
        name: file.name,
        type,
        size: file.size,
        uploadDate: new Date(),
        url: '#'
      };
    });
    
    setDocuments([...newDocuments, ...documents]);
    
    toast({
      title: "Documents Uploaded",
      description: `Successfully uploaded ${files.length} document${files.length === 1 ? '' : 's'}.`,
    });
  };
  
  const handleDelete = (id: string) => {
    const documentName = documents.find(d => d.id === id)?.name;
    setDocuments(documents.filter(document => document.id !== id));
    
    toast({
      title: "Document Deleted",
      description: `"${documentName}" has been deleted.`,
    });
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
  
  const getFileIcon = (type: Document['type']) => {
    switch (type) {
      case 'pdf':
        return <File className="h-10 w-10 text-red-500" />;
      case 'docx':
        return <FileText className="h-10 w-10 text-blue-500" />;
      case 'xlsx':
        return <FileSpreadsheet className="h-10 w-10 text-green-500" />;
      case 'image':
        return <FileImage className="h-10 w-10 text-purple-500" />;
      default:
        return <FileText className="h-10 w-10 text-gray-500" />;
    }
  };
  
  const filteredDocuments = documents.filter(document => {
    const matchesSearch = searchQuery === '' || 
      document.name.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesType = activeTab === 'all' || 
      (activeTab === 'pdf' && document.type === 'pdf') ||
      (activeTab === 'docx' && document.type === 'docx') ||
      (activeTab === 'other' && !['pdf', 'docx'].includes(document.type));
    
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
          
          <Button className="gap-1.5">
            <Upload className="h-4 w-4" />
            Upload
          </Button>
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
          
          {filteredDocuments.length > 0 ? (
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
                    >
                      <Download className="h-3.5 w-3.5 mr-1.5" />
                      Download
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                      onClick={() => handleDelete(document.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
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
