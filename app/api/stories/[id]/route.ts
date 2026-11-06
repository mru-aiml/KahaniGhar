// GET /api/stories/[id] - Get a single story
// DELETE /api/stories/[id] - Delete a story
// POST /api/stories/[id]/branch - Branch a story

import { NextRequest } from "next/server";
import { withErrorHandling } from "@/lib/api/errors";
import { getRouteAuth, requireRouteOrigin, parseJsonBodyOrThrow } from "@/lib/api/auth";
import {
  BranchStoryRequestSchema,
  StorySchema,
  BranchStoryResponseSchema,
  StoryStructure,
} from "@/lib/api/schemas";
import {
  getStoryByIdForFamily,
  deleteStory,
  getScenesByStoryId,
  getChildById,
  assertStoryOfFamily,
  createScenes,
} from "@/lib/db/queries";
import { branchStory } from "@/lib/llm/client";
import { checkStoryStructureSafety } from "@/lib/safety/content";
import { validateSupabaseEnv, validateLlmEnv } from "@/lib/db/queries";

// Force dynamic rendering for this route
export const dynamic = "force-dynamic";

// GET /api/stories/[id] - Get a single story
export const GET = withErrorHandling(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> => {
  validateSupabaseEnv();

  const { familyId } = await getRouteAuth();
  const { id } = await params;

  const story = await getStoryByIdForFamily(id, familyId);
  if (!story) {
    return Response.json(
      {
        success: false,
        error: {
          code: "NOT_FOUND",
          message: "Story not found",
          retryable: false,
          status: 404,
        },
      },
      { status: 404 }
    );
  }

  // Fetch scenes for the story
  const scenes = await getScenesByStoryId(story.id);

  // Get child info for narrator/childNickname
  const child = story.child_id ? await getChildById(story.child_id) : null;

  // Transform for response
  const structure = story.structure as StoryStructure;
  const responseData = {
    id: story.id,
    title: story.title,
    language: story.language,
    kind: story.kind,
    ageBand: story.age_band,
    childNickname: child?.nickname || structure?.characters?.[0] || "Child",
    interests: child?.interests || structure?.interests || [],
    narrator: "Family",
    structure: {
      title: structure?.title || story.title,
      characters: structure?.characters || [],
      moral: structure?.moral || "",
      scenes: scenes.map((s) => ({
        idx: s.idx,
        text: s.text,
        choices: s.choices || undefined,
      })),
    },
    createdAt: story.created_at,
  };

  return Response.json(
    { success: true, data: responseData },
    { status: 200 }
  );
});

// DELETE /api/stories/[id] - Delete a story
export const DELETE = withErrorHandling(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> => {
  validateSupabaseEnv();

  await requireRouteOrigin(request);
  const { familyId } = await getRouteAuth();
  const { id } = await params;

  await deleteStory(id, familyId);

  return Response.json(
    { success: true, data: { deleted: true, id } },
    { status: 200 }
  );
});

// POST /api/stories/[id]/branch - Branch a story
export const POST = withErrorHandling(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> => {
  validateSupabaseEnv();
  validateLlmEnv();

  await requireRouteOrigin(request);
  const { familyId } = await getRouteAuth();
  const { id: storyId } = await params;

  // Verify story belongs to family
  await assertStoryOfFamily(storyId, familyId);

  // Parse and validate request body
  const input = await parseJsonBodyOrThrow(request, BranchStoryRequestSchema);

  // Fetch the story to get child profile and language
  const story = await getStoryByIdForFamily(storyId, familyId);
  if (!story) {
    return Response.json(
      {
        success: false,
        error: {
          code: "NOT_FOUND",
          message: "Story not found",
          retryable: false,
          status: 404,
        },
      },
      { status: 404 }
    );
  }

  // Get child profile
  const child = story.child_id ? await getChildById(story.child_id) : null;
  if (!child) {
    return Response.json(
      {
        success: false,
        error: {
          code: "NOT_FOUND",
          message: "Child profile not found for story",
          retryable: false,
          status: 404,
        },
      },
      { status: 404 }
    );
  }

  // Fetch existing scenes to count branch points
  const existingScenes = await getScenesByStoryId(storyId);
  const branchCount = existingScenes.filter((s) => s.choices && s.choices.length > 0).length;

  // Enforce branch limit (3)
  if (branchCount >= 3) {
    // Return final scene with moral
    const structure = story.structure as StoryStructure;
    return Response.json(
      {
        success: true,
        data: {
          scenes: [{
            idx: existingScenes.length,
            text: structure?.moral || "And they lived happily ever after.",
            choices: undefined,
          }],
        },
      },
      { status: 200 }
    );
  }

  // Build storySoFar from existing scenes
  const storySoFar = existingScenes.map((s) => ({
    idx: s.idx,
    text: s.text,
    choices: s.choices || undefined,
  }));

  // Call LLM to branch the story
  const newStructure = await branchStory({
    storySoFar,
    choice: input.choice,
    language: story.language,
    childNickname: child.nickname,
    ageBand: child.age_band as "3-5" | "6-8" | "9-10",
    interests: child.interests,
  });

  // Safety check
  const safetyResult = checkStoryStructureSafety(newStructure);
  if (!safetyResult.safe) {
    return Response.json(
      {
        success: false,
        error: {
          code: "SAFETY_VIOLATION",
          message: "Generated branch contains unsafe content",
          retryable: false,
          status: 400,
          details: { reason: safetyResult.reason },
        },
      },
      { status: 400 }
    );
  }

  // Persist new scenes (only the newly generated ones)
  const existingMaxIdx = Math.max(...existingScenes.map((s) => s.idx));
  const newScenes = newStructure.scenes
    .filter((s) => s.idx > existingMaxIdx)
    .map((s) => ({
      storyId,
      idx: s.idx,
      text: s.text,
      choicePrompt: s.choices ? "What happens next?" : null,
      choices: s.choices || null,
    }));

  if (newScenes.length > 0) {
    await createScenes(newScenes);
  }

  // Return only the new scenes
  const responseScenes = newStructure.scenes
    .filter((s) => s.idx > existingMaxIdx)
    .map((s) => ({
      idx: s.idx,
      text: s.text,
      choices: s.choices || undefined,
    }));

  return Response.json(
    { success: true, data: { scenes: responseScenes } },
    { status: 200 }
  );
});