// POST /api/stories - Create a new story
// GET /api/stories - List stories with filters

import { NextRequest } from "next/server";
import { withErrorHandling } from "@/lib/api/errors";
import { getRouteAuth, requireRouteOrigin, parseJsonBodyOrThrow } from "@/lib/api/auth";
import { CreateStoryRequestSchema, ListStoriesQuerySchema, StoryStructure } from "@/lib/api/schemas";
import { createStory, getOrCreateChild, listStories } from "@/lib/db/queries";
import { generateStory } from "@/lib/llm/client";
import { checkStoryStructureSafety } from "@/lib/safety/content";
import { createScenes } from "@/lib/db/queries";
import { validateGnaniEnv, validateLlmEnv, validateSupabaseEnv } from "@/lib/db/queries";

// Force dynamic rendering for this route
export const dynamic = "force-dynamic";

// POST /api/stories - Create a new story
export const POST = withErrorHandling(async (request: NextRequest): Promise<Response> => {
  // Validate required environment
  validateSupabaseEnv();
  validateGnaniEnv();
  validateLlmEnv();

  // Authenticate and verify origin
  await requireRouteOrigin(request);
  const { familyId, memberId } = await getRouteAuth();

  // Parse and validate request body
  const input = await parseJsonBodyOrThrow(request, CreateStoryRequestSchema);

  // Get or create child record
  const child = await getOrCreateChild(familyId, input.child.nickname, input.child.ageBand, input.child.interests);

  // Generate story using LLM
  const structure = await generateStory({
    transcript: input.transcript,
    language: input.language,
    childNickname: input.child.nickname,
    ageBand: input.child.ageBand,
    interests: input.child.interests,
    kind: input.kind,
    interactive: input.interactive,
  });

  // Safety check
  const safetyResult = checkStoryStructureSafety(structure);
  if (!safetyResult.safe) {
    return Response.json(
      {
        success: false,
        error: {
          code: "SAFETY_VIOLATION",
          message: "Generated story contains unsafe content",
          retryable: false,
          status: 400,
          details: { reason: safetyResult.reason },
        },
      },
      { status: 400 }
    );
  }

  // Create story record
  const story = await createStory({
    familyId,
    title: structure.title,
    language: input.language,
    kind: input.kind,
    sourceRecordingId: null, // Will be linked when STT is integrated
    narratorMemberId: memberId,
    childId: child.id,
    ageBand: input.child.ageBand,
    structure,
  });

  // Create scene records
  const scenes = structure.scenes.map((s) => ({
    storyId: story.id,
    idx: s.idx,
    text: s.text,
    choicePrompt: s.choices ? "What happens next?" : null,
    choices: s.choices || null,
  }));
  await createScenes(scenes);

  // Return response (without audioUrl - TTS is on-demand)
  return Response.json(
    {
      success: true,
      data: {
        id: story.id,
        title: story.title,
        language: story.language,
        kind: story.kind,
        ageBand: story.age_band,
        childNickname: input.child.nickname,
        interests: input.child.interests,
        narrator: "Family", // TODO: Get member display name
        structure,
        createdAt: story.created_at,
      },
    },
    { status: 201 }
  );
});

// GET /api/stories - List stories with filters
export const GET = withErrorHandling(async (request: NextRequest): Promise<Response> => {
  // Validate required environment
  validateSupabaseEnv();

  // Authenticate
  const { familyId } = await getRouteAuth();

  // Parse query parameters
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("query") || "";
  const language = searchParams.get("language") || "all";
  const kind = searchParams.get("kind") || "all";
  const narrator = searchParams.get("narrator") || "all";
  const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 50);
  const offset = parseInt(searchParams.get("offset") || "0", 10);

  // Validate query params
  const queryValidation = ListStoriesQuerySchema.safeParse({ query, language, kind, narrator, limit, offset });
  if (!queryValidation.success) {
    return Response.json(
      {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid query parameters",
          retryable: false,
          status: 400,
          details: { issues: queryValidation.error.issues },
        },
      },
      { status: 400 }
    );
  }

  // Fetch stories
  const { stories, total } = await listStories({
    familyId,
    query,
    language,
    kind,
    narrator,
    limit,
    offset,
  });

  // Transform stories for response
  const transformedStories = stories.map((s) => {
    const structure = s.structure as StoryStructure;
    return {
      id: s.id,
      title: s.title,
      language: s.language,
      kind: s.kind,
      ageBand: s.age_band,
      childNickname: structure?.characters?.[0] || s.title,
      interests: structure?.interests || [],
      narrator: "Family",
      structure: s.structure,
      createdAt: s.created_at,
    };
  });

  return Response.json(
    {
      success: true,
      data: {
        stories: transformedStories,
        total,
        hasMore: offset + limit < total,
      },
    },
    { status: 200 }
  );
});