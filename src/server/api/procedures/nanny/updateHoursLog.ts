import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { baseProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";
import { getUserFromToken } from "~/lib/auth";

export const updateHoursLog = baseProcedure
  .input(
    z.object({
      token: z.string(),
      hoursLogId: z.string(),
      date: z.string().datetime().optional(),
      startTime: z.string().optional(), // Format: "HH:MM"
      endTime: z.string().optional(),   // Format: "HH:MM"
      breakMinutes: z.number().min(0).optional(),
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
        message: "Only nannies can update hours logs",
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
    
    // Get the hours log to update
    const hoursLog = await db.hoursLog.findUnique({
      where: { id: input.hoursLogId },
    });
    
    if (!hoursLog) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Hours log not found",
      });
    }
    
    // Ensure the nanny owns this hours log
    if (hoursLog.nannyId !== nannyProfile.id) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "You can only update your own hours logs",
      });
    }
    
    // Cannot update approved or rejected logs
    if (hoursLog.status === "APPROVED" || hoursLog.status === "REJECTED") {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Cannot update hours log with status: ${hoursLog.status}`,
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
    
    // Prepare update data
    const updateData: any = {};
    
    if (input.date) {
      updateData.date = new Date(input.date);
    }
    
    if (input.startTime || input.endTime) {
      // Get current values for any missing inputs
      const startTime = input.startTime || hoursLog.startTime;
      const endTime = input.endTime || hoursLog.endTime;
      
      // Calculate new duration
      const [startHours, startMinutes] = startTime.split(":").map(Number);
      const [endHours, endMinutes] = endTime.split(":").map(Number);
      
      let durationMinutes = (endHours * 60 + endMinutes) - (startHours * 60 + startMinutes);
      
      // Handle case where end time is on the next day
      if (durationMinutes < 0) {
        durationMinutes += 24 * 60; // Add 24 hours in minutes
      }
      
      // Subtract break time
      const breakMinutes = input.breakMinutes !== undefined ? input.breakMinutes : hoursLog.breakMinutes || 0;
      durationMinutes -= breakMinutes;
      
      if (durationMinutes <= 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Duration must be greater than 0 after subtracting breaks",
        });
      }
      
      // Check if this is overtime (more than 8 hours in a day)
      const isOvertime = durationMinutes > 480; // 8 hours = 480 minutes
      
      // Update the fields
      updateData.startTime = startTime;
      updateData.endTime = endTime;
      updateData.durationMinutes = durationMinutes;
      updateData.breakMinutes = breakMinutes;
      updateData.isOvertime = isOvertime;
    } else if (input.breakMinutes !== undefined) {
      // Only break minutes changed, recalculate duration
      const durationMinutes = hoursLog.durationMinutes + (hoursLog.breakMinutes || 0) - input.breakMinutes;
      
      if (durationMinutes <= 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Duration must be greater than 0 after subtracting breaks",
        });
      }
      
      // Check if this is overtime (more than 8 hours in a day)
      const isOvertime = durationMinutes > 480; // 8 hours = 480 minutes
      
      updateData.durationMinutes = durationMinutes;
      updateData.breakMinutes = input.breakMinutes;
      updateData.isOvertime = isOvertime;
    }
    
    if (input.familyId) {
      updateData.familyId = input.familyId;
    }
    
    if (input.notes !== undefined) {
      updateData.notes = input.notes;
    }
    
    // Set status back to pending if it was previously rejected
    if (hoursLog.status === "REJECTED") {
      updateData.status = "PENDING";
    }
    
    // Create audit entry for the update
    await db.hoursLogAudit.create({
      data: {
        hoursLogId: hoursLog.id,
        userId: user.id,
        action: "UPDATE",
        previousData: JSON.stringify({
          date: hoursLog.date,
          startTime: hoursLog.startTime,
          endTime: hoursLog.endTime,
          durationMinutes: hoursLog.durationMinutes,
          breakMinutes: hoursLog.breakMinutes,
          familyId: hoursLog.familyId,
          notes: hoursLog.notes,
          status: hoursLog.status,
        }),
      },
    });
    
    // Update the hours log
    const updatedHoursLog = await db.hoursLog.update({
      where: { id: input.hoursLogId },
      data: updateData,
    });
    
    return {
      success: true,
      hoursLog: {
        id: updatedHoursLog.id,
        date: updatedHoursLog.date.toISOString(),
        startTime: updatedHoursLog.startTime,
        endTime: updatedHoursLog.endTime,
        durationMinutes: updatedHoursLog.durationMinutes,
        breakMinutes: updatedHoursLog.breakMinutes || 0,
        notes: updatedHoursLog.notes || "",
        familyId: updatedHoursLog.familyId,
        isOvertime: updatedHoursLog.isOvertime || false,
        status: updatedHoursLog.status || "PENDING",
      },
    };
  });
