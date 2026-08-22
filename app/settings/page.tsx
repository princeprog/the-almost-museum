import { ArchivePrivacySettings } from "@/components/archive-privacy-settings";
import { CollectionBackups } from "@/components/collection-backups";

export default function SettingsPage() {
  return (
    <main className="settings-page">
      <header className="settings-page__header">
        <p className="museum-eyebrow">Museum settings</p>
        <h1>Archive &amp; privacy</h1>
        <p>Keep a readable record of what is stored on this device, protect it with a backup, or remove it when you choose.</p>
      </header>
      <ArchivePrivacySettings />
      <CollectionBackups />
    </main>
  );
}
