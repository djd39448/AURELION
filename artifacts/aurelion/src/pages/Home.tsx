import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { useGetFeaturedActivities, useGetCategories } from "@workspace/api-client-react";
import { motion } from "framer-motion";
import { ArrowRight, Compass, Shield, Sparkles } from "lucide-react";

export default function Home() {
  const { data: featured } = useGetFeaturedActivities();
  const { data: categories } = useGetCategories();

  return (
    <div className="flex flex-col w-full">
      {/* Hero Section */}
      <section className="relative h-[90vh] min-h-[600px] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img 
            src="/hero.png" 
            alt="Aruba Luxury Beach" 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/20 to-background"></div>
        </div>
        
        <div className="relative z-10 max-w-4xl mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <span className="text-primary font-serif tracking-[0.2em] text-sm md:text-base uppercase mb-6 block">
              The Aruba Concierge
            </span>
            <h1 className="font-serif text-5xl md:text-7xl lg:text-8xl text-foreground mb-8 leading-tight">
              Precision-crafted <br/><span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary/60">adventure</span>.
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 font-light leading-relaxed">
              For discerning adventurers. Craft your perfect Aruba itinerary with insider intelligence, exclusive access, and AI-powered concierge curation.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button asChild size="lg" className="rounded-none bg-primary text-primary-foreground hover:bg-primary/90 font-serif tracking-widest h-14 px-8">
                <Link href="/activities">EXPLORE EXPERIENCES</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="rounded-none border-primary/30 text-foreground hover:bg-primary/10 font-serif tracking-widest h-14 px-8">
                <Link href="/pricing">VIEW MEMBERSHIP</Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Featured Activities */}
      <section className="py-24 bg-background border-b border-border/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-end mb-12">
            <div>
              <span className="text-primary font-serif tracking-widest text-sm uppercase mb-2 block">Curated Selection</span>
              <h2 className="font-serif text-4xl text-foreground">Featured Experiences</h2>
            </div>
            <Link href="/activities" className="hidden sm:flex items-center gap-2 text-primary hover:text-primary/80 transition-colors uppercase tracking-widest text-sm font-serif">
              View All <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {featured?.map((activity, index) => (
              <motion.div 
                key={activity.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1, duration: 0.5 }}
              >
                <Link href={`/activities/${activity.id}`} className="group block">
                  <div className="relative aspect-[4/5] overflow-hidden mb-6 bg-card border border-border">
                    {activity.imageUrl ? (
                      <img 
                        src={activity.imageUrl} 
                        alt={activity.title}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                    ) : (
                      <div className="w-full h-full bg-muted flex items-center justify-center">
                        <Compass className="w-12 h-12 text-muted-foreground/30" />
                      </div>
                    )}
                    <div className="absolute top-4 left-4">
                      <span className="bg-background/80 backdrop-blur-md text-foreground text-xs uppercase tracking-widest px-3 py-1 font-serif">
                        {activity.category}
                      </span>
                    </div>
                  </div>
                  <h3 className="font-serif text-xl text-foreground mb-2 group-hover:text-primary transition-colors">{activity.title}</h3>
                  <div className="flex justify-between items-center text-sm text-muted-foreground">
                    <span className="uppercase tracking-wider">{activity.difficulty}</span>
                    <span>{activity.durationMinutes} MIN</span>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-24 bg-card/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="font-serif text-4xl text-foreground mb-4">Discover by Terrain</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">Explore Aruba's diverse landscapes through our categorized adventures.</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-8">
            {categories?.map((cat, index) => (
              <Link key={cat.category} href={`/activities?category=${encodeURIComponent(cat.category)}`} className="group relative aspect-square overflow-hidden block">
                <div className="absolute inset-0 z-10 bg-background/20 group-hover:bg-background/40 transition-colors duration-500" />
                <div className="absolute inset-0 flex flex-col items-center justify-center z-20 p-4 text-center">
                  <h3 className="font-serif text-lg md:text-2xl text-foreground mb-2">{cat.category}</h3>
                  <span className="text-primary text-sm tracking-widest uppercase opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform translate-y-2 group-hover:translate-y-0">
                    {cat.count} Experiences
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Why Aurelion */}
      <section className="py-24 bg-background border-t border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="font-serif text-4xl text-foreground mb-6">Beyond the Guidebook.</h2>
              <p className="text-lg text-muted-foreground mb-8 font-light leading-relaxed">
                We believe that true luxury is knowing exactly where to go, when to go, and how to experience it. AURELION doesn't just list activities; we provide the intelligence needed to craft the ultimate Aruba itinerary.
              </p>
              
              <div className="space-y-8">
                <div className="flex gap-4">
                  <div className="mt-1"><Shield className="w-6 h-6 text-primary" /></div>
                  <div>
                    <h4 className="font-serif text-xl text-foreground mb-2">Vetted Excellence</h4>
                    <p className="text-muted-foreground">Every activity and provider is rigorously vetted for quality, safety, and exclusivity.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="mt-1"><Sparkles className="w-6 h-6 text-primary" /></div>
                  <div>
                    <h4 className="font-serif text-xl text-foreground mb-2">AI Concierge</h4>
                    <p className="text-muted-foreground">Our Premium members get access to our AI planning assistant, trained on deep local knowledge.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="mt-1"><Compass className="w-6 h-6 text-primary" /></div>
                  <div>
                    <h4 className="font-serif text-xl text-foreground mb-2">Insider Intelligence</h4>
                    <p className="text-muted-foreground">Access premium booking guides, the best times to go, and secrets the standard sites miss.</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="relative aspect-[3/4] hidden lg:block">
              <img 
                src="/about-hero.png" 
                alt="Concierge Desk"
                className="w-full h-full object-cover grayscale-[20%]"
              />
              <div className="absolute inset-0 border border-primary/20 m-6 pointer-events-none"></div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
