import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Send, Bot, User, Loader2, Trash2 } from 'lucide-react';
import cibeliaAvatar from '@/assets/cibelia.png';
import { cn } from '@/lib/utils';
import { ChatMessage } from '@/hooks/useFiscalOrganizer';

interface FiscalOrganizerChatProps {
  messages: ChatMessage[];
  isLoading: boolean;
  onSendMessage: (content: string) => void;
  onClearChat: () => void;
}

export const FiscalOrganizerChat: React.FC<FiscalOrganizerChatProps> = ({
  messages,
  isLoading,
  onSendMessage,
  onClearChat,
}) => {
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    onSendMessage(input);
    setInput('');
  };

  const welcomeMessage = messages.length === 0;

  return (
    <Card className="flex flex-col h-[500px]">
      <CardHeader className="flex flex-row items-center justify-between py-3 px-4 border-b">
        <div className="flex items-center gap-2">
          <Avatar className="h-8 w-8 rounded-lg border border-border">
            <AvatarImage src={cibeliaAvatar} alt="Cibélia" className="object-cover" />
            <AvatarFallback className="rounded-lg bg-primary/10">
              <Bot className="h-4 w-4 text-primary" />
            </AvatarFallback>
          </Avatar>
          <CardTitle className="text-base">Cibélia</CardTitle>
        </div>
        {messages.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-muted-foreground hover:text-destructive"
            onClick={onClearChat}
          >
            <Trash2 className="h-3.5 w-3.5 mr-1" />
            Limpar
          </Button>
        )}
      </CardHeader>
      
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-4">
          {welcomeMessage && (
            <div className="flex gap-3">
              <Avatar className="h-8 w-8 rounded-lg border border-border shrink-0">
                <AvatarImage src={cibeliaAvatar} alt="Cibélia" className="object-cover" />
                <AvatarFallback className="rounded-lg bg-primary/10">
                  <Bot className="h-4 w-4 text-primary" />
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-2 min-w-0">
                <div className="bg-muted rounded-lg p-3 text-sm">
                  <p className="font-medium mb-2">Olá, eu sou a Cibélia e estou aqui para te ajudar na organização fiscal.</p>
                  <p className="text-muted-foreground">
                    Posso te ajudar a organizar seus comprovantes fiscais para o Imposto de Renda. Me envie informações sobre recibos médicos, escolares ou de previdência e eu vou:
                  </p>
                  <ul className="list-disc list-inside text-muted-foreground mt-2 space-y-1">
                    <li>Verificar se são válidos para dedução</li>
                    <li>Alertar sobre dados faltantes</li>
                    <li>Arquivar com segurança no seu cofre fiscal</li>
                  </ul>
                  <p className="mt-3 text-muted-foreground">
                    O que vamos arquivar hoje?
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "flex gap-3",
                message.role === 'user' && "flex-row-reverse"
              )}
            >
              <Avatar className={cn(
                "h-8 w-8",
                message.role === 'user' ? "bg-primary" : "bg-primary/10"
              )}>
                <AvatarFallback className={cn(
                  message.role === 'user' ? "bg-primary text-primary-foreground" : "bg-primary/10"
                )}>
                  {message.role === 'user' ? (
                    <User className="h-4 w-4" />
                  ) : (
                    <Bot className="h-4 w-4 text-primary" />
                  )}
                </AvatarFallback>
              </Avatar>
              <div className={cn(
                "flex-1 max-w-[80%]",
                message.role === 'user' && "flex justify-end"
              )}>
                <div className={cn(
                  "rounded-lg p-3 text-sm",
                  message.role === 'user'
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted prose prose-sm dark:prose-invert max-w-none"
                )}>
                  {message.role === 'assistant' ? (
                    message.content ? (
                      <ReactMarkdown>{message.content}</ReactMarkdown>
                    ) : (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Pensando...
                      </div>
                    )
                  ) : (
                    message.content
                  )}
                </div>
              </div>
            </div>
          ))}
          
          {isLoading && messages[messages.length - 1]?.role === 'user' && (
            <div className="flex gap-3">
              <Avatar className="h-8 w-8 rounded-lg border border-border shrink-0">
                <AvatarImage src={cibeliaAvatar} alt="Cibélia" className="object-cover" />
                <AvatarFallback className="rounded-lg bg-primary/10">
                  <Bot className="h-4 w-4 text-primary" />
                </AvatarFallback>
              </Avatar>
              <div className="bg-muted rounded-lg p-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Analisando...
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
      
      <CardContent className="p-3 border-t">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Descreva seu comprovante ou tire uma dúvida..."
            disabled={isLoading}
            className="flex-1"
          />
          <Button type="submit" size="icon" disabled={isLoading || !input.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
