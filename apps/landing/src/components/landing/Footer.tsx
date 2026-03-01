import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Instagram, Mail } from "lucide-react";

const APP_URL = import.meta.env.VITE_APP_URL || "https://app.rxfin.com.br";

function openInstagram() {
  if (typeof window === "undefined") return;
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  if (isMobile) {
    window.location.href = "instagram://user?username=rxfin.app";
    setTimeout(() => {
      window.open("https://www.instagram.com/rxfin.app/", "_blank", "noopener,noreferrer");
    }, 500);
  } else {
    window.open("https://www.instagram.com/rxfin.app/", "_blank", "noopener,noreferrer");
  }
}

export function Footer() {
  return (
    <footer className="py-10 px-4 sm:px-6 lg:px-8 bg-[hsl(145,30%,15%)] dark:bg-[hsl(145,25%,5%)] text-white">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex flex-col items-center sm:items-start gap-1">
            <img src="/Logo_RXFin-10.png" alt="RXFin" width={120} height={32} className="h-8 w-auto object-contain" />
            <p className="text-xs text-white/60">Seu Raio-X Financeiro Completo</p>
          </div>

          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={openInstagram}
              className="flex items-center gap-1.5 text-xs text-white/60 hover:text-white transition-colors"
            >
              <Instagram className="h-4 w-4" />
              @rxfin.app
            </button>
            <a href="mailto:contato@rxfin.com.br" className="flex items-center gap-1.5 text-xs text-white/60 hover:text-white transition-colors">
              <Mail className="h-4 w-4" />
              contato@rxfin.com.br
            </a>
          </div>

          <div className="flex items-center gap-2">
            <a href={`${APP_URL}/simulador-fipe`} target="_blank" rel="noopener noreferrer">
              <Button size="sm" className="bg-white text-[hsl(145,30%,15%)] hover:bg-white/90 dark:bg-primary dark:text-primary-foreground dark:hover:bg-primary/90">
                Testar Simulador
              </Button>
            </a>
            <a href={`${APP_URL}/signup`} target="_blank" rel="noopener noreferrer">
              <Button size="sm" className="bg-white text-[hsl(145,30%,15%)] hover:bg-white/90 dark:bg-primary dark:text-primary-foreground dark:hover:bg-primary/90">
                Criar Conta Grátis
              </Button>
            </a>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-[11px] text-white/50">© {new Date().getFullYear()} RXFin. Todos os direitos reservados.</p>
          <div className="flex items-center gap-4 text-[11px] text-white/50">
            <Link to="/termos-de-uso" className="hover:text-white transition-colors">
              Termos de Uso
            </Link>
            <span className="text-white/20">|</span>
            <Link to="/politica-privacidade" className="hover:text-white transition-colors">
              Política de Privacidade
            </Link>
            <span className="text-white/20">|</span>
            <Link to="/politica-cookies" className="hover:text-white transition-colors">
              Política de Cookies
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
