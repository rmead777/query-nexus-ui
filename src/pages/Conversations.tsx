
import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/components/ui/use-toast';
import { toast } from 'sonner';
import { 
  Clock, 
  Download, 
  MessageSquare, 
  Search, 
  Star, 
  StarOff, 
  Trash2,
  X,
  Loader2
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useConversationStore } from '@/hooks/use-conversation-store';

interface ConversationItem {
  id: string;
  title: string;
  preview: string;
  messageCount: number;
  createdAt: Date;
  isFavorite: boolean;
}

const Conversations = () => {
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { loadConversation } = useConversationStore();
  
  useEffect(() => {
    if (user) {
      fetchConversations();
    }
  }, [user]);
  
  const fetchConversations = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });
        
      if (error) throw error;
      
      const formattedConversations: ConversationItem[] = (data || []).map(conv => {
        const messages = conv.messages || [];
        const firstUserMessage = messages.find((m: any) => m.role === 'user');
        
        return {
          id: conv.conversation_id,
          title: conv.title || 'Untitled Conversation',
          preview: firstUserMessage ? firstUserMessage.content : 'No content available',
          messageCount: messages.length,
          createdAt: new Date(conv.created_at),
          isFavorite: conv.is_favorite || false
        };
      });
      
      setConversations(formattedConversations);
    } catch (error) {
      console.error('Error fetching conversations:', error);
      toast({
        title: "Error",
        description: "Failed to load your conversations.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const filteredConversations = searchQuery
    ? conversations.filter(conversation => 
        conversation.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        conversation.preview.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : conversations;
  
  const handleDelete = async (id: string) => {
    try {
      const conversationTitle = conversations.find(c => c.id === id)?.title;
      
      const { error } = await supabase
        .from('conversations')
        .delete()
        .eq('conversation_id', id)
        .eq('user_id', user?.id);
        
      if (error) throw error;
      
      setConversations(conversations.filter(conversation => conversation.id !== id));
      
      toast({
        title: "Conversation Deleted",
        description: `The conversation "${conversationTitle}" has been deleted.`,
      });
    } catch (error) {
      console.error('Error deleting conversation:', error);
      toast({
        title: "Error",
        description: "Failed to delete the conversation.",
        variant: "destructive"
      });
    }
  };
  
  const handleToggleFavorite = async (id: string) => {
    try {
      const conversation = conversations.find(c => c.id === id);
      if (!conversation) return;
      
      const newFavoriteStatus = !conversation.isFavorite;
      
      const { error } = await supabase
        .from('conversations')
        .update({ is_favorite: newFavoriteStatus })
        .eq('conversation_id', id)
        .eq('user_id', user?.id);
        
      if (error) throw error;
      
      setConversations(conversations.map(conv => 
        conv.id === id 
          ? { ...conv, isFavorite: newFavoriteStatus } 
          : conv
      ));
      
      toast({
        title: newFavoriteStatus ? "Added to Favorites" : "Removed from Favorites",
        description: `"${conversation.title}" has been ${newFavoriteStatus ? 'added to' : 'removed from'} your favorites.`,
      });
    } catch (error) {
      console.error('Error updating favorite status:', error);
      toast({
        title: "Error",
        description: "Failed to update favorite status.",
        variant: "destructive"
      });
    }
  };
  
  const handleViewConversation = async (id: string) => {
    try {
      const success = await loadConversation(id);
      if (success) {
        navigate('/');
        toast('Conversation loaded', {
          duration: 3000
        });
      } else {
        throw new Error('Failed to load conversation');
      }
    } catch (error) {
      console.error('Error loading conversation:', error);
      toast('Failed to load conversation', {
        duration: 3000
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
          
          <Button onClick={fetchConversations} variant="outline" size="sm">
            Refresh
          </Button>
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
        
        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredConversations.length > 0 ? (
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
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleViewConversation(conversation.id)}
                    >
                      View
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
                You haven't saved any conversations yet. Start a new chat and enable auto-save to store your conversations.
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
