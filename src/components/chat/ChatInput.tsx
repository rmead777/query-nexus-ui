
import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Paperclip, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  onFileUpload: (files: FileList) => void;
  isLoading?: boolean;
}

export function ChatInput({ onSendMessage, onFileUpload, isLoading = false }: ChatInputProps) {
  const [message, setMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !isLoading) {
      onSendMessage(message);
      setMessage('');
    }
  };
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };
  
  return (
    <form onSubmit={handleSubmit} className="relative mt-4">
      <div className="relative flex items-center">
        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask anything..."
          className={cn(
            "pr-24 resize-none transition-all duration-200 min-h-[60px] max-h-32 text-base",
            "focus:ring-1 focus:ring-primary/50 focus-visible:ring-1 focus-visible:ring-primary/50",
            "rounded-xl border border-border bg-card/80 backdrop-blur-sm"
          )}
          disabled={isLoading}
        />
        
        <div className="absolute right-2 bottom-2 flex gap-1">
          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => e.target.files && onFileUpload(e.target.files)}
            className="hidden"
            multiple
          />
          
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-8 w-8 rounded-full bg-transparent hover:bg-muted transition-colors"
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
          >
            <Paperclip className="h-4 w-4 text-muted-foreground" />
            <span className="sr-only">Attach files</span>
          </Button>
          
          <Button
            type="submit"
            size="icon"
            disabled={!message.trim() || isLoading}
            className={cn(
              "h-8 w-8 rounded-full transition-colors duration-200",
              !message.trim() ? "bg-muted text-muted-foreground" : "bg-primary text-primary-foreground"
            )}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            <span className="sr-only">Send message</span>
          </Button>
        </div>
      </div>
    </form>
  );
}
