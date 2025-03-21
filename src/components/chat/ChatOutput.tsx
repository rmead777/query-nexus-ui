
import { useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { Message } from '@/hooks/use-conversation-store';

interface ChatOutputProps {
  messages: Message[];
  isLoading?: boolean;
}

export function ChatOutput({ messages, isLoading = false }: ChatOutputProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  if (messages.length === 0 && !isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] text-center p-6">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4 animate-float">
          <span className="text-primary text-2xl font-light">AI</span>
        </div>
        <h2 className="text-2xl font-medium mb-2">How can I help you today?</h2>
        <p className="text-muted-foreground max-w-md">
          Ask me anything or upload documents for deeper insights.
        </p>
      </div>
    );
  }
  
  return (
    <div className="space-y-6 py-4">
      {messages.map((message) => (
        <div
          key={message.id}
          className={cn(
            "flex w-full max-w-4xl mx-auto animate-fade-in",
            message.role === 'user' ? 'justify-end' : 'justify-start'
          )}
        >
          <Card 
            className={cn(
              "px-4 py-3 max-w-[85%] shadow-sm",
              message.role === 'user' 
                ? "bg-primary text-primary-foreground rounded-tl-xl rounded-bl-xl rounded-br-xl rounded-tr-sm" 
                : "bg-card text-card-foreground rounded-tr-xl rounded-br-xl rounded-bl-xl rounded-tl-sm"
            )}
          >
            <div className="text-balance whitespace-pre-wrap text-sm">{message.content}</div>
            <div className="mt-1 text-[10px] opacity-70 text-right">
              {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          </Card>
        </div>
      ))}
      
      {isLoading && (
        <div className="flex w-full max-w-4xl mx-auto animate-fade-in">
          <Card className="px-4 py-3 max-w-[85%] shadow-sm bg-card text-card-foreground rounded-tr-xl rounded-br-xl rounded-bl-xl rounded-tl-sm">
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm text-muted-foreground">Thinking...</span>
            </div>
          </Card>
        </div>
      )}
      
      <div ref={messagesEndRef} />
    </div>
  );
}
