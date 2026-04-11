/**
 * @module App
 * @description Root application component for AURELION.
 * Sets up the provider tree (TanStack Query, Tooltip, Toaster) and defines
 * all client-side routes via Wouter's `<Switch>`.
 *
 * Provider hierarchy (outermost to innermost):
 *   QueryClientProvider  -- data-fetching cache & mutations
 *     TooltipProvider    -- shadcn/ui tooltip context
 *       WouterRouter     -- client-side routing with Vite BASE_URL support
 *         MainLayout     -- persistent Navbar + Footer chrome
 *           Switch/Route -- matched page component
 *       Toaster          -- global toast notification outlet (outside router so toasts persist across navigations)
 */

import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HelmetProvider } from "react-helmet-async";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { MainLayout } from "@/components/layout/MainLayout";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import NotFound from "@/pages/not-found";

// Pages
import Home from "@/pages/Home";
import Activities from "@/pages/Activities";
import ActivityDetail from "@/pages/ActivityDetail";
import Pricing from "@/pages/Pricing";
import About from "@/pages/About";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Dashboard from "@/pages/Dashboard";
import ItineraryNew from "@/pages/ItineraryNew";
import ItineraryDetail from "@/pages/ItineraryDetail";
import Chat from "@/pages/Chat";
import Admin from "@/pages/Admin";
import Terms from "@/pages/Terms";
import Privacy from "@/pages/Privacy";

/**
 * Singleton TanStack QueryClient instance.
 * Uses default options (staleTime, gcTime, retry) — can be customised here if needed.
 */
const queryClient = new QueryClient();

/**
 * Router — maps URL paths to page components inside the shared MainLayout.
 *
 * Route overview:
 *  - /                     Home          (public)
 *  - /activities           Activities    (public)
 *  - /activities/:id       ActivityDetail(public, premium content gated)
 *  - /pricing              Pricing       (public)
 *  - /about                About         (public)
 *  - /terms                Terms         (public)
 *  - /privacy              Privacy       (public)
 *  - /auth/login           Login         (public, guest-only intent)
 *  - /auth/register        Register      (public, guest-only intent)
 *  - /dashboard            Dashboard     (auth required)
 *  - /itineraries/new      ItineraryNew  (auth required)
 *  - /itineraries/:id      ItineraryDetail (auth required)
 *  - /chat/:sessionId      Chat          (auth + premium tier required)
 *  - /admin                Admin         (auth + admin role required)
 *  - *                     NotFound      (catch-all 404)
 *
 * Wouter's `<Switch>` renders only the first matching route.
 * The final `<Route>` without a `path` acts as the 404 fallback.
 */
function Router() {
  return (
    <MainLayout>
      <ErrorBoundary section="this page">
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/activities" component={Activities} />
          <Route path="/activities/:id" component={ActivityDetail} />
          <Route path="/pricing" component={Pricing} />
          <Route path="/about" component={About} />
          <Route path="/terms" component={Terms} />
          <Route path="/privacy" component={Privacy} />
          <Route path="/auth/login" component={Login} />
          <Route path="/auth/register" component={Register} />
          <Route path="/dashboard" component={Dashboard} />
          <Route path="/itineraries/new" component={ItineraryNew} />
          <Route path="/itineraries/:id" component={ItineraryDetail} />
          <Route path="/chat/:sessionId" component={Chat} />
          <Route path="/admin" component={Admin} />
          {/* Catch-all: renders when no route above matches */}
          <Route component={NotFound} />
        </Switch>
      </ErrorBoundary>
    </MainLayout>
  );
}

/**
 * App — top-level component exported as the default.
 * Wraps the entire application in the required provider tree.
 *
 * The WouterRouter `base` prop strips the trailing slash from Vite's BASE_URL
 * so that all `<Link href="...">` paths resolve correctly in both development
 * and production (where the app may be served from a sub-directory).
 *
 * @returns {JSX.Element} The fully-provided application tree.
 */
function App() {
  return (
    <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        {/* Strip trailing slash from BASE_URL so Wouter resolves paths correctly */}
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        {/* Toaster lives outside the router so notifications survive page transitions */}
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
    </HelmetProvider>
  );
}

export default App;
