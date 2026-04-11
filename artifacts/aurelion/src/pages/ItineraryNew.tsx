/**
 * @module pages/ItineraryNew
 * @description Create-itinerary form page. Collects a trip title and duration
 * (1-14 days) via react-hook-form + Zod validation, then creates a new itinerary
 * through the `useCreateItinerary` mutation.
 *
 * On success:
 *  - Invalidates the itinerary list cache so the Dashboard shows the new entry.
 *  - Navigates to the newly created itinerary's detail/builder page.
 *
 * @route /itineraries/new
 * @auth Required (implicitly — the API rejects unauthenticated requests)
 * @tier None required (all tiers can create itineraries)
 */

import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useCreateItinerary } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

/** Zod schema for new-itinerary form. Coerces totalDays from string (Select) to number. */
const createSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  totalDays: z.coerce.number().min(1, "Must be at least 1 day").max(14, "Max 14 days supported for now"),
});

/**
 * ItineraryNew page component.
 *
 * @route /itineraries/new
 * @auth Required
 * @tier None
 */
export default function ItineraryNew() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  /** Used to invalidate the itinerary list cache after creation. */
  const queryClient = useQueryClient();
  /** Mutation: POST /api/itineraries with title + totalDays. */
  const createMutation = useCreateItinerary();

  /** react-hook-form instance with Zod validation. Default trip: 5 days. */
  const form = useForm<z.infer<typeof createSchema>>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- zod v3 compat types don't satisfy @hookform/resolvers' ZodType; safe at runtime
    resolver: zodResolver(createSchema as any),
    defaultValues: {
      title: "My Aruba Trip",
      totalDays: 5,
    },
  });

  /**
   * Form submission handler.
   * Creates the itinerary, invalidates the list cache, and navigates to the builder.
   */
  const onSubmit = (data: z.infer<typeof createSchema>) => {
    createMutation.mutate(
      { data },
      {
        onSuccess: (itinerary) => {
          // Invalidate itinerary list so Dashboard picks up the new entry
          queryClient.invalidateQueries({ queryKey: ["/api/itineraries"] });
          toast({ title: "Itinerary created", description: "Let's start adding activities." });
          setLocation(`/itineraries/${itinerary.id}`);
        },
        onError: () => {
          toast({ title: "Error", description: "Could not create itinerary.", variant: "destructive" });
        }
      }
    );
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-24">
      <div className="mb-12">
        <span className="text-primary font-serif tracking-widest text-sm uppercase mb-2 block">Plan a Trip</span>
        <h1 className="font-serif text-4xl text-foreground">Create Itinerary</h1>
      </div>

      <div className="bg-card border border-border p-8 rounded-xl shadow-2xl">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-foreground uppercase tracking-widest text-xs font-serif">Trip Title</FormLabel>
                  <FormControl>
                    <Input placeholder="E.g. Honeymoon Escape, Family Adventure" {...field} className="bg-background border-border text-lg h-14" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="totalDays"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-foreground uppercase tracking-widest text-xs font-serif">Duration (Days)</FormLabel>
                  <Select onValueChange={(val) => field.onChange(parseInt(val, 10))} defaultValue={field.value.toString()}>
                    <FormControl>
                      <SelectTrigger className="bg-background border-border h-14 text-lg">
                        <SelectValue placeholder="Select duration" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {[1,2,3,4,5,6,7,8,9,10,11,12,13,14].map(day => (
                        <SelectItem key={day} value={day.toString()}>{day} Days</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="pt-4 border-t border-border flex justify-end gap-4">
              <Button type="button" variant="ghost" onClick={() => setLocation("/dashboard")} className="font-serif tracking-widest uppercase">
                Cancel
              </Button>
              <Button 
                type="submit" 
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-serif uppercase tracking-widest"
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? "Creating..." : "Start Planning"}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
