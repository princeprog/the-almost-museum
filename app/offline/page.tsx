import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";

export default function OfflinePage() {
  return (
    <main className="offline-page">
      <p className="museum-eyebrow">Connection unavailable</p>
      <h1>You can still visit the Museum.</h1>
      <p>The saved collection and the pages you opened are available on this device. Reconnect when you are ready to load something new.</p>
      <Link className={buttonVariants()} href="/museum">Try the Museum again</Link>
    </main>
  );
}
