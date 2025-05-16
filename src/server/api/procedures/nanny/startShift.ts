import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { baseProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";
import { getUserFromToken } from "~/lib/auth";

export const startShift = baseProcedure
  .input(
    z.object({
      token: z.string(),
      familyId: z.string().optional(),
      notes: z.string().optional(),
    })
  )
  .mutation(async ({ input }) => {
    // Authenticate user
    const user = await getUserFromToken(input.token);
    
    if (user.role !== "NANNY") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Only nannies can start shifts",
      });
    }
    
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
    
    // Check if there's already an active shift
    const existingShift = await db.activeShift.findFirst({
      where: {
        nannyId: nannyProfile.id,
        endTime: null,
      },
    });
    
    if (existingShift) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "You already have an active shift",
      });
    }
    
    // Validate family if provided
    if (input.familyId) {
      const familyAssignment = await db.nannyFamilyAssignment.findFirst({
        where: {
          nannyId: nannyProfile.id,
          familyId: input.familyId,
          status: "Active",
        },
      });
      
      if (!familyAssignment) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You are not assigned to this family",
        });
      }
    }
    
    // Create the active shift
    const activeShift = await db.activeShift.create({
      data: {
        nannyId: nannyProfile.id,
        startTime: new Date(),
        familyId: input.familyId,
        notes: input.notes,
        breakMinutes: 0,
        isPaused: false,
      },
      include: {
        family: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
    
    return {
      success: true,
      shift: {
        id: activeShift.id,
        startTime: activeShift.startTime.toISOString(),
        startTimeFormatted: activeShift.startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        durationMinutes: 0,
        breakMinutes: 0,
        isPaused: false,
        pauseStartTime: null,
        familyId: activeShift.familyId,
        familyName: activeShift.family?.name || "Unknown Family",
        notes: activeShift.notes || "",
      },
    };
  });
