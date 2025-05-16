import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { baseProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";
import { getUserFromToken } from "~/lib/auth";

export const getCurrentShift = baseProcedure
  .input(
    z.object({
      token: z.string(),
    })
  )
  .query(async ({ input }) => {
    // Authenticate user
    const user = await getUserFromToken(input.token);
    
    if (user.role !== "NANNY") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Only nannies can access shift information",
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
    
    // Check for active shift
    const activeShift = await db.activeShift.findFirst({
      where: {
        nannyId: nannyProfile.id,
        endTime: null, // Not ended yet
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
    
    if (!activeShift) {
      return {
        hasActiveShift: false,
      };
    }
    
    // Calculate current duration
    const startTime = new Date(activeShift.startTime);
    const now = new Date();
    const durationMinutes = Math.floor((now.getTime() - startTime.getTime()) / (1000 * 60));
    
    return {
      hasActiveShift: true,
      shift: {
        id: activeShift.id,
        startTime: activeShift.startTime.toISOString(),
        startTimeFormatted: activeShift.startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        durationMinutes,
        breakMinutes: activeShift.breakMinutes || 0,
        isPaused: activeShift.isPaused || false,
        pauseStartTime: activeShift.pauseStartTime ? activeShift.pauseStartTime.toISOString() : null,
        familyId: activeShift.familyId,
        familyName: activeShift.family?.name || "Unknown Family",
        notes: activeShift.notes || "",
      },
    };
  });
