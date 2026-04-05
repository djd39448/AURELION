/**
 * @module pages/Register
 * @description Registration form page. Collects name, email, and password
 * via react-hook-form + Zod validation, then submits via the `useRegister` mutation.
 *
 * On success:
 *  - The new user object is written directly into the TanStack Query cache
 *    (key: "/api/auth/me") so the session is established immediately.
 *  - A "Welcome to Aurelion" toast is shown.
 *  - The user is redirected to /dashboard.
 *
 * On failure:
 *  - A destructive toast with a generic retry message is shown.
 *
 * @route /auth/register
 * @auth None required (intended for unauthenticated users)
 * @tier None required
 */

import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRegister } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

/** Zod schema for registration form validation (name, email, password). */
const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

/**
 * Register page component.
 *
 * @route /auth/register
 * @auth None
 * @tier None
 */
export default function Register() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  /** Direct access to the QueryClient to optimistically set the user cache on registration. */
  const queryClient = useQueryClient();
  /** Mutation: POST /api/auth/register with name + email + password. */
  const registerMutation = useRegister();

  /** react-hook-form instance with Zod schema validation. */
  const form = useForm<z.infer<typeof registerSchema>>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- zod v3 compat types don't satisfy @hookform/resolvers' ZodType; safe at runtime
    resolver: zodResolver(registerSchema as any),
    defaultValues: {
      name: "",
      email: "",
      password: "",
    },
  });

  /**
   * Form submission handler.
   * Calls the register mutation; on success, seeds the auth cache and navigates to dashboard.
   */
  const onSubmit = (data: z.infer<typeof registerSchema>) => {
    registerMutation.mutate(
      { data },
      {
        onSuccess: (userData) => {
          // Optimistically populate the auth cache so Navbar/Dashboard react immediately
          queryClient.setQueryData(["/api/auth/me"], { ...userData, isAuthenticated: true });
          toast({ title: "Account created", description: "Welcome to Aurelion." });
          setLocation("/dashboard");
        },
        onError: () => {
          toast({ title: "Registration failed", description: "Please try again.", variant: "destructive" });
        }
      }
    );
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8 bg-card border border-border p-8 rounded-xl shadow-2xl">
        <div className="text-center">
          <h2 className="font-serif text-3xl tracking-wide text-foreground">Join Aurelion</h2>
          <p className="mt-2 text-muted-foreground text-sm">Create your luxury travel account</p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-foreground uppercase tracking-widest text-xs font-serif">Full Name</FormLabel>
                  <FormControl>
                    <Input placeholder="John Doe" {...field} className="bg-background border-border" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
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
              disabled={registerMutation.isPending}
            >
              {registerMutation.isPending ? "Creating account..." : "Create Account"}
            </Button>
          </form>
        </Form>

        <div className="text-center text-sm text-muted-foreground pt-4 border-t border-border">
          Already have an account?{" "}
          <Link href="/auth/login" className="text-primary hover:text-primary/80 font-serif">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
