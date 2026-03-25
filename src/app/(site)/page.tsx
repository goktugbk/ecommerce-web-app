import Hero from "@/components/home/Hero";
import CategoryTiles from "@/components/home/CategoryTiles";
import FeaturedCarousel from "@/components/home/FeaturedCarousel";
import Newsletter from "@/components/home/Newsletter";
import Container from "@/components/layout/Container";

export default async function SiteHomePage() {
  return (
    <>
      {/* Hero tam-bleed, padding yok */}
      <Hero />

      {/* İçerikler → kendi container içinde paddingli */}
      <Container className="space-y-10 py-10 md:py-16">
        <CategoryTiles />
        <FeaturedCarousel />
        <Newsletter />
      </Container>
    </>
  );
}
