import { Routes, Route } from "react-router-dom";
import { Index } from "@/pages/Index";
import { LandingPage } from "@/pages/LandingPage";
import { AboutPage } from "@/pages/AboutPage";
import { ManifestoPage } from "@/pages/ManifestoPage";
import { AdminLogin } from "@/pages/AdminLogin";
import { AdminDashboard } from "@/pages/AdminDashboard";
import { NotFound } from "@/pages/NotFound";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/landing" element={<LandingPage />} />
      <Route path="/sobre" element={<AboutPage />} />
      <Route path="/manifesto" element={<ManifestoPage />} />
      <Route path="/admin" element={<AdminLogin />} />
      <Route path="/admin/dashboard" element={<AdminDashboard />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
