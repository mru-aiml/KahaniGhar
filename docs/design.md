# Design: KahaniGhar

Mobile-first (phone portrait) because most demo viewers and families will use a phone. Desktop just centers a phone-width column.

## 1. Design principles

1. **Voice first**: big mic and play buttons; typing is the fallback, not the default.
2. **Warm and calm**: bedtime feel, not a gaming feel. Soft colors, slow motion.
3. **Language-native**: show text in the story's own script (Devanagari, Tamil, etc.) with proper fonts; never show romanized text unless the user asks.
4. **Trust visible**: always show who is speaking and whether a voice is AI-generated and authorized.
5. **Demo-friendly**: every key screen understandable in 3 seconds of a 60-second video.

## 2. Visual identity

| Item | Choice |
|---|---|
| Mood | Cozy night, lantern light, handmade storybook |
| Background | Deep indigo `#1B1B3A` (night) with cream `#FFF4E0` cards |
| Primary | Warm amber `#F6A93B` (lantern) |
| Accent | Teal `#2FB5A8` (for "listening/recording") |
| Danger | Soft red `#E4572E` (delete, stop) |
| Text | Cream on dark, deep indigo on cream cards |
| Headings font | Baloo 2 (Latin + Devanagari friendly) |
| Body font | Noto Sans / Noto Sans Devanagari, plus Noto family for Tamil, Telugu, Bengali, etc. |
| Shape | Rounded corners 20-24px, big touch targets (min 48px) |
| Icons | Lucide, simple line icons |
| Motion | Slow fades, gentle page-turn effect on scenes, pulsing mic ring while recording |

Logo idea: an open book with a small lantern or a sound wave inside it. Keep it simple; text wordmark is enough.

## 3. Screens

### 3.1 Home
- Greeting with family name, large "Tell a story" and "Listen to a story" cards.
- Row of recent stories (cover color + title + narrator avatar).
- Language chip at the top (e.g., हिन्दी) to switch UI/narration language.

### 3.2 Create (Story Creator + Personalization)
Step 1 **Who is it for?** child nickname, age band chips (3-5, 6-8, 9-10), interest chips (animals, space, cricket, trains, rivers...).
Step 2 **Tell it**: huge mic button; live waveform; "or type" link. After recording, show transcript in an editable box with language chip (Hindi, Hinglish, Tamil...).
Step 3 **Choose style**: Memory / Folk tale / Fresh story; Interactive on/off toggle.
Step 4 **Generate**: calm loading screen with rotating lines ("Lighting the lantern...").

### 3.3 Story Player
- Top: title, narrator chip ("Dadi's voice - AI voice, authorized").
- Center: current scene text, large, with the spoken sentence softly highlighted.
- Bottom: play/pause, previous/next scene, speed (0.8x / 1x), language/voice switcher.
- **Choice moment**: narration pauses; 2-3 large illustrated cards slide up ("Follow the bird" / "Open the old door"); tap or say it aloud (mic pulses teal).
- End screen: moral line, "Save to library", "Tell another".

### 3.4 Voices (Familiar Voice)
- List of family voices with avatar, label, and language.
- "Add a voice" opens the **Consent modal** (see 5), then a recorder with a short prompt line to read aloud (5-30 s), a preview button, and Save.
- Each voice has "Delete" with a confirm dialog.

### 3.5 Grandma's Storybook
- Book-style page: left = original memory (transcript + play original recording), right = the finished story.
- Tags: narrator, language, type (memory / folklore / childhood).
- Soft paper texture, serif-feel heading, page-turn animation.

### 3.6 Family Library
- Grid/list with search bar, filter chips (narrator, language, type).
- Card: title, narrator avatar, language, duration, play icon.
- Long-press or kebab menu: open, share inside family, delete.

## 4. Components (build once, reuse)

Recorder (mic ring, waveform, timer), TranscriptEditor, ChipGroup, StoryCard, Player, SceneText (highlight sentence), ChoiceCards, VoicePicker, ConsentModal, Toast, EmptyState, LoadingLantern.

## 5. Consent modal copy (must be shown before any voice cloning)

> "You are about to create an AI copy of <name>'s voice for bedtime stories.
> - I am <name>, or I have <name>'s permission.
> - The voice will only be used inside this family.
> - It can be deleted at any time.
> [ ] I agree"

Button stays disabled until the checkbox is ticked. The consent text and time are stored.

## 6. States

| State | Behavior |
|---|---|
| Empty library | Illustration + "Record your first family story" |
| Recording | Teal pulsing ring, timer, "Tap to stop" |
| Transcribing | Skeleton text lines |
| STT low confidence / empty | "I couldn't hear that clearly. Try again or type it." |
| TTS failed | Show text, "Retry narration" button |
| Offline / API error | Plain message with retry; never a blank screen |
| Limit reached (credits) | "Narration is resting for now" + text-only mode |

## 7. Accessibility and inclusion

- Contrast at least 4.5:1 for body text; tested on the dark background.
- Everything doable by voice or tap; large text option (scene text 20px+, adjustable).
- Don't rely on color alone for recording state (icon + label too).
- Screen-reader labels on all icon buttons.
- Language names shown in their own script.
- Child-safe: no ads, no external links on the player, no open chat with a child.

## 8. Copy tone

Short, warm, simple. Hindi and English strings both prepared for core UI. Avoid jargon like "model" or "API" in the UI.

## 9. Demo-friendly path (for the 60-second video)

1. 0-5s: Problem line on screen ("Dadi's stories live only in her memory").
2. 5-20s: Dadi speaks a memory in Hinglish -> transcript appears.
3. 20-35s: Story generated; plays in Dadi's AI voice (consent badge visible).
4. 35-50s: Choice moment; child answers by voice; story continues.
5. 50-60s: Library shows the saved story + "Built with Gnani Prisma, Timbre and Evon" + hashtags.
