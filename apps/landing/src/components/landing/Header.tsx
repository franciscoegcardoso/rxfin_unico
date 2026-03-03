import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Play } from "lucide-react";

const APP_URL = import.meta.env.VITE_APP_URL || "https://app.rxfin.com.br";

export function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[hsl(145,30%,15%)] dark:bg-[hsl(145,25%,8%)] backdrop-blur-md border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          <Link to="/landing">
            <img src="/Logo_RXFin-10.png" alt="RXFin" width={120} height={32} className="h-8 w-auto object-contain" />
          </Link>
          <div className="flex items-center gap-2">
            <a href={`${APP_URL}/simuladores/veiculos/simulador-fipe`} target="_blank" rel="noopener noreferrer">
              <Button variant="ghost" size="sm" className="hidden sm:flex text-white/80 hover:text-white hover:bg-white/10">
                <Play className="h-3 w-3 mr-1" />
                Testar Grátis
              </Button>
            </a>
            <a href={`${APP_URL}/login`} target="_blank" rel="noopener noreferrer">
              <Button size="sm" className="bg-white text-[hsl(145,30%,15%)] hover:bg-white/90 dark:bg-primary dark:text-primary-foreground dark:hover:bg-primary/90">
                Acessar
              </Button>
            </a>
          </div>
        </div>
      </div>
    </header>
  );
}
