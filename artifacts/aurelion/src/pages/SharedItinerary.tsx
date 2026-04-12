/**
 * @module pages/SharedItinerary
 * @description Public shared itinerary view — no authentication required.
 *
 * Renders an itinerary identified by a UUID share token. The page is fully
 * public and accessible without a login. At the bottom there is a subtle
 * acquisition CTA directing visitors to plan their own Aruba trip.
 *
 * @route /shared/:token
 * @auth None
 */

import { useParams, Link } from "wouter";
import { useGetSharedItinerary } from "@workspace/api-client-react";
import { Clock, MapPin } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { getActivityImageUrl } from "@/lib/image-url";

const TIME_SLOTS = ["morning", "afternoon", "evening"] as const;

export default function SharedItinerary() {
  const params = useParams();
  const token = params.token ?? "";

  const { data: itinerary, isLoading, isError } = useGetSharedItinerary(token, {
    query: { enabled: !!token },
  });

  if (isLoading) {
    return (
      <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Skeleton className="h-8 w-64 mb-2 bg-muted" />
        <Skeleton className="h-4 w-32 mb-10 bg-muted" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="mb-10">
            <Skeleton className="h-6 w-20 mb-4 bg-muted" />
            <Skeleton className="h-28 w-full bg-muted rounded-lg" />
          </div>
        ))}
      </div>
    );
  }

  if (isError || !itinerary) {
    return (
      <div className="p-24 text-center">
        <h3 className="font-serif text-2xl text-foreground mb-3">Itinerary not found</h3>
        <p className="text-muted-foreground mb-6">
          This share link may have been removed or the itinerary no longer exists.
        </p>
        <Link
          href="/"
          className="text-primary underline font-serif"
        >
          Plan your own Aruba trip →
        </Link>
      </div>
    );
  }

  const days = Array.from({ length: itinerary.totalDays }, (_, i) => i + 1);

  return (
    <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-16">
      {/* Header */}
      <div className="mb-10">
        <h1 className="font-serif text-3xl md:text-4xl text-foreground mb-2">{itinerary.title}</h1>
        <p className="text-sm text-muted-foreground uppercase tracking-widest">
          {itinerary.totalDays} Day{itinerary.totalDays !== 1 ? "s" : ""} · Aruba Itinerary
        </p>
      </div>

      {/* Day-by-day schedule */}
      {days.map((day) => {
        const dayItems = (itinerary.items ?? []).filter((item) => item.dayNumber === day);
        if (dayItems.length === 0) return null;

        return (
          <div key={day} className="mb-12">
            <h2 className="font-serif text-xl md:text-2xl text-foreground mb-6 pb-2 border-b border-border">
              Day {day}
            </h2>

            {TIME_SLOTS.map((slot) => {
              const slotItems = dayItems.filter((item) => item.timeSlot === slot);
              if (slotItems.length === 0) return null;

              return (
                <div key={slot} className="mb-6">
                  <h3 className="font-serif text-sm uppercase tracking-widest text-muted-foreground mb-3">
                    {slot}
                  </h3>
                  <div className="space-y-3">
                    {slotItems.map((item) => (
                      <div
                        key={item.id}
                        className="flex border border-border bg-card rounded-lg overflow-hidden"
                      >
                        <div className="w-24 sm:w-36 shrink-0">
                          <img
                            src={getActivityImageUrl(item.activity?.imageUrl, item.activity?.category)}
                            alt={item.activity?.title ?? "Activity"}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="p-4 flex-1 flex flex-col justify-between min-w-0">
                          <div>
                            <h4 className="font-serif text-lg mb-1 leading-tight">
                              {item.activity?.title}
                            </h4>
                            <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                              {item.activity?.description}
                            </p>
                            <div className="flex flex-wrap gap-3 text-xs font-serif uppercase tracking-widest text-muted-foreground">
                              <span className="flex items-center gap-1 text-primary">
                                <Clock className="w-3 h-3" />
                                {item.activity?.durationMinutes}m
                              </span>
                              <span className="flex items-center gap-1 text-primary">
                                <MapPin className="w-3 h-3" />
                                {item.activity?.location}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}

      {/* Acquisition CTA */}
      <div className="mt-16 pt-8 border-t border-border text-center">
        <p className="text-muted-foreground font-serif italic mb-2">
          Inspired? Plan your own Aruba adventure.
        </p>
        <Link
          href="/"
          className="inline-block font-serif uppercase tracking-widest text-sm text-primary hover:underline"
        >
          Plan your own Aruba trip → aurelion.com
        </Link>
      </div>
    </div>
  );
}
