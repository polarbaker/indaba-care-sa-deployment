import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { baseProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";
import { getUserFromToken, validateUserRole } from "~/lib/auth";
import { generateObservationTags } from "~/lib/ai";
import { isAIAvailable } from "~/env";

export const createObservation = baseProcedure
  .input(
    z.object({
      token: z.string(),
      childId: z.string(),
      type: z.enum(["TEXT", "PHOTO", "VIDEO", "AUDIO", "CHECKLIST", "RICHTEXT"]),
      content: z.string(),
      notes: z.string().optional(),
      isPermanent: z.boolean().default(true),
      mediaUrl: z.string().optional(), // URL to stored media if type is not TEXT
    })
  )
  .mutation(async ({ input }) => {
    // Authenticate user
    const user = await getUserFromToken(input.token);
    
    // Validate user is a nanny
    validateUserRole(user, ["NANNY"]);
    
    // Get nanny profile
    const nannyProfile = await db.nannyProfile.findUnique({
      where: { userId: user.id },
    });
    
    if (!nannyProfile) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Nanny profile not found",
      });
    }
    
    // Verify child exists and nanny has access
    const child = await db.child.findUnique({
      where: { id: input.childId },
      include: {
        family: {
          include: {
            nannies: {
              where: {
                nannyId: nannyProfile.id,
                status: "Active",
              },
            },
          },
        },
      },
    });
    
    if (!child) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Child not found",
      });
    }
    
    // Check if nanny is assigned to the child's family
    if (!child.family || child.family.nannies.length === 0) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "You don't have permission to create observations for this child",
      });
    }
    
    // Generate AI tags for the observation if AI is available
    let aiTags = null;
    if (isAIAvailable()) {
      try {
        aiTags = await generateObservationTags(input.content, input.type);
      } catch (error) {
        console.error("Error generating AI tags:", error);
        // Continue without tags if AI tagging fails
      }
    } else {
      // Use basic tags when AI is not available
      aiTags = JSON.stringify(["observation", input.type.toLowerCase()]);
    }
    
    // Create the observation
    const observation = await db.observation.create({
      data: {
        nannyId: nannyProfile.id,
        childId: input.childId,
        type: input.type,
        content: input.content,
        notes: input.notes,
        isPermanent: input.isPermanent,
        aiTags,
      },
    });
    
    return observation;
  });