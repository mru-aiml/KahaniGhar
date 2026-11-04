import Link from "next/link";
import StoryCard from "@/components/StoryCard";
import { storyService } from "@/lib/services/story-service";

export const dynamic = "force-dynamic";

export default async function Home() {
  const stories = await storyService.list();
  const featured = stories.slice(0, 3);

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="mx-auto max-w-6xl px-4 py-16 md:py-24">
          <div className="max-w-2xl">
            <p className="text-sm font-medium uppercase tracking-widest text-kg-teal">Bedtime, reimagined</p>
            <h1 className="mt-3 font-heading text-4xl leading-tight text-kg-cream md:text-6xl">
              Stories your family <span className="text-kg-amber">already knows</span>, told in the voice they love.
            </h1>
            <p className="mt-4 text-lg text-kg-cream/70">
              KahaniGhar turns a grandparent&apos;s memory into a personalized, interactive story —
              narrated in Hindi, English, Hinglish or Marathi.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/create"
                className="rounded-full bg-kg-amber px-6 py-3 font-medium text-kg-night hover:bg-kg-amber/90"
              >
                Tell a story
              </Link>
              <Link
                href="/library"
                className="rounded-full border border-white/20 px-6 py-3 text-kg-cream hover:border-kg-amber"
              >
                Listen to a story
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Featured stories */}
      <section className="mx-auto max-w-6xl px-4 py-12">
        <div className="mb-6 flex items-end justify-between">
          <h2 className="font-heading text-2xl text-kg-cream">Featured stories</h2>
          <Link href="/library" className="text-sm text-kg-teal hover:text-kg-amber">See all →</Link>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {featured.map((s) => (
            <StoryCard key={s.id} story={s} />
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-6xl px-4 py-12">
        <h2 className="mb-8 text-center font-heading text-2xl text-kg-cream">How it works</h2>
        <div className="grid gap-6 md:grid-cols-4">
          {[
            { step: "1", title: "Speak", desc: "A grandparent tells a memory in their own language." },
            { step: "2", title: "Transcribe", desc: "Gnani Prisma turns speech into text you can edit." },
            { step: "3", title: "Personalize", desc: "Gnani Evon shapes it into a story starring your child." },
            { step: "4", title: "Listen", desc: "Gnani Timbre narrates; the child chooses what happens next." },
          ].map((h) => (
            <div key={h.step} className="rounded-2xl border border-white/10 bg-kg-cream/5 p-5 text-center">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-kg-amber text-kg-night font-heading">
                {h.step}
              </div>
              <h3 className="mt-3 font-heading text-lg text-kg-cream">{h.title}</h3>
              <p className="mt-1 text-sm text-kg-cream/60">{h.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}