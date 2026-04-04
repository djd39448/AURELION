import { useState } from "react";
import { Link } from "wouter";
import { useListActivities, useGetCategories } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion, AnimatePresence } from "framer-motion";
import { Search, MapPin, Clock, DollarSign, SlidersHorizontal, X } from "lucide-react";
import { PremiumLock } from "@/components/ui/premium-lock";
import { getImageUrl } from "@/lib/image-url";

export default function Activities() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [difficulty, setDifficulty] = useState<string>("all");
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  const { data: activities, isLoading } = useListActivities({
    search: search || undefined,
    category: category !== "all" ? category : undefined,
    difficulty: difficulty !== "all" ? difficulty : undefined,
  });

  const { data: categories } = useGetCategories();

  const hasActiveFilters = search || category !== "all" || difficulty !== "all";
  const clearFilters = () => {
    setSearch("");
    setCategory("all");
    setDifficulty("all");
  };

  const FilterPanel = () => (
    <div className="space-y-8">
      <div className="space-y-4">
        <h3 className="font-serif text-xl border-b border-border pb-2">Search</h3>
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search experiences..."
            className="pl-9 bg-card border-border"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="font-serif text-xl border-b border-border pb-2">Category</h3>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="bg-card border-border">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories?.map((c) => (
              <SelectItem key={c.category} value={c.category}>
                {c.category}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-4">
        <h3 className="font-serif text-xl border-b border-border pb-2">Difficulty</h3>
        <Select value={difficulty} onValueChange={setDifficulty}>
          <SelectTrigger className="bg-card border-border">
            <SelectValue placeholder="Any Difficulty" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any Difficulty</SelectItem>
            <SelectItem value="Easy">Easy</SelectItem>
            <SelectItem value="Moderate">Moderate</SelectItem>
            <SelectItem value="Challenging">Challenging</SelectItem>
            <SelectItem value="Expert">Expert</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <PremiumLock
          title="Advanced Filters"
          description="Unlock premium filtering by insider ratings, exact locations, and exclusive access availability."
        />
      </div>
    </div>
  );

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8 md:mb-12 text-center md:text-left">
        <h1 className="font-serif text-4xl md:text-5xl text-foreground mb-4">The Directory</h1>
        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl font-light">
          Browse our curated selection of Aruba's finest experiences.
        </p>
      </div>

      {/* Mobile filter toggle */}
      <div className="flex items-center gap-3 mb-6 lg:hidden">
        <Button
          variant="outline"
          className="border-primary/30 text-primary font-serif uppercase tracking-widest flex items-center gap-2"
          onClick={() => setShowMobileFilters(!showMobileFilters)}
        >
          <SlidersHorizontal className="w-4 h-4" />
          Filters
          {hasActiveFilters && (
            <span className="ml-1 bg-primary text-primary-foreground rounded-full w-5 h-5 text-xs flex items-center justify-center">
              !
            </span>
          )}
        </Button>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="text-muted-foreground text-xs flex items-center gap-1"
          >
            <X className="w-3 h-3" /> Clear
          </Button>
        )}
        <span className="ml-auto text-sm text-muted-foreground">
          {activities?.length ?? 0} results
        </span>
      </div>

      {/* Mobile filter panel */}
      <AnimatePresence>
        {showMobileFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="lg:hidden bg-card border border-border rounded-xl p-6 mb-6 overflow-hidden"
          >
            <FilterPanel />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Desktop Filters Sidebar */}
        <div className="hidden lg:block lg:col-span-1 space-y-8">
          <FilterPanel />
        </div>

        {/* Results Grid */}
        <div className="lg:col-span-3">
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-80 bg-card animate-pulse rounded-lg border border-border"
                ></div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {activities?.map((activity, index) => (
                <motion.div
                  key={activity.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="group flex flex-col bg-card border border-border overflow-hidden hover:border-primary/50 transition-colors"
                >
                  <Link href={`/activities/${activity.id}`}>
                    <div className="relative aspect-[4/3] overflow-hidden">
                      {activity.imageUrl ? (
                        <img
                          src={getImageUrl(activity.imageUrl)}
                          alt={activity.title}
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                        />
                      ) : (
                        <div className="w-full h-full bg-muted"></div>
                      )}
                      <div className="absolute top-4 left-4 flex gap-2">
                        <span className="bg-background/80 backdrop-blur text-foreground text-xs uppercase tracking-widest px-3 py-1 font-serif">
                          {activity.category}
                        </span>
                      </div>
                    </div>
                    <div className="p-4 md:p-6 flex flex-col flex-1">
                      <h3 className="font-serif text-lg md:text-xl text-foreground mb-2 line-clamp-2">
                        {activity.title}
                      </h3>
                      <p className="text-muted-foreground text-sm line-clamp-2 mb-4 md:mb-6 flex-1">
                        {activity.description}
                      </p>

                      <div className="grid grid-cols-2 gap-2 md:gap-4 text-sm text-muted-foreground border-t border-border pt-4">
                        <div className="flex items-center gap-1 md:gap-2">
                          <MapPin className="h-3 w-3 md:h-4 md:w-4 text-primary shrink-0" />
                          <span className="truncate text-xs md:text-sm">{activity.location}</span>
                        </div>
                        <div className="flex items-center gap-1 md:gap-2">
                          <Clock className="h-3 w-3 md:h-4 md:w-4 text-primary shrink-0" />
                          <span className="text-xs md:text-sm">{activity.durationMinutes} min</span>
                        </div>
                        <div className="flex items-center gap-1 md:gap-2">
                          <DollarSign className="h-3 w-3 md:h-4 md:w-4 text-primary shrink-0" />
                          <span className="text-xs md:text-sm">
                            ${activity.priceLow} – ${activity.priceHigh}
                          </span>
                        </div>
                        <div className="flex items-center justify-end uppercase tracking-wider text-xs">
                          {activity.difficulty}
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}

              {activities?.length === 0 && (
                <div className="col-span-full py-24 text-center">
                  <h3 className="font-serif text-2xl text-foreground mb-2">
                    No experiences found
                  </h3>
                  <p className="text-muted-foreground">Adjust your filters to discover more.</p>
                  <Button
                    variant="link"
                    onClick={clearFilters}
                    className="text-primary mt-4"
                  >
                    Clear all filters
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
