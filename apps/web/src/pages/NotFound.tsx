import { Link } from "react-router-dom";
import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Home, ArrowLeft, Search, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  // SEO: Evita "Soft 404" no Google — marca a página como não indexável
  useEffect(() => {
    let meta = document.querySelector<HTMLMetaElement>('meta[name="robots"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", "robots");
      document.head.appendChild(meta);
    }
    meta.setAttribute("content", "noindex, nofollow");
    return () => {
      meta?.remove();
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md text-center space-y-6">
        {/* Visual Indicator */}
        <div className="relative mx-auto w-32 h-32">
          <div className="absolute inset-0 rounded-full bg-primary/10 animate-pulse" />
          <div className="absolute inset-4 rounded-full bg-primary/20 flex items-center justify-center">
            <Search className="h-12 w-12 text-primary/60" />
          </div>
        </div>

        {/* Error Code */}
        <h1 className="text-7xl font-bold text-primary/80">404</h1>

        {/* Message */}
        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-foreground">
            Página não encontrada
          </h2>
          <p className="text-muted-foreground text-sm">
            A página que você está procurando não existe ou foi movida para outro endereço.
          </p>
        </div>

        {/* Current Path (for debugging) */}
        <Card className="bg-muted/50 border-dashed">
          <CardContent className="py-3 px-4">
            <p className="text-xs text-muted-foreground font-mono">
              {location.pathname}
            </p>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            variant="default"
            size="lg"
            asChild
            className="gap-2"
          >
            <Link to="/inicio">
              <Home className="h-4 w-4" />
              Ir para Início
            </Link>
          </Button>
          
          <Button
            variant="outline"
            size="lg"
            onClick={() => window.history.back()}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
        </div>

        {/* Help Link */}
        <div className="pt-4">
          <Link 
            to="/minha-conta" 
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            <HelpCircle className="h-4 w-4" />
            Precisa de ajuda?
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
