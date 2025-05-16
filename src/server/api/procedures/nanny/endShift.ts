import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { baseProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";
import { getUserFromToken } from "~/lib/auth";

export const endShift = baseProcedure
  .input(
    z.object({
      token: z.string(),
      notes: z.string().optional(),
    })
  )
  .mutation(async ({ input }) => {
    // Authenticate user
    const user = await getUserFromToken(input.token);
    
    if (user.role !== "NANNY") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Only nannies can end shifts",
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
    });
    
    if (!activeShift) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "No active shift found",
      });
    }
    
    // If shift is paused, resume it first
    if (activeShift.isPaused && activeShift.pauseStartTime) {
      const pauseDuration = Math.floor(
        (new Date().getTime() - activeShift.pauseStartTime.getTime()) / (1000 * 60)
      );
      
      // Update break minutes
      await db.activeShift.update({
        where: { id: activeShift.id },
        data: {
          breakMinutes: (activeShift.breakMinutes || 0) + pauseDuration,
          isPaused: false,
          pauseStartTime: null,
        },
      });
    }
    
    // Get the updated shift after potential pause handling
    const updatedShift = await db.activeShift.findUnique({
      where: { id: activeShift.id },
    });
    
    if (!updatedShift) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to update shift",
      });
    }
    
    // Calculate duration
    const startTime = new Date(updatedShift.startTime);
    const endTime = new Date();
    const totalMinutes = Math.floor((endTime.getTime() - startTime.getTime()) / (1000 * 60));
    const durationMinutes = totalMinutes - (updatedShift.breakMinutes || 0);
    
    if (durationMinutes <= 0) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Shift duration must be greater than 0 after subtracting breaks",
      });
    }
    
    // Check if this is overtime (more than 8 hours in a day)
    const isOvertime = durationMinutes > 480; // 8 hours = 480 minutes
    
    // Format times for the hours log
    const formattedStartTime = startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    const formattedEndTime = endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    
    // Merge notes if provided
    const mergedNotes = input.notes
      ? updatedShift.notes
        ? `${updatedShift.notes}\n\nEnd notes: ${input.notes}`
        : input.notes
      : updatedShift.notes;
    
    // Create hours log from the shift
    const hoursLog = await db.hoursLog.create({
      data: {
        nannyId: nannyProfile.id,
        date: new Date(startTime.setHours(0, 0, 0, 0)), // Set to start of day
        startTime: formattedStartTime,
        endTime: formattedEndTime,
        durationMinutes,
        breakMinutes: updatedShift.breakMinutes || 0,
        familyId: updatedShift.familyId,
        notes: mergedNotes,
        isOvertime,
        isManualEntry: false,
        status: "PENDING",
      },
    });
    
    // End the active shift
    await db.activeShift.update({
      where: { id: activeShift.id },
      data: {
        endTime,
        notes: mergedNotes,
      },
    });
    
    return {
      success: true,
      hoursLog: {
        id: hoursLog.id,
        date: hoursLog.date.toISOString(),
        startTime: hoursLog.startTime,
        endTime: hoursLog.endTime,
        durationMinutes: hoursLog.durationMinutes,
        breakMinutes: hoursLog.breakMinutes || 0,
        notes: hoursLog.notes || "",
        familyId: hoursLog.familyId,
        isOvertime: hoursLog.isOvertime || false,
        status: hoursLog.status,
      },
    };
  });
