import React from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/shared/PageHeader';
import { PageContainer } from '@/components/shared/PageContainer';
import { MobileHubList, HubItem } from '@/components/shared/MobileHubList';
import { Settings, UserCog, SlidersHorizontal, Landmark, Crown, Receipt, Tag, Wallet } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useIsMobile } from '@/hooks/use-mobile';

const configItems: HubItem[] = [
  {
    id: 'minha-conta',
    icon: UserCog,
    title: 'Minha Conta',
    description: 'Perfil, segurança e assinatura',
    path: '/minha-conta',
    color: 'bg-blue-500/10 text-blue-500',
  },
  {
    id: 'parametros',
    icon: SlidersHorizontal,
    title: 'Parâmetros',
    description: 'Configure receitas, despesas e categorias',
    path: '/parametros',
    color: 'bg-green-500/10 text-green-500',
  },
  {
    id: 'config-fiscais',
    icon: Receipt,
    title: 'Configurações Fiscais',
    description: 'Dependentes e deduções do IRPF',
    path: '/configuracoes-fiscais',
    color: 'bg-orange-500/10 text-orange-500',
  },
  {
    id: 'instituicoes',
    icon: Landmark,
    title: 'Instituições Financeiras',
    description: 'Cadastre bancos, corretoras e cartões',
    path: '/instituicoes-financeiras',
    color: 'bg-purple-500/10 text-purple-500',
  },
  {
    id: 'financeiro',
    icon: Wallet,
    title: 'Financeiro',
    description: 'Planos, pagamentos e indicações',
    path: '/financeiro/planos',
    color: 'bg-emerald-500/10 text-emerald-500',
  },
];

export const ConfiguracoesHub: React.FC = () => {
  const isMobile = useIsMobile();

  return (
    
      <PageContainer>
        <PageHeader
          title="Configurações"
          description="Personalize sua experiência no app"
          icon={<Settings className="h-5 w-5 text-primary-foreground" />}
        />

        {isMobile ? (
          <MobileHubList items={configItems} />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {configItems.map((item) => (
              <Link key={item.id} to={item.path!}>
                <Card className="h-full hover:shadow-md transition-all hover:border-primary/50 cursor-pointer group">
                  <CardContent className="p-5">
                    <div className="flex items-start gap-4">
                      <div className={`h-12 w-12 rounded-xl ${item.color} flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform`}>
                        <item.icon className="h-6 w-6" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                          {item.title}
                        </h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          {item.description}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </PageContainer>
    
  );
};

export default ConfiguracoesHub;
