import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { HelpCircle } from 'lucide-react';

const faqItems = [
  {
    question: 'Como funciona a cobrança?',
    answer: 'No primeiro ano você paga um valor único (parcelável em até 12x no cartão). Após 12 meses, a cobrança passa a ser uma recorrência mensal automática no valor do plano.'
  },
  {
    question: 'Existe período de teste?',
    answer: 'Sim! Você tem 7 dias para testar o plano. Se não gostar, cancele antes do período de teste acabar e não será cobrado.'
  },
  {
    question: 'Posso trocar de plano?',
    answer: 'Sim! Você pode fazer upgrade ou downgrade a qualquer momento. O valor é calculado proporcionalmente (pro rata) ao tempo restante do ciclo.'
  },
  {
    question: 'Como funciona o cancelamento?',
    answer: 'Você pode solicitar o cancelamento a qualquer momento. O acesso continua até o final do ciclo pago, sem renovação automática.'
  },
  {
    question: 'Quais formas de pagamento são aceitas?',
    answer: 'Aceitamos cartão de crédito e PIX. O parcelamento está disponível apenas no cartão de crédito.'
  },
];

export const PlanosFAQ: React.FC = () => {
  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur">
      <CardHeader className="pb-2">
        <CardTitle className="text-xl flex items-center gap-2">
          <HelpCircle className="h-5 w-5 text-primary" />
          Dúvidas Frequentes
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Accordion type="single" collapsible className="w-full">
          {faqItems.map((item, index) => (
            <AccordionItem key={index} value={`item-${index}`} className="border-border/50">
              <AccordionTrigger className="text-left text-foreground hover:text-primary hover:no-underline">
                {item.question}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                {item.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </CardContent>
    </Card>
  );
};
