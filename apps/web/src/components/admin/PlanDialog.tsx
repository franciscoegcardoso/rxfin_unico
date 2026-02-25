import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { SubscriptionPlan, useSubscriptionPlanMutations } from '@/hooks/useSubscriptionPlans';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Check, X, Tag, Percent } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { PlanImageUpload } from './PlanImageUpload';

interface Page {
  id: string;
  title: string;
  slug: string;
  path: string;
}

interface PlanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: SubscriptionPlan | null;
  pages: Page[];
}

const formSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  slug: z.string().min(1, 'Slug é obrigatório').regex(/^[a-z0-9_-]+$/, 'Apenas letras minúsculas, números, - e _'),
  description: z.string().optional(),
  price_monthly: z.number().min(0),
  price_yearly: z.number().min(0),
  original_price_monthly: z.number().min(0).nullable().optional(),
  original_price_yearly: z.number().min(0).nullable().optional(),
  discount_reason: z.string().optional(),
  has_promo: z.boolean(),
  is_active: z.boolean(),
  is_public: z.boolean(),
  highlight_label: z.string().optional(),
  checkout_url: z.string().optional(),
  checkout_url_yearly: z.string().optional(),
  guru_product_id: z.string().optional(),
  image_url: z.string().nullable().optional(),
  allowed_pages: z.array(z.string()),
  features: z.array(z.string()),
});

type FormData = z.infer<typeof formSchema>;

export function PlanDialog({ open, onOpenChange, plan, pages }: PlanDialogProps) {
  const { updatePlan, createPlan } = useSubscriptionPlanMutations();
  const [allPagesSelected, setAllPagesSelected] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      slug: '',
      description: '',
      price_monthly: 0,
      price_yearly: 0,
      original_price_monthly: null,
      original_price_yearly: null,
      discount_reason: '',
      has_promo: false,
      is_active: true,
      is_public: true,
      highlight_label: '',
      checkout_url: '',
      checkout_url_yearly: '',
      guru_product_id: '',
      image_url: null,
      allowed_pages: [],
      features: [],
    },
  });

  useEffect(() => {
    if (plan) {
      const hasAllPages = plan.allowed_pages.includes('*');
      setAllPagesSelected(hasAllPages);
      setImageUrl(plan.image_url);
      
      form.reset({
        name: plan.name,
        slug: plan.slug,
        description: plan.description || '',
        price_monthly: plan.price_monthly,
        price_yearly: plan.price_yearly,
        original_price_monthly: plan.original_price_monthly,
        original_price_yearly: plan.original_price_yearly,
        discount_reason: plan.discount_reason || '',
        has_promo: plan.has_promo,
        is_active: plan.is_active,
        is_public: plan.is_public,
        highlight_label: plan.highlight_label || '',
        checkout_url: plan.checkout_url || '',
        checkout_url_yearly: plan.checkout_url_yearly || '',
        guru_product_id: plan.guru_product_id || '',
        image_url: plan.image_url,
        allowed_pages: hasAllPages ? pages.map(p => p.slug) : plan.allowed_pages,
        features: plan.features || [],
      });
    } else {
      setAllPagesSelected(false);
      setImageUrl(null);
      form.reset({
        name: '',
        slug: '',
        description: '',
        price_monthly: 0,
        price_yearly: 0,
        original_price_monthly: null,
        original_price_yearly: null,
        discount_reason: '',
        has_promo: false,
        is_active: true,
        is_public: true,
        highlight_label: '',
        checkout_url: '',
        checkout_url_yearly: '',
        guru_product_id: '',
        image_url: null,
        allowed_pages: [],
        features: [],
      });
    }
  }, [plan, pages, form]);

  const onSubmit = (data: FormData) => {
    const payload = {
      ...data,
      image_url: imageUrl,
      allowed_pages: allPagesSelected ? ['*'] : data.allowed_pages,
      order_index: plan?.order_index ?? pages.length,
    };

    if (plan) {
      updatePlan.mutate({ id: plan.id, ...payload });
    } else {
      createPlan.mutate(payload as any);
    }
    
    onOpenChange(false);
  };

  const handleToggleAllPages = (checked: boolean) => {
    setAllPagesSelected(checked);
    if (checked) {
      form.setValue('allowed_pages', pages.map(p => p.slug));
    } else {
      form.setValue('allowed_pages', []);
    }
  };

  const selectedPages = form.watch('allowed_pages');
  const hasPromo = form.watch('has_promo');
  const priceYearly = form.watch('price_yearly');
  const priceMonthly = form.watch('price_monthly');

  const yearlyMonthlyEquiv = priceYearly > 0 ? (priceYearly / 12) : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>
            {plan ? 'Editar Plano' : 'Novo Plano'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Tabs defaultValue="general" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="general">Geral</TabsTrigger>
                <TabsTrigger value="pricing">Preços</TabsTrigger>
                <TabsTrigger value="pages">
                  Páginas
                  <Badge variant="secondary" className="ml-2 text-xs">
                    {allPagesSelected ? 'Todas' : selectedPages.length}
                  </Badge>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="general" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome do Plano</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: RX Pro" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="slug"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Slug (código)</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="ex: pro" 
                            {...field} 
                          />
                        </FormControl>
                        <FormDescription className={plan ? 'text-amber-600' : ''}>
                          {plan 
                            ? '⚠️ Alterar o slug pode quebrar integrações e usuários existentes' 
                            : 'Identificador único usado em integrações'}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descrição</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Descrição do plano..." 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="highlight_label"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Label de Destaque</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: Mais popular" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="guru_product_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Product ID(s) do Guru</FormLabel>
                        <FormControl>
                          <Input placeholder="prod_abc123, offer_xyz789" {...field} />
                        </FormControl>
                        <FormDescription>
                          IDs do produto/oferta no Guru. Separe múltiplos por vírgula.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <Separator />

                {/* Plan Image Upload */}
                <PlanImageUpload
                  currentImageUrl={imageUrl}
                  planSlug={form.watch('slug') || 'new-plan'}
                  onImageChange={(url) => setImageUrl(url)}
                />

                <Separator />

                <div className="flex gap-6">
                  <FormField
                    control={form.control}
                    name="is_active"
                    render={({ field }) => (
                      <FormItem className="flex items-center gap-2">
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormLabel className="!mt-0">Ativo</FormLabel>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="is_public"
                    render={({ field }) => (
                      <FormItem className="flex items-center gap-2">
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormLabel className="!mt-0">Público</FormLabel>
                        <FormDescription className="!mt-0 text-xs">
                          (visível na página de planos)
                        </FormDescription>
                      </FormItem>
                    )}
                  />
                </div>
              </TabsContent>

              <TabsContent value="pricing" className="space-y-4 mt-4">
                {/* Promotional pricing toggle */}
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border">
                  <div className="flex items-center gap-2">
                    <Tag className="h-4 w-4 text-primary" />
                    <div>
                      <p className="text-sm font-medium">Promoção DE/POR</p>
                      <p className="text-xs text-muted-foreground">
                        Exibir preço original riscado e destaque no desconto
                      </p>
                    </div>
                  </div>
                  <FormField
                    control={form.control}
                    name="has_promo"
                    render={({ field }) => (
                      <FormItem className="flex items-center gap-2">
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                {hasPromo && (
                  <FormField
                    control={form.control}
                    name="discount_reason"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Percent className="h-3.5 w-3.5" />
                          Motivo do Desconto
                        </FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Ex: Oferta de Lançamento, Black Friday, etc." 
                            {...field} 
                          />
                        </FormControl>
                        <FormDescription>
                          Este texto será exibido como badge junto ao preço promocional
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <Separator />

                {/* ===== PLANO MENSAL ===== */}
                <div className="space-y-3 p-4 border rounded-lg">
                  <p className="text-sm font-semibold text-foreground">Plano Mensal</p>
                  
                  <FormField
                    control={form.control}
                    name="price_monthly"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{hasPromo ? 'Preço Promocional (R$)' : 'Preço Mensal (R$)'}</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            step="0.01"
                            min="0"
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {hasPromo && (
                    <FormField
                      control={form.control}
                      name="original_price_monthly"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Preço Original Mensal (R$)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              step="0.01"
                              min="0"
                              value={field.value ?? ''}
                              onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : null)}
                            />
                          </FormControl>
                          <FormDescription className="text-xs">Valor riscado (DE)</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  <FormField
                    control={form.control}
                    name="checkout_url"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>URL de Checkout Mensal</FormLabel>
                        <FormControl>
                          <Input placeholder="https://pay.guru.com/..." {...field} />
                        </FormControl>
                        <FormDescription className="text-xs">
                          URL do checkout para assinatura mensal
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* ===== PLANO ANUAL ===== */}
                <div className="space-y-3 p-4 border rounded-lg">
                  <p className="text-sm font-semibold text-foreground">Plano Anual</p>
                  
                  <FormField
                    control={form.control}
                    name="price_yearly"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{hasPromo ? 'Preço Anual Promocional (R$)' : 'Preço Anual Total (R$)'}</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            step="0.01"
                            min="0"
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {yearlyMonthlyEquiv > 0 && (
                    <div className="text-xs text-muted-foreground bg-muted/50 rounded p-2">
                      Equivalente mensal: <span className="font-semibold text-foreground">R$ {yearlyMonthlyEquiv.toFixed(2).replace('.', ',')}/mês</span>
                    </div>
                  )}

                  {hasPromo && (
                    <FormField
                      control={form.control}
                      name="original_price_yearly"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Preço Anual Original (R$)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              step="0.01"
                              min="0"
                              value={field.value ?? ''}
                              onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : null)}
                            />
                          </FormControl>
                          <FormDescription className="text-xs">Valor riscado (DE)</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  <FormField
                    control={form.control}
                    name="checkout_url_yearly"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>URL de Checkout Anual</FormLabel>
                        <FormControl>
                          <Input placeholder="https://pay.guru.com/..." {...field} />
                        </FormControl>
                        <FormDescription className="text-xs">
                          URL do checkout para assinatura anual
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Preview */}
                <div className="p-4 bg-background rounded-lg border space-y-3">
                  <p className="text-xs font-medium text-muted-foreground">Prévia:</p>
                  
                  {hasPromo && form.watch('discount_reason') && (
                    <Badge variant="destructive" className="text-xs">
                      {form.watch('discount_reason')}
                    </Badge>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    {/* Monthly preview */}
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">Mensal</p>
                      {hasPromo && form.watch('original_price_monthly') && (
                        <span className="text-sm text-muted-foreground line-through">
                          R$ {form.watch('original_price_monthly')?.toFixed(2).replace('.', ',')}
                        </span>
                      )}
                      <p className="text-lg font-bold text-primary">
                        R$ {priceMonthly.toFixed(2).replace('.', ',')}<span className="text-xs font-normal text-muted-foreground">/mês</span>
                      </p>
                    </div>

                    {/* Yearly preview */}
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">Anual</p>
                      {hasPromo && form.watch('original_price_yearly') && (
                        <span className="text-sm text-muted-foreground line-through">
                          R$ {(form.watch('original_price_yearly')! / 12).toFixed(2).replace('.', ',')}/mês
                        </span>
                      )}
                      <p className="text-lg font-bold text-primary">
                        R$ {yearlyMonthlyEquiv.toFixed(2).replace('.', ',')}<span className="text-xs font-normal text-muted-foreground">/mês</span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        12x · Total R$ {priceYearly.toFixed(2).replace('.', ',')}
                      </p>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="pages" className="space-y-4 mt-4">
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div>
                    <p className="font-medium text-sm">Acesso Total</p>
                    <p className="text-xs text-muted-foreground">
                      Liberar acesso a todas as páginas (incluindo futuras)
                    </p>
                  </div>
                  <Switch
                    checked={allPagesSelected}
                    onCheckedChange={handleToggleAllPages}
                  />
                </div>

                <ScrollArea className="h-[300px] border rounded-lg p-3">
                  <div className="space-y-2">
                    {pages.map((page) => (
                      <FormField
                        key={page.id}
                        control={form.control}
                        name="allowed_pages"
                        render={({ field }) => (
                          <FormItem className="flex items-center gap-3 p-2 rounded hover:bg-muted/50">
                            <FormControl>
                              <Checkbox
                                checked={field.value.includes(page.slug) || allPagesSelected}
                                disabled={allPagesSelected}
                                onCheckedChange={(checked) => {
                                  const current = field.value;
                                  if (checked) {
                                    field.onChange([...current, page.slug]);
                                  } else {
                                    field.onChange(current.filter((s) => s !== page.slug));
                                  }
                                }}
                              />
                            </FormControl>
                            <div className="flex-1">
                              <p className="text-sm font-medium">{page.title}</p>
                              <p className="text-xs text-muted-foreground">{page.path}</p>
                            </div>
                            <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                              {page.slug}
                            </code>
                          </FormItem>
                        )}
                      />
                    ))}
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button type="submit">
                {plan ? 'Salvar Alterações' : 'Criar Plano'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
