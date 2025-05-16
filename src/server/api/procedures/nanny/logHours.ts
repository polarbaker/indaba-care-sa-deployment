import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { baseProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";
import { getUserFromToken } from "~/lib/auth";

export const logHours = baseProcedure
  .input(
    z.object({
      token: z.string(),
      date: z.string().datetime(),
      startTime: z.string(), // Format: "HH:MM"
      endTime: z.string(),   // Format: "HH:MM"
      breakMinutes: z.number().min(0).default(0),
      familyId: z.string().optional(),
      notes: z.string().optional(),
      isManualEntry: z.boolean().default(true),
    })
  )
  .mutation(async ({ input }) => {
    // Authenticate user
    const user = await getUserFromToken(input.token);
    
    if (user.role !== "NANNY") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Only nannies can log hours",
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
    
    // Calculate duration in minutes
    const [startHours, startMinutes] = input.startTime.split(":").map(Number);
    const [endHours, endMinutes] = input.endTime.split(":").map(Number);
    
    let durationMinutes = (endHours * 60 + endMinutes) - (startHours * 60 + startMinutes);
    
    // Handle case where end time is on the next day
    if (durationMinutes < 0) {
      durationMinutes += 24 * 60; // Add 24 hours in minutes
    }
    
    // Subtract break time
    durationMinutes -= input.breakMinutes;
    
    if (durationMinutes <= 0) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Duration must be greater than 0 after subtracting breaks",
      });
    }
    
    // Check if this is overtime (more than 8 hours in a day)
    const isOvertime = durationMinutes > 480; // 8 hours = 480 minutes
    
    // Create the hours log
    const hoursLog = await db.hoursLog.create({
      data: {
        nannyId: nannyProfile.id,
        date: new Date(input.date),
        startTime: input.startTime,
        endTime: input.endTime,
        durationMinutes,
        breakMinutes: input.breakMinutes,
        familyId: input.familyId,
        notes: input.notes,
        isOvertime,
        isManualEntry: input.isManualEntry,
        status: "PENDING", // Default status
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
        breakMinutes: hoursLog.breakMinutes,
        notes: hoursLog.notes || "",
        familyId: hoursLog.familyId,
        isOvertime: hoursLog.isOvertime,
        status: hoursLog.status,
      },
    };
  });
