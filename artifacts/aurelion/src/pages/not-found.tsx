/**
 * @module pages/not-found
 * @description 404 "Page Not Found" fallback page.
 * Rendered by the catch-all `<Route>` in App.tsx when no other route matches.
 *
 * @route * (catch-all)
 * @auth None required
 * @tier None required
 */

import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";

/**
 * NotFound page component.
 * Displays a centred card with a 404 message. Intentionally uses a developer-facing
 * hint ("Did you forget to add the page to the router?") since this page should
 * rarely be seen by end-users in production.
 *
 * @route * (fallback — matched when no other route applies)
 * @auth None
 * @tier None
 */
export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md mx-4">
        <CardContent className="pt-6">
          <div className="flex mb-4 gap-2">
            <AlertCircle className="h-8 w-8 text-red-500" />
            <h1 className="text-2xl font-bold text-gray-900">404 Page Not Found</h1>
          </div>

          <p className="mt-4 text-sm text-gray-600">
            Did you forget to add the page to the router?
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
