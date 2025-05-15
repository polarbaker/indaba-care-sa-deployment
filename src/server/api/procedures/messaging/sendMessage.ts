import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { baseProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";
import { getUserFromToken } from "~/lib/auth";
import { summarizeMessages } from "~/lib/ai";
import { isAIAvailable } from "~/env";

export const sendMessage = baseProcedure
  .input(
    z.object({
      token: z.string(),
      recipientId: z.string(),
      content: z.string(),
      encryptedContent: z.string().optional(),
      childId: z.string().optional(), // Optional reference to a child
      generateSummary: z.boolean().default(false), // Whether to generate an AI summary
    })
  )
  .mutation(async ({ input }) => {
    // Authenticate user
    const user = await getUserFromToken(input.token);
    
    // Verify recipient exists
    const recipient = await db.user.findUnique({
      where: { id: input.recipientId },
    });
    
    if (!recipient) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Recipient not found",
      });
    }
    
    // Create the message
    const message = await db.message.create({
      data: {
        content: input.content,
        encryptedContent: input.encryptedContent,
        senderId: user.id,
        recipientId: input.recipientId,
      },
    });
    
    // Generate AI summary if requested, a child is specified, and AI is available
    if (input.generateSummary && input.childId && isAIAvailable()) {
      try {
        // Get the child's name
        const child = await db.child.findUnique({
          where: { id: input.childId },
          select: { firstName: true },
        });
        
        if (child) {
          // Get recent conversation history (last 5 messages between these users)
          const recentMessages = await db.message.findMany({
            where: {
              OR: [
                { senderId: user.id, recipientId: input.recipientId },
                { senderId: input.recipientId, recipientId: user.id },
              ],
            },
            orderBy: { createdAt: "desc" },
            take: 5,
            include: {
              sender: {
                select: {
                  nannyProfile: { select: { firstName: true } },
                  parentProfile: { select: { firstName: true } },
                },
              },
            },
          });
          
          // Format messages for the AI
          const formattedMessages = recentMessages.map(msg => {
            const senderName = msg.sender.nannyProfile?.firstName || 
                              msg.sender.parentProfile?.firstName || 
                              "User";
            return {
              content: msg.content,
              senderName,
            };
          });
          
          // Generate summary
          const summary = await summarizeMessages(formattedMessages, child.firstName);
          
          // Update the message with the summary if one was generated
          if (summary && summary.trim() !== "") {
            await db.message.update({
              where: { id: message.id },
              data: { aiSummary: summary },
            });
            
            // Return the updated message
            return {
              ...message,
              aiSummary: summary,
            };
          }
        }
      } catch (error) {
        console.error("Error generating message summary:", error);
        // Continue without summary if generation fails
      }
    }
    
    return message;
  });