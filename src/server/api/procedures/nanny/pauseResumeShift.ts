import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { baseProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";
import { getUserFromToken } from "~/lib/auth";

export const pauseResumeShift = baseProcedure
  .input(
    z.object({
      token: z.string(),
      action: z.enum(["pause", "resume"]),
    })
  )
  .mutation(async ({ input }) => {
    // Authenticate user
    const user = await getUserFromToken(input.token);
    
    if (user.role !== "NANNY") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Only nannies can pause/resume shifts",
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
    
    // Get the active shift
    const activeShift = await db.activeShift.findFirst({
      where: {
        nannyId: nannyProfile.id,
        endTime: null,
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
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "No active shift found",
      });
    }
    
    if (input.action === "pause") {
      // Cannot pause an already paused shift
      if (activeShift.isPaused) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Shift is already paused",
        });
      }
      
      // Pause the shift
      const updatedShift = await db.activeShift.update({
        where: { id: activeShift.id },
        data: {
          isPaused: true,
          pauseStartTime: new Date(),
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
      
      // Calculate current duration (excluding breaks)
      const startTime = new Date(updatedShift.startTime);
      const now = new Date();
      const totalMinutes = Math.floor((now.getTime() - startTime.getTime()) / (1000 * 60));
      const durationMinutes = totalMinutes - (updatedShift.breakMinutes || 0);
      
      return {
        success: true,
        action: "paused",
        shift: {
          id: updatedShift.id,
          startTime: updatedShift.startTime.toISOString(),
          startTimeFormatted: updatedShift.startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          durationMinutes,
          breakMinutes: updatedShift.breakMinutes || 0,
          isPaused: true,
          pauseStartTime: updatedShift.pauseStartTime?.toISOString() || null,
          familyId: updatedShift.familyId,
          familyName: updatedShift.family?.name || "Unknown Family",
          notes: updatedShift.notes || "",
        },
      };
    } else {
      // Cannot resume a shift that's not paused
      if (!activeShift.isPaused || !activeShift.pauseStartTime) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Shift is not paused",
        });
      }
      
      // Calculate pause duration
      const pauseDuration = Math.floor(
        (new Date().getTime() - activeShift.pauseStartTime.getTime()) / (1000 * 60)
      );
      
      // Resume the shift and update break minutes
      const updatedShift = await db.activeShift.update({
        where: { id: activeShift.id },
        data: {
          isPaused: false,
          pauseStartTime: null,
          breakMinutes: (activeShift.breakMinutes || 0) + pauseDuration,
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
      
      // Calculate current duration (excluding breaks)
      const startTime = new Date(updatedShift.startTime);
      const now = new Date();
      const totalMinutes = Math.floor((now.getTime() - startTime.getTime()) / (1000 * 60));
      const durationMinutes = totalMinutes - updatedShift.breakMinutes;
      
      return {
        success: true,
        action: "resumed",
        pauseDuration,
        shift: {
          id: updatedShift.id,
          startTime: updatedShift.startTime.toISOString(),
          startTimeFormatted: updatedShift.startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          durationMinutes,
          breakMinutes: updatedShift.breakMinutes,
          isPaused: false,
          pauseStartTime: null,
          familyId: updatedShift.familyId,
          familyName: updatedShift.family?.name || "Unknown Family",
          notes: updatedShift.notes || "",
        },
      };
    }
  });
