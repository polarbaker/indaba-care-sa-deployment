import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { baseProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";
import { getUserFromToken } from "~/lib/auth";

export const syncOperation = baseProcedure
  .input(
    z.object({
      token: z.string(),
      operationType: z.enum(["CREATE", "UPDATE", "DELETE"]),
      modelName: z.string(),
      recordId: z.string(),
      data: z.record(z.unknown()),
    })
  )
  .mutation(async ({ input }) => {
    // Authenticate user
    const user = await getUserFromToken(input.token);
    
    // Log the sync operation
    const syncLog = await db.syncLog.create({
      data: {
        userId: user.id,
        operationType: input.operationType,
        modelName: input.modelName,
        recordId: input.recordId,
        changeData: JSON.stringify(input.data),
        syncStatus: "Pending",
      },
    });
    
    try {
      // Process the sync operation based on the model and operation type
      // This is a simplified implementation - in a real app, you would have specific handlers for each model
      
      switch (input.modelName) {
        case "Observation":
          await processObservationSync(input, user.id);
          break;
        case "Message":
          await processMessageSync(input, user.id);
          break;
        // Add more cases for other models as needed
        default:
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Unsupported model: ${input.modelName}`,
          });
      }
      
      // Update sync log status
      await db.syncLog.update({
        where: { id: syncLog.id },
        data: {
          syncStatus: "Completed",
          syncedAt: new Date(),
        },
      });
      
      return { success: true };
    } catch (error) {
      // Update sync log status
      await db.syncLog.update({
        where: { id: syncLog.id },
        data: {
          syncStatus: "Failed",
        },
      });
      
      throw error;
    }
  });

// Helper function to process Observation sync operations
async function processObservationSync(
  input: {
    operationType: "CREATE" | "UPDATE" | "DELETE";
    recordId: string;
    data: Record<string, unknown>;
  },
  userId: string
) {
  const nannyProfile = await db.nannyProfile.findUnique({
    where: { userId },
  });
  
  if (!nannyProfile) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Only nannies can sync observations",
    });
  }
  
  switch (input.operationType) {
    case "CREATE":
      await db.observation.create({
        data: {
          id: input.recordId, // Use the client-generated ID
          nannyId: nannyProfile.id,
          childId: input.data.childId as string,
          type: input.data.type as "TEXT" | "PHOTO" | "VIDEO" | "AUDIO",
          content: input.data.content as string,
          notes: input.data.notes as string | undefined,
          isPermanent: input.data.isPermanent as boolean | undefined,
          aiTags: input.data.aiTags as string | undefined,
        },
      });
      break;
    case "UPDATE":
      await db.observation.update({
        where: { id: input.recordId },
        data: {
          content: input.data.content as string | undefined,
          notes: input.data.notes as string | undefined,
          isPermanent: input.data.isPermanent as boolean | undefined,
          aiTags: input.data.aiTags as string | undefined,
        },
      });
      break;
    case "DELETE":
      await db.observation.delete({
        where: { id: input.recordId },
      });
      break;
  }
}

// Helper function to process Message sync operations
async function processMessageSync(
  input: {
    operationType: "CREATE" | "UPDATE" | "DELETE";
    recordId: string;
    data: Record<string, unknown>;
  },
  userId: string
) {
  switch (input.operationType) {
    case "CREATE":
      await db.message.create({
        data: {
          id: input.recordId, // Use the client-generated ID
          content: input.data.content as string,
          encryptedContent: input.data.encryptedContent as string | undefined,
          senderId: userId,
          recipientId: input.data.recipientId as string,
          aiSummary: input.data.aiSummary as string | undefined,
        },
      });
      break;
    case "UPDATE":
      await db.message.update({
        where: { id: input.recordId },
        data: {
          isRead: input.data.isRead as boolean | undefined,
        },
      });
      break;
    case "DELETE":
      await db.message.delete({
        where: { id: input.recordId },
      });
      break;
  }
}
