import { useParams } from "wouter";
import { useGetActivity, useGetMe, useListPurchases } from "@workspace/api-client-react";
import { PremiumLock } from "@/components/ui/premium-lock";
import { Button } from "@/components/ui/button";
import { MapPin, Clock, DollarSign, Activity as ActivityIcon, Info, Shield, Check } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function ActivityDetail() {
  const params = useParams();
  const id = parseInt(params.id || "0", 10);
  
  const { data: activity, isLoading } = useGetActivity(id, {
    query: { enabled: !!id, queryKey: [`/api/activities/${id}`] }
  });
  
  const { data: user } = useGetMe();
  const { data: purchases } = useListPurchases({
    query: { enabled: !!user?.isAuthenticated }
  });

  const isPremium = purchases?.some(p => p.productType === 'PREMIUM');
  const isBasicOrPremium = isPremium || purchases?.some(p => p.productType === 'BASIC');

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12">
        <Skeleton className="h-12 w-2/3 mb-4 bg-muted" />
        <Skeleton className="h-[60vh] w-full mb-12 bg-muted" />
      </div>
    );
  }

  if (!activity) {
    return <div className="p-24 text-center">Activity not found</div>;
  }

  return (
    <div className="w-full">
      {/* Hero */}
      <div className="relative h-[60vh] min-h-[500px]">
        <img 
          src={activity.imageUrl || "/category-cliff.png"} 
          alt={activity.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent"></div>
        <div className="absolute bottom-0 left-0 right-0 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
          <span className="text-primary font-serif tracking-widest text-sm uppercase mb-4 block">
            {activity.category}
          </span>
          <h1 className="font-serif text-5xl md:text-6xl text-foreground mb-6 max-w-4xl">
            {activity.title}
          </h1>
          <div className="flex flex-wrap gap-6 text-sm text-muted-foreground uppercase tracking-widest">
            <div className="flex items-center gap-2"><MapPin className="w-4 h-4 text-primary" /> {activity.location}</div>
            <div className="flex items-center gap-2"><Clock className="w-4 h-4 text-primary" /> {activity.durationMinutes} MIN</div>
            <div className="flex items-center gap-2"><DollarSign className="w-4 h-4 text-primary" /> ${activity.priceLow} - ${activity.priceHigh}</div>
            <div className="flex items-center gap-2"><ActivityIcon className="w-4 h-4 text-primary" /> {activity.difficulty}</div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-16">
          <div className="lg:col-span-2 space-y-12">
            <section>
              <h2 className="font-serif text-3xl mb-6 text-foreground">The Experience</h2>
              <div className="prose prose-invert max-w-none text-muted-foreground font-light leading-relaxed">
                <p>{activity.description}</p>
              </div>
            </section>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {activity.whatToBring && (
                <section className="bg-card p-8 border border-border">
                  <h3 className="font-serif text-xl mb-4 flex items-center gap-2">
                    <Check className="text-primary w-5 h-5" /> What to Bring
                  </h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{activity.whatToBring}</p>
                </section>
              )}
              {activity.whatToExpect && (
                <section className="bg-card p-8 border border-border">
                  <h3 className="font-serif text-xl mb-4 flex items-center gap-2">
                    <Info className="text-primary w-5 h-5" /> What to Expect
                  </h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{activity.whatToExpect}</p>
                </section>
              )}
            </div>

            <section>
              <h2 className="font-serif text-3xl mb-6 text-foreground border-b border-border pb-4">Concierge Intelligence</h2>
              
              {isPremium ? (
                <div className="space-y-6 bg-primary/5 p-8 border border-primary/20 rounded-lg">
                  <div className="flex items-center gap-3 mb-4">
                    <Shield className="text-primary w-6 h-6" />
                    <h3 className="font-serif text-2xl text-primary">Premium Insider Guide</h3>
                  </div>
                  <div className="prose prose-invert max-w-none text-foreground/90">
                    <p><strong>Booking Guide:</strong> {activity.basicBookingGuide || "Book 2-3 weeks in advance. Request the morning slot for best conditions."}</p>
                    <p><strong>Provider:</strong> {activity.providerName || "Local Elite Provider"}</p>
                    {activity.providerWebsite && <p><strong>Website:</strong> {activity.providerWebsite}</p>}
                    {activity.providerPhone && <p><strong>Contact:</strong> {activity.providerPhone}</p>}
                  </div>
                </div>
              ) : (
                <PremiumLock 
                  title="Unlock Insider Intelligence"
                  description="Get exact booking guides, provider direct contacts, and insider tips from our luxury concierge team."
                />
              )}
            </section>
          </div>

          <div className="lg:col-span-1">
            <div className="sticky top-28 bg-card border border-border p-8 rounded-xl">
              <h3 className="font-serif text-2xl mb-6 text-foreground">Add to Itinerary</h3>
              <p className="text-muted-foreground text-sm mb-8">
                Plan your perfect trip by adding this experience to your custom itinerary.
              </p>
              
              {!user?.isAuthenticated ? (
                <Button className="w-full bg-primary text-primary-foreground font-serif uppercase tracking-widest h-12" asChild>
                  <a href="/auth/login">Sign in to Plan</a>
                </Button>
              ) : (
                <Button className="w-full bg-primary text-primary-foreground font-serif uppercase tracking-widest h-12" asChild>
                  <a href="/dashboard">Go to Dashboard</a>
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
