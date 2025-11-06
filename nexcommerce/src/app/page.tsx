import { FeaturedProducts } from '@/components/home/FeaturedProducts';
import { HeroSection } from '@/components/home/HeroSection';
import { CategoryShowcase } from '@/components/home/CategoryShowcase';
import { Newsletter } from '@/components/home/Newsletter';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <HeroSection />
        <FeaturedProducts />
        <CategoryShowcase />
        <Newsletter />
      </main>
      <Footer />
    </div>
  );
}
