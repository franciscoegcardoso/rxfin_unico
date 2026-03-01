import { Link } from "react-router-dom";

export function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 gap-4">
      <h1 className="text-2xl font-bold">Página não encontrada</h1>
      <Link to="/" className="text-primary hover:underline">Voltar ao início</Link>
    </div>
  );
}
