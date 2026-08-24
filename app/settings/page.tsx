import { ArchivePrivacySettings } from "@/components/archive-privacy-settings";
import { CollectionBackups } from "@/components/collection-backups";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function SettingsPage() {
  return (
    <main className="mx-auto grid w-full max-w-3xl gap-6 py-6 sm:py-10">
      <Card>
        <CardHeader>
          <p className="museum-eyebrow">Museum settings</p>
          <CardTitle><h1 className="text-2xl sm:text-3xl">Archive &amp; privacy</h1></CardTitle>
          <CardDescription>Keep a readable record of what is stored on this device, protect it with a backup, or remove it when you choose.</CardDescription>
        </CardHeader>
      </Card>
      <ArchivePrivacySettings />
      <CollectionBackups />
    </main>
  );
}
