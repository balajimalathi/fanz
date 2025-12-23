import { FloatingNav } from "@/components/nav/floating-nav";
import Footer from "@/components/nav/footer";

interface MarketingLayoutProps {
  children: React.ReactNode;
}

export default function MarketingLayout({ children }: MarketingLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col">

      <FloatingNav />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
