import { DeckStudio } from "@/components/deck-studio";

export default function HomePage() {
  return (
    <main className="min-h-full overflow-x-clip bg-[radial-gradient(circle_at_top,_rgba(62,224,197,0.16),_transparent_32%),linear-gradient(180deg,#0b1220_0%,#070b14_40%)]">
      <DeckStudio />
    </main>
  );
}
