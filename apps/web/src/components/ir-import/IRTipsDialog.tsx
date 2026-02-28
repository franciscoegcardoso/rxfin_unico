import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Lightbulb,
  Heart,
  GraduationCap,
  PiggyBank,
  Scale,
  Briefcase,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileText,
  Clock,
  Users,
  Sparkles,
  Info,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface IRTipsDialogProps {
  trigger?: React.ReactNode;
}

export const IRTipsDialog: React.FC<IRTipsDialogProps> = ({ trigger }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" className="gap-2">
            <Lightbulb className="h-4 w-4 text-yellow-500" />
            Dicas para Otimizar seu IR
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Sparkles className="h-5 w-5 text-primary" />
            Como Otimizar sua Declaração de IR
          </DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="max-h-[calc(85vh-100px)] px-6 pb-6">
          <div className="space-y-6 pt-4">
            {/* Intro Section */}
            <div className="bg-primary/5 rounded-lg p-4 border border-primary/20">
              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                <div className="space-y-2 text-sm">
                  <p className="font-medium text-foreground">
                    Modelo Simplificado vs. Modelo Completo
                  </p>
                  <p className="text-muted-foreground">
                    Os comprovantes fiscais só são úteis se você optar pelo <strong>Modelo Completo</strong>. 
                    No simplificado, a Receita aplica um desconto padrão de 20% e ignora suas despesas reais.
                  </p>
                  <p className="text-muted-foreground">
                    No Modelo Completo, você pode abater despesas para <strong>reduzir a base de cálculo</strong> do imposto ou <strong>aumentar sua restituição</strong>.
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Categories Accordion */}
            <Accordion type="multiple" className="w-full space-y-2">
              {/* Saúde */}
              <AccordionItem value="saude" className="border rounded-lg px-4">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-red-500/10">
                      <Heart className="h-4 w-4 text-red-500" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium">Despesas Médicas</p>
                      <p className="text-xs text-muted-foreground">Sem limite de dedução</p>
                    </div>
                    <Badge variant="secondary" className="ml-2 bg-green-500/10 text-green-600">
                      Mais valiosa
                    </Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pt-2 pb-4">
                  <div className="space-y-4 text-sm">
                    <p className="text-muted-foreground">
                      Esta é a categoria mais valiosa, pois <strong>não há teto para dedução</strong>. 
                      Tudo o que você gastar pode ser abatido, desde que devidamente comprovado.
                    </p>
                    
                    <div className="space-y-2">
                      <p className="font-medium flex items-center gap-2 text-green-600">
                        <CheckCircle2 className="h-4 w-4" /> O que você pode deduzir:
                      </p>
                      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-muted-foreground">
                        <li>• Consultas médicas (qualquer especialidade)</li>
                        <li>• Dentistas e ortodontistas</li>
                        <li>• Psicólogos e psiquiatras</li>
                        <li>• Fisioterapeutas</li>
                        <li>• Exames laboratoriais e radiológicos</li>
                        <li>• Internações hospitalares (incluindo UTI)</li>
                        <li>• Mensalidades de plano de saúde</li>
                        <li>• Próteses e aparelhos ortopédicos</li>
                        <li>• Aparelhos dentários</li>
                        <li>• Cirurgias reparadoras</li>
                      </ul>
                    </div>

                    <div className="bg-orange-500/10 rounded-lg p-3">
                      <p className="font-medium flex items-center gap-2 text-orange-600 text-sm">
                        <AlertTriangle className="h-4 w-4" /> Atenção
                      </p>
                      <p className="text-muted-foreground mt-1">
                        Medicamentos comprados em farmácia <strong>não são dedutíveis</strong>, 
                        a menos que estejam incluídos na conta hospitalar de uma internação.
                      </p>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Educação */}
              <AccordionItem value="educacao" className="border rounded-lg px-4">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-500/10">
                      <GraduationCap className="h-4 w-4 text-blue-500" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium">Despesas com Educação</p>
                      <p className="text-xs text-muted-foreground">Limite ~R$ 3.561,50/pessoa/ano</p>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pt-2 pb-4">
                  <div className="space-y-4 text-sm">
                    <p className="text-muted-foreground">
                      Existe um limite anual por pessoa (titular e dependentes), geralmente em torno de 
                      <strong> R$ 3.561,50</strong> (sujeito a atualização).
                    </p>
                    
                    <div className="space-y-2">
                      <p className="font-medium flex items-center gap-2 text-green-600">
                        <CheckCircle2 className="h-4 w-4" /> O que você pode deduzir:
                      </p>
                      <ul className="space-y-1 text-muted-foreground">
                        <li>• Educação Infantil (creches e pré-escolas)</li>
                        <li>• Ensino Fundamental e Médio</li>
                        <li>• Ensino Superior (graduação, pós, mestrado, doutorado)</li>
                        <li>• Especialização e MBA</li>
                        <li>• Ensino Técnico e Tecnológico</li>
                      </ul>
                    </div>

                    <div className="space-y-2">
                      <p className="font-medium flex items-center gap-2 text-red-500">
                        <XCircle className="h-4 w-4" /> O que NÃO entra:
                      </p>
                      <ul className="space-y-1 text-muted-foreground">
                        <li>• Cursos de idiomas</li>
                        <li>• Cursos livres (culinária, preparatórios)</li>
                        <li>• Material escolar e uniforme</li>
                        <li>• Transporte escolar</li>
                        <li>• Cursinho pré-vestibular</li>
                      </ul>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Previdência */}
              <AccordionItem value="previdencia" className="border rounded-lg px-4">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-green-500/10">
                      <PiggyBank className="h-4 w-4 text-green-500" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium">Previdência Privada (PGBL)</p>
                      <p className="text-xs text-muted-foreground">Até 12% da renda bruta</p>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pt-2 pb-4">
                  <div className="space-y-4 text-sm">
                    <p className="text-muted-foreground">
                      Se você contribui para um plano <strong>PGBL</strong> (Plano Gerador de Benefício Livre), 
                      pode deduzir até <strong>12% da sua renda bruta tributável anual</strong>.
                    </p>
                    
                    <div className="bg-orange-500/10 rounded-lg p-3">
                      <p className="font-medium flex items-center gap-2 text-orange-600 text-sm">
                        <AlertTriangle className="h-4 w-4" /> Importante
                      </p>
                      <p className="text-muted-foreground mt-1">
                        Planos <strong>VGBL</strong> (Vida Gerador de Benefício Livre) <strong>não são dedutíveis</strong>.
                      </p>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Pensão */}
              <AccordionItem value="pensao" className="border rounded-lg px-4">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-purple-500/10">
                      <Scale className="h-4 w-4 text-purple-500" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium">Pensão Alimentícia</p>
                      <p className="text-xs text-muted-foreground">Integralmente dedutível</p>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pt-2 pb-4">
                  <div className="space-y-4 text-sm">
                    <p className="text-muted-foreground">
                      Se for determinada por <strong>decisão judicial</strong> ou <strong>escritura pública</strong> (em cartório), 
                      o valor pago é <strong>integralmente dedutível</strong>.
                    </p>
                    
                    <div className="bg-red-500/10 rounded-lg p-3">
                      <p className="font-medium flex items-center gap-2 text-red-500 text-sm">
                        <XCircle className="h-4 w-4" /> Não aceito
                      </p>
                      <p className="text-muted-foreground mt-1">
                        Pagamentos feitos por "acordo de boca" (sem documento legal) <strong>não podem ser deduzidos</strong>.
                      </p>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Livro Caixa */}
              <AccordionItem value="livroCaixa" className="border rounded-lg px-4">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-amber-500/10">
                      <Briefcase className="h-4 w-4 text-amber-500" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium">Despesas Profissionais (Autônomos)</p>
                      <p className="text-xs text-muted-foreground">Livro Caixa</p>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pt-2 pb-4">
                  <div className="space-y-4 text-sm">
                    <p className="text-muted-foreground">
                      Se você é autônomo (recebe de pessoas físicas sem vínculo empregatício), 
                      pode deduzir despesas essenciais para exercer sua profissão:
                    </p>
                    
                    <ul className="space-y-1 text-muted-foreground">
                      <li>• Aluguel, condomínio e IPTU do consultório/escritório</li>
                      <li>• Contas de energia, água, telefone e internet do trabalho</li>
                      <li>• Anuidade de conselhos de classe (CRM, OAB, CRC, CREA)</li>
                      <li>• Despesas com empregados (remuneração, INSS, FGTS)</li>
                      <li>• Materiais de consumo e escritório</li>
                    </ul>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            <Separator />

            {/* O que NÃO adianta */}
            <div className="space-y-3">
              <h3 className="font-semibold flex items-center gap-2 text-red-500">
                <XCircle className="h-5 w-5" />
                O que NÃO adianta guardar
              </h3>
              <p className="text-sm text-muted-foreground">
                Muitas pessoas guardam estes recibos achando que abatem imposto, mas a Receita não aceita:
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[
                  'Medicamentos de farmácia',
                  'Veterinário',
                  'Academia',
                  'Óculos e lentes',
                  'Aluguel de moradia',
                  'Nutricionista (geralmente)',
                ].map((item) => (
                  <div key={item} className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded px-3 py-2">
                    <XCircle className="h-3.5 w-3.5 text-red-400 shrink-0" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* Dicas de Ouro */}
            <div className="space-y-4">
              <h3 className="font-semibold flex items-center gap-2 text-yellow-600">
                <Sparkles className="h-5 w-5" />
                Dicas de Ouro
              </h3>
              
              <div className="grid gap-3">
                <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                  <div className="p-1.5 rounded bg-primary/10 mt-0.5">
                    <FileText className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">CPF/CNPJ do Prestador</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      O recibo precisa ter CPF ou CNPJ do prestador, nome completo, endereço, valor e descrição do serviço. 
                      <strong> Sem isso, a Receita barra.</strong>
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                  <div className="p-1.5 rounded bg-primary/10 mt-0.5">
                    <Clock className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Guarde por 5 Anos</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Mantenha os comprovantes físicos ou digitais por <strong>5 anos</strong> a partir da data da entrega da declaração.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                  <div className="p-1.5 rounded bg-primary/10 mt-0.5">
                    <Users className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Dependentes</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Se declarar dependentes, pode usar os recibos deles (escola, médico), mas lembre-se de 
                      <strong> somar também a renda deles</strong> (se houver).
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
