import { Header } from "@/components/landing/Header";
import { Footer } from "@/components/landing/Footer";
import { HeroSection } from "@/components/landing/HeroSection";
import { FeaturesSection } from "@/components/landing/FeaturesSection";
import { DifferentialsSection } from "@/components/landing/DifferentialsSection";
import { SimulatorsSection } from "@/components/landing/SimulatorsSection";
import { FinalCtaSection } from "@/components/landing/FinalCtaSection";
import { AuthoritySection } from "@/components/landing/AuthoritySection";
import { TrustBadges } from "@/components/landing/TrustBadges";
import { WhatsAppButton } from "@/components/landing/WhatsAppButton";

const APP_URL = import.meta.env.VITE_APP_URL || "https://app.rxfin.com.br";

export function LandingPage() {
  return (
    <>
      <Header />
      <main className="pt-14">
        <HeroSection />
        <FeaturesSection />
        <DifferentialsSection />
        <SimulatorsSection appUrl={APP_URL} />
        <AuthoritySection />
        <TrustBadges />
        <FinalCtaSection appUrl={APP_URL} />
        <WhatsAppButton />
      </main>
      <Footer />
    </>
  );
}
