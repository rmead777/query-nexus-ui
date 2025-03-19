
import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/components/ui/use-toast';
import { 
  Clock, 
  Download, 
  MessageSquare, 
  Search, 
  Star, 
  StarOff, 
  Trash2,
  X
} from 'lucide-react';

interface ConversationItem {
  id: string;
  title: string;
  preview: string;
  messageCount: number;
  createdAt: Date;
  isFavorite: boolean;
}

const Conversations = () => {
  const [conversations, setConversations] = useState<ConversationItem[]>([
    {
      id: '1',
      title: 'Document Analysis: Marketing Strategy',
      preview: 'I need to analyze our Q3 marketing strategy document to extract key performance indicators and budget allocations.',
      messageCount: 12,
      createdAt: new Date('2023-09-15T14:23:00'),
      isFavorite: true
    },
    {
      id: '2',
      title: 'Technical Documentation Review',
      preview: 'Can you help me review this API documentation for clarity, completeness, and technical accuracy?',
      messageCount: 8,
      createdAt: new Date('2023-09-10T09:45:00'),
      isFavorite: false
    },
    {
      id: '3',
      title: 'Research Paper Analysis',
      preview: 'I need help understanding the key findings and methodology of this research paper on large language models.',
      messageCount: 15,
      createdAt: new Date('2023-09-05T16:30:00'),
      isFavorite: true
    }
  ]);
  
  const [searchQuery, setSearchQuery] = useState('');
  const { toast } = useToast();
  
  const filteredConversations = searchQuery
    ? conversations.filter(conversation => 
        conversation.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        conversation.preview.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : conversations;
  
  const handleDelete = (id: string) => {
    const conversationTitle = conversations.find(c => c.id === id)?.title;
    setConversations(conversations.filter(conversation => conversation.id !== id));
    
    toast({
      title: "Conversation Deleted",
      description: `The conversation "${conversationTitle}" has been deleted.`,
    });
  };
  
  const handleToggleFavorite = (id: string) => {
    setConversations(conversations.map(conversation => 
      conversation.id === id 
        ? { ...conversation, isFavorite: !conversation.isFavorite } 
        : conversation
    ));
    
    const conversation = conversations.find(c => c.id === id);
    if (conversation) {
      toast({
        title: conversation.isFavorite ? "Removed from Favorites" : "Added to Favorites",
        description: `"${conversation.title}" has been ${conversation.isFavorite ? 'removed from' : 'added to'} your favorites.`,
      });
    }
  };
  
  const formatDate = (date: Date) => {
    const now = new Date();
    const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) {
      return 'Today, ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInDays === 1) {
      return 'Yesterday, ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInDays < 7) {
      return date.toLocaleDateString([], { weekday: 'long' }) + ', ' + 
             date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString([], { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      });
    }
  };
  
  return (
    <MainLayout>
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Saved Conversations</h1>
            <p className="text-muted-foreground mt-1">
              Access and manage your previous conversations.
            </p>
          </div>
        </div>
        
        <div className="relative mb-6">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9 bg-background"
            placeholder="Search conversations..."
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
        
        {filteredConversations.length > 0 ? (
          <div className="space-y-4">
            {filteredConversations.map((conversation) => (
              <Card 
                key={conversation.id}
                className="overflow-hidden transition-all duration-200 hover:shadow-md animate-fade-in"
              >
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg">
                      {conversation.title}
                    </CardTitle>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-amber-500"
                        onClick={() => handleToggleFavorite(conversation.id)}
                      >
                        {conversation.isFavorite ? (
                          <Star className="h-4 w-4 fill-amber-500" />
                        ) : (
                          <StarOff className="h-4 w-4" />
                        )}
                        <span className="sr-only">
                          {conversation.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                        </span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-500"
                        onClick={() => handleDelete(conversation.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Delete conversation</span>
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="pb-3">
                  <ScrollArea className="h-16">
                    <p className="text-sm text-muted-foreground">
                      {conversation.preview}
                    </p>
                  </ScrollArea>
                </CardContent>
                
                <Separator />
                
                <CardFooter className="py-3 flex justify-between">
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      <span>{formatDate(conversation.createdAt)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <MessageSquare className="h-3.5 w-3.5" />
                      <span>{conversation.messageCount} messages</span>
                    </div>
                  </div>
                  
                  <div className="flex gap-1">
                    <Button variant="outline" size="sm" asChild>
                      <a href={`#conversation-${conversation.id}`}>View</a>
                    </Button>
                    <Button variant="secondary" size="sm" className="gap-1">
                      <Download className="h-3.5 w-3.5" />
                      Export
                    </Button>
                  </div>
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 animate-fade-in">
            <div className="h-16 w-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
              <MessageSquare className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium mb-2">No conversations found</h3>
            {searchQuery ? (
              <p className="text-muted-foreground max-w-md mx-auto">
                No conversations match your search criteria. Try a different search term or clear your search.
              </p>
            ) : (
              <p className="text-muted-foreground max-w-md mx-auto">
                You haven't saved any conversations yet. Start a new chat to create your first conversation.
              </p>
            )}
            
            {searchQuery && (
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => setSearchQuery('')}
              >
                Clear Search
              </Button>
            )}
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default Conversations;
