import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export default function OfflinePage() {
  return (
    <main className="grid min-h-[calc(100svh-8rem)] place-items-center py-6">
      <Card aria-labelledby="offline-title" className="w-full max-w-xl" role="region">
        <CardHeader>
          <p className="museum-eyebrow">Connection unavailable</p>
          <CardTitle><h1 className="text-2xl sm:text-3xl" id="offline-title">You can still visit the Museum.</h1></CardTitle>
        </CardHeader>
        <CardContent>
          <Alert><AlertDescription>The saved collection and the pages you opened are available on this device. Reconnect when you are ready to load something new.</AlertDescription></Alert>
        </CardContent>
        <CardFooter>
          <Link className={buttonVariants({ className: "min-h-11 w-full sm:w-auto" })} href="/museum">Try the Museum again</Link>
        </CardFooter>
      </Card>
    </main>
  );
}
