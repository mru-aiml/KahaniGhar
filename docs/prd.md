# PRD: KahaniGhar (working title)

An AI storyteller that narrates in a family member's voice, in the child's own language.
Built for the Gnani.ai "Great Indian AI Internship Challenge 2026" (theme: Build Sovereign AI for India).

- Submission deadline: **10 Nov 2026, 11:59 PM IST. No extensions.**
- Target: submit by **10 Nov, 6 PM IST** (buffer for upload/post problems).
- Team: solo or 2 people. Each person is judged individually.

---

## 1. Problem

In many Indian homes, bedtime stories come from grandparents and parents. Families are spread across cities and countries, grandparents often speak regional languages or mixed speech (Hinglish, Tanglish), and their stories are never written down. Existing story apps are English-first, use generic robotic voices, and are not personal.

## 2. Vision

A child hears a story in the voice of someone they love, in their own language, starring themselves, and can decide what happens next. A grandparent can speak a memory once and it becomes a story that stays in the family.

## 3. Target users

| User | Need |
|---|---|
| Child (3-10) | Fun, safe, interactive stories that use their name and interests |
| Parent | Easy bedtime routine in the home language, no screen fighting, safe content |
| Grandparent / relative | Speak a memory or folktale instead of typing; see it preserved |
| Judges / Gnani | A clear, honest demo that uses Gnani models meaningfully |

## 4. Goals and non-goals

**Goals**
1. Working end-to-end demo: speak a memory -> structured story -> narrated aloud.
2. Strong use of all three Gnani models (STT, TTS, reasoning LLM), each named in the submission.
3. Visible Indian-language and code-mixed support.
4. Consent-first voice cloning (a safe, trust-building feature, not a gimmick).

**Non-goals (for this submission)**
- Real accounts, payments, or a public launch.
- Storing real data of real children. Use synthetic data and consenting team members only.
- Image/illustration generation (optional stretch, not required).
- Offline mode.

## 5. Features (from the feature table)

Priority: P0 = must be in the demo, P1 = should, P2 = stretch.

| # | Feature | What it does | Gnani model | Priority |
|---|---|---|---|---|
| 1 | Story Creator | Converts a person's spoken memory into a structured story | Prisma v2.5 (STT) + Evon v3.3 | P0 |
| 2 | Multilingual Narration | Narrates in regional languages and code-mixed speech | Timbre v2.5 (TTS), Prisma | P0 |
| 3 | Story Personalization | Uses the child's name, interests, age-appropriate themes | Evon v3.3 | P0 |
| 4 | Interactive Stories | Child chooses what happens next (by tap or voice) | Evon + Prisma + Timbre | P0 |
| 5 | Familiar Voice Stories | Narrates in an authorized family member's voice | Timbre / voice-clone API | P1 |
| 6 | Grandma's Storybook | Preserves family stories, childhood memories, folklore | Evon + storage | P1 |
| 7 | Family Story Library | Stores recordings and stories shared by family members | Storage only | P1 |

Cut order if time runs out: 7 -> 6 -> 5. Never cut 1-4.

## 6. User stories and acceptance criteria

**F1 Story Creator**
- As a grandparent, I press a mic button and tell a memory in Hindi (or any supported language).
- AC: transcript appears within ~2s of stopping; the generated story has title, characters, 5-8 scenes, and a gentle moral; I can edit the transcript before generating; original facts (names, places) are kept.

**F2 Multilingual Narration**
- As a parent, I pick a language and a voice and press Play.
- AC: at least Hindi, English (en-IN), and 2 more regional languages work; Hinglish text is read naturally; audio starts within ~3s of pressing Play (stream scene by scene).

**F3 Story Personalization**
- As a parent, I enter the child's first name (synthetic/nickname), age band, and 2-3 interests.
- AC: the child's name and interests appear naturally in the story; content stays age-appropriate (no violence, no scary endings for under-6).

**F4 Interactive Stories**
- As a child, at 2-3 points the story pauses and offers 2-3 choices.
- AC: choice by tap or by saying it aloud; next scene reflects the choice; the story always reaches a happy ending within 3 choices.

**F5 Familiar Voice Stories**
- As a family member, I record a 5-30 second sample and explicitly consent.
- AC: consent screen must be accepted before any cloning; the voice is only usable by the family that owner added; owner can delete the voice and embedding at any time; a visible label says "AI voice, authorized by <name>".

**F6 Grandma's Storybook**
- AC: stories are tagged by narrator, language, and type (memory / folklore / childhood); can be opened as a book-style page with the original recording next to the AI-made version.

**F7 Family Story Library**
- AC: list, search by title/narrator, play original recording or AI narration, delete.

## 7. Contest fit

| Award | How we aim for it |
|---|---|
| Main Character | Show a regional / low-resource language story |
| Mixed Vibes | Code-mixed voice input and narration (Hinglish) |
| Jugaad Genius | Grandma's memory -> story in her own voice |
| Real Deal | Preserving family stories + home-language reading for kids |
| Demo Day Drop | Tight 60-second video (see phase.md) |
| Crowd Favourite | Genuine public posts, no bought engagement |
| Solo Ninja / Two-Person Army | Depends on team size |
| Small Town, Big Build | Only if a Tier 2/3 college applies |

Note: one person/team can win only one award. Pick one main angle: **Jugaad Genius + Mixed Vibes**.

## 8. Success metrics (for our own testing)

- Time from tap "Create" to first audio: under 5s.
- STT: test with 20 phrases (including noisy room); record how many were misheard and report honestly.
- 5-10 testers complete one full story without help.
- Demo runs 3 times in a row without failure.

## 9. Risks and mitigations

| Risk | Mitigation |
|---|---|
| Only 6 days left | Strict P0/P1/P2; daily demo-able build |
| Evon v3.3 is open-weight, not on the API; 30B params is heavy to host | Request weights on Hugging Face today; try a hosted GPU endpoint; confirm on Discord what is acceptable. See architecture.md section 8 |
| Voice cloning is not listed among the three named models | Ask on Discord whether it is allowed and covered by the 5,000 credits; keep it P1 |
| Privacy: voice is personal data (DPDP Act) | Synthetic data + consenting teammates only; consent gate; delete button |
| API model names changed (vachana-voice-v3 renamed to timbre-v2.0) | Read model names from env config; check dashboard/docs before coding |
| Credit exhaustion | Cache TTS audio per scene; do not regenerate on replay |

## 10. Open questions (resolve on Day 0)

1. Is Evon weights access approved, and can we run it on free/low-cost GPU?
2. Is voice cloning allowed/credit-covered for the challenge?
3. Are we solo or a team of two? (Credits go to the primary registrant only.)
4. Which 3-4 languages do we demo? (Suggest Hindi, English, Hinglish, + one regional language of the team's choice.)
5. Read the programme terms on project ownership before submitting.
