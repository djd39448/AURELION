/**
 * @module pages/Login
 * @description Login form page. Uses react-hook-form + Zod validation to collect
 * email/password credentials, then submits via the `useLogin` mutation.
 *
 * On success:
 *  - The user object is written directly into the TanStack Query cache
 *    (key: "/api/auth/me") so the entire app instantly recognises the session.
 *  - A welcome toast is shown.
 *  - The user is redirected to /dashboard.
 *
 * On failure:
 *  - A destructive toast with "Invalid email or password" is shown.
 *
 * @route /auth/login
 * @auth None required (intended for unauthenticated users)
 * @tier None required
 */

import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLogin, useGetMe } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

/** Zod schema for login form validation. */
const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

/**
 * Login page component.
 *
 * @route /auth/login
 * @auth None
 * @tier None
 */
export default function Login() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  /** Direct access to the QueryClient to optimistically set the user cache on login. */
  const queryClient = useQueryClient();
  /** Mutation: POST /api/auth/login with email + password. */
  const loginMutation = useLogin();

  /** react-hook-form instance with Zod schema validation. */
  const form = useForm<z.infer<typeof loginSchema>>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- zod v3 compat types don't satisfy @hookform/resolvers' ZodType; safe at runtime
    resolver: zodResolver(loginSchema as any),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  /**
   * Form submission handler.
   * Calls the login mutation; on success, seeds the auth cache and navigates to dashboard.
   */
  const onSubmit = (data: z.infer<typeof loginSchema>) => {
    loginMutation.mutate(
      { data },
      {
        onSuccess: (userData) => {
          // Optimistically populate the auth cache so Navbar/Dashboard react immediately
          queryClient.setQueryData(["/api/auth/me"], { ...userData, isAuthenticated: true });
          toast({ title: "Welcome back", description: "Successfully signed in." });
          setLocation("/dashboard");
        },
        onError: () => {
          toast({ title: "Sign in failed", description: "Invalid email or password.", variant: "destructive" });
        }
      }
    );
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8 bg-card border border-border p-8 rounded-xl shadow-2xl">
        <div className="text-center">
          <h2 className="font-serif text-3xl tracking-wide text-foreground">Welcome Back</h2>
          <p className="mt-2 text-muted-foreground text-sm">Sign in to access your luxury itineraries</p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-foreground uppercase tracking-widest text-xs font-serif">Email</FormLabel>
                  <FormControl>
                    <Input placeholder="email@example.com" {...field} className="bg-background border-border" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-foreground uppercase tracking-widest text-xs font-serif">Password</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="••••••••" {...field} className="bg-background border-border" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button 
              type="submit" 
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-serif uppercase tracking-widest h-12"
              disabled={loginMutation.isPending}
            >
              {loginMutation.isPending ? "Signing in..." : "Sign In"}
            </Button>
          </form>
        </Form>

        <div className="text-center text-sm text-muted-foreground pt-4 border-t border-border">
          Don't have an account?{" "}
          <Link href="/auth/register" className="text-primary hover:text-primary/80 font-serif">
            Create an account
          </Link>
        </div>
      </div>
    </div>
  );
}
