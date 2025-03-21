
import React, { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Trash2, Star } from 'lucide-react';
import { useConversationStore } from '@/hooks/use-conversation-store';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { Json } from '@/integrations/supabase/types';

interface Conversation {
  id: string;
  title: string;
  preview: string;
  messages: Json;
  message_count: number;
  is_favorite: boolean;
  created_at: string;
  updated_at?: string;
  user_id: string;
}

const Conversations = () => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { loadConversation } = useConversationStore();
  
  const fetchConversations = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      setConversations(data || []);
    } catch (error) {
      console.error('Error fetching conversations:', error);
      toast.error('Failed to load conversations');
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchConversations();
  }, [user]);
  
  const handleOpenConversation = async (conversation: Conversation) => {
    const success = await loadConversation(conversation.id);
    
    if (success) {
      navigate('/');
    } else {
      toast.error('Failed to load conversation');
    }
  };
  
  const handleDeleteConversation = async (conversationId: string) => {
    try {
      const { error } = await supabase
        .from('conversations')
        .delete()
        .eq('id', conversationId);
      
      if (error) throw error;
      
      setConversations(prevConversations => 
        prevConversations.filter(conv => conv.id !== conversationId)
      );
      
      toast.success('Conversation deleted');
    } catch (error) {
      console.error('Error deleting conversation:', error);
      toast.error('Failed to delete conversation');
    }
  };
  
  const handleToggleFavorite = async (conversation: Conversation) => {
    try {
      const { error } = await supabase
        .from('conversations')
        .update({ is_favorite: !conversation.is_favorite })
        .eq('id', conversation.id);
      
      if (error) throw error;
      
      setConversations(prevConversations => 
        prevConversations.map(conv => 
          conv.id === conversation.id 
            ? { ...conv, is_favorite: !conv.is_favorite } 
            : conv
        )
      );
      
      toast.success(
        conversation.is_favorite 
          ? 'Removed from favorites' 
          : 'Added to favorites'
      );
    } catch (error) {
      console.error('Error updating favorite status:', error);
      toast.error('Failed to update favorite status');
    }
  };
  
  return (
    <MainLayout>
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-6">Your Conversations</h1>
        
        {loading ? (
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
          </div>
        ) : conversations.length === 0 ? (
          <div className="text-center py-12">
            <h2 className="text-xl font-semibold mb-2">No conversations yet</h2>
            <p className="text-gray-500 mb-4">Start a new conversation to see it here.</p>
            <Button onClick={() => navigate('/')}>Start New Conversation</Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {conversations.map(conversation => (
              <Card key={conversation.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg truncate" title={conversation.title}>
                      {conversation.title}
                    </CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggleFavorite(conversation)}
                      className={conversation.is_favorite ? 'text-yellow-500' : ''}
                    >
                      <Star className={conversation.is_favorite ? 'fill-yellow-500' : ''} size={16} />
                    </Button>
                  </div>
                  <CardDescription className="truncate">
                    {conversation.preview}
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-sm text-gray-500 pb-2">
                  {conversation.message_count} messages · {new Date(conversation.created_at).toLocaleDateString()}
                </CardContent>
                <CardFooter className="pt-0 flex justify-between">
                  <Button 
                    variant="default" 
                    onClick={() => handleOpenConversation(conversation)}
                  >
                    Open
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="icon">
                        <Trash2 size={16} />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Conversation</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone. This will permanently delete the conversation.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDeleteConversation(conversation.id)}>
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default Conversations;
