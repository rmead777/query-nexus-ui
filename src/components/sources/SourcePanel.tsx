
import { useState } from 'react';
import { Search, ExternalLink, X, ChevronUp, ChevronDown, Info } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from '@/components/ui/collapsible';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Toggle, toggleVariants } from '@/components/ui/toggle';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

interface Source {
  id: string;
  title: string;
  url?: string;
  content: string;
  documentName?: string;
  relevanceScore: number; // 0-100
  relevanceCategory?: string; // "High", "Medium", "Low"
  wordCount?: number;
}

interface SourcePanelProps {
  sources: Source[];
}

export function SourcePanel({ sources }: SourcePanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  
  const filteredSources = sources
    .filter(source => {
      // Apply search filter
      const matchesSearch = !searchQuery ? true : (
        source.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        source.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (source.documentName && source.documentName.toLowerCase().includes(searchQuery.toLowerCase()))
      );
      
      // Apply relevance filter
      let matchesRelevance = true;
      if (filterMode !== 'all') {
        const category = source.relevanceCategory || getRelevanceCategoryFromScore(source.relevanceScore);
        matchesRelevance = category.toLowerCase() === filterMode;
      }
      
      return matchesSearch && matchesRelevance;
    })
    .sort((a, b) => b.relevanceScore - a.relevanceScore); // Sort by relevance score
  
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
      
      <div className="mb-4">
        <ToggleGroup type="single" value={filterMode} onValueChange={(value) => value && setFilterMode(value as any)}>
          <ToggleGroupItem value="all" aria-label="Show all">All</ToggleGroupItem>
          <ToggleGroupItem value="high" aria-label="High relevance">High</ToggleGroupItem>
          <ToggleGroupItem value="medium" aria-label="Medium relevance">Medium</ToggleGroupItem>
          <ToggleGroupItem value="low" aria-label="Low relevance">Low</ToggleGroupItem>
        </ToggleGroup>
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
  
  // Determine relevance color based on score or category
  const getRelevanceColor = (score: number, category?: string) => {
    if (category === "High" || score >= 90) return "bg-green-500";
    if (category === "Medium" || score >= 75) return "bg-yellow-500";
    if (category === "Low" || score >= 60) return "bg-orange-400";
    return "bg-red-400";
  };

  // Determine badge color for relevance category - using allowed variants only
  const getBadgeVariant = (category?: string): "default" | "secondary" | "destructive" | "outline" => {
    if (!category) return "outline";
    
    switch(category) {
      case "High": return "default"; // instead of "success"
      case "Medium": return "secondary"; // instead of "warning"
      case "Low": return "destructive";
      default: return "outline";
    }
  };
  
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
          
          <div className="mt-2 flex items-center gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1.5">
                    <Badge variant={getBadgeVariant(source.relevanceCategory)}>
                      {source.relevanceCategory || getRelevanceCategoryFromScore(source.relevanceScore)}
                    </Badge>
                    <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>Relevance score: {source.relevanceScore}%</p>
                  {source.wordCount && <p>Word count: {source.wordCount}</p>}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <div 
              className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden"
              title={`Relevance: ${source.relevanceScore}%`}
            >
              <div 
                className={cn(
                  "h-full rounded-full",
                  getRelevanceColor(source.relevanceScore, source.relevanceCategory)
                )}
                style={{ width: `${source.relevanceScore}%` }}
              />
            </div>
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

// Helper function to get relevance category from score for backward compatibility
function getRelevanceCategoryFromScore(score: number): string {
  if (score >= 90) return "High";
  if (score >= 75) return "Medium";
  if (score >= 60) return "Low";
  return "Very Low";
}
