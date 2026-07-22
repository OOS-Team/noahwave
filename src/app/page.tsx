import { Playfield } from "@/components/Playfield";
import { Navigation } from "@/components/Navigation";
import { Hero } from "@/components/Hero";
import { Gallery } from "@/components/Gallery";
import { VisionLab } from "@/components/VisionLab";
import { About } from "@/components/About";
import { Contact } from "@/components/Contact";
import { Footer } from "@/components/Footer";

export default function Home() {
  return (
    <Playfield>
      <Navigation />
      <main>
        <Hero />
        <Gallery />
        <VisionLab />
        <About />
        <Contact />
      </main>
      <Footer />
    </Playfield>
  );
}
