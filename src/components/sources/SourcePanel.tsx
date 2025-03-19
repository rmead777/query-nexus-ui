
import { useState } from 'react';
import { Search, ExternalLink, X, ChevronUp, ChevronDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

interface Source {
  id: string;
  title: string;
  url?: string;
  content: string;
  documentName?: string;
  relevanceScore: number; // 0-100
}

interface SourcePanelProps {
  sources: Source[];
}

export function SourcePanel({ sources }: SourcePanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  
  const filteredSources = searchQuery
    ? sources.filter(source => 
        source.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        source.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (source.documentName && source.documentName.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : sources;
  
  if (sources.length === 0) {
    return (
      <div className="h-full flex flex-col p-4">
        <div className="text-lg font-medium mb-4 pb-3 border-b">Sources</div>
        <div className="flex-1 flex items-center justify-center text-center p-4">
          <div className="text-muted-foreground">
            No sources available for this conversation.
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="h-full flex flex-col p-4">
      <div className="text-lg font-medium mb-4 pb-2 border-b flex justify-between items-center">
        <span>Sources ({sources.length})</span>
      </div>
      
      <div className="relative mb-4">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search sources..."
          className="pl-9"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        {searchQuery && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-0 top-0 h-9 w-9"
            onClick={() => setSearchQuery('')}
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Clear search</span>
          </Button>
        )}
      </div>
      
      <ScrollArea className="flex-1 pr-3 -mr-3">
        <div className="space-y-3">
          {filteredSources.map((source) => (
            <SourceItem key={source.id} source={source} />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

function SourceItem({ source }: { source: Source }) {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <div className="animate-fade-in">
      <Collapsible
        open={isOpen}
        onOpenChange={setIsOpen}
        className="rounded-md border border-border bg-card overflow-hidden transition-all duration-200"
      >
        <div className="p-3">
          <div className="flex justify-between items-start gap-2">
            <div className="flex-1">
              <div className="font-medium text-sm line-clamp-1">{source.title}</div>
              {source.documentName && (
                <div className="text-xs text-muted-foreground mt-0.5">
                  From: {source.documentName}
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-1">
              {source.url && (
                <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                  <a href={source.url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-3.5 w-3.5" />
                    <span className="sr-only">Open source</span>
                  </a>
                </Button>
              )}
              
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  {isOpen ? (
                    <ChevronUp className="h-3.5 w-3.5" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5" />
                  )}
                  <span className="sr-only">
                    {isOpen ? "Collapse" : "Expand"}
                  </span>
                </Button>
              </CollapsibleTrigger>
            </div>
          </div>
          
          <div className="mt-1.5 flex items-center gap-2">
            <div 
              className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden"
              title={`Relevance: ${source.relevanceScore}%`}
            >
              <div 
                className={cn(
                  "h-full rounded-full",
                  source.relevanceScore > 80 ? "bg-green-500" :
                  source.relevanceScore > 50 ? "bg-yellow-500" :
                  "bg-red-500"
                )}
                style={{ width: `${source.relevanceScore}%` }}
              />
            </div>
            <span className="text-xs font-medium">
              {source.relevanceScore}%
            </span>
          </div>
        </div>
        
        <CollapsibleContent>
          <div className="p-3 pt-0 text-sm">
            <div className="p-2 rounded bg-muted/50 text-muted-foreground text-xs whitespace-pre-wrap">
              {source.content}
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
