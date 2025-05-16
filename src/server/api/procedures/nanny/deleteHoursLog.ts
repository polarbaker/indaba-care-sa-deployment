import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { baseProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";
import { getUserFromToken } from "~/lib/auth";

export const deleteHoursLog = baseProcedure
  .input(
    z.object({
      token: z.string(),
      hoursLogId: z.string(),
    })
  )
  .mutation(async ({ input }) => {
    // Authenticate user
    const user = await getUserFromToken(input.token);
    
    if (user.role !== "NANNY") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Only nannies can delete hours logs",
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
    
    // Get the hours log to delete
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
        message: "You can only delete your own hours logs",
      });
    }
    
    // Cannot delete approved logs
    if (hoursLog.status === "APPROVED") {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Cannot delete approved hours logs",
      });
    }
    
    // Create audit entry for the deletion
    await db.hoursLogAudit.create({
      data: {
        hoursLogId: hoursLog.id,
        userId: user.id,
        action: "DELETE",
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
    
    // Delete the hours log
    await db.hoursLog.delete({
      where: { id: input.hoursLogId },
    });
    
    return {
      success: true,
    };
  });
