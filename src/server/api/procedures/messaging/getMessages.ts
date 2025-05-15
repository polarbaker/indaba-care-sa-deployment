import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { baseProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";
import { getUserFromToken } from "~/lib/auth";

export const getMessages = baseProcedure
  .input(
    z.object({
      token: z.string(),
      otherUserId: z.string(),
      cursor: z.string().optional(),
      limit: z.number().min(1).max(100).default(20),
      markAsRead: z.boolean().default(true),
    })
  )
  .query(async ({ input }) => {
    // Authenticate user
    const user = await getUserFromToken(input.token);
    
    // Verify other user exists
    const otherUser = await db.user.findUnique({
      where: { id: input.otherUserId },
    });
    
    if (!otherUser) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "User not found",
      });
    }
    
    // Get messages with pagination
    const messages = await db.message.findMany({
      where: {
        OR: [
          { senderId: user.id, recipientId: input.otherUserId },
          { senderId: input.otherUserId, recipientId: user.id },
        ],
      },
      take: input.limit + 1, // Take one extra to determine if there are more
      cursor: input.cursor ? { id: input.cursor } : undefined,
      orderBy: {
        createdAt: "desc", // Most recent first
      },
      include: {
        sender: {
          select: {
            id: true,
            role: true,
            nannyProfile: {
              select: {
                firstName: true,
                lastName: true,
                profileImageUrl: true,
              },
            },
            parentProfile: {
              select: {
                firstName: true,
                lastName: true,
                profileImageUrl: true,
              },
            },
            adminProfile: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });
    
    // Check if there are more results
    const hasMore = messages.length > input.limit;
    const data = hasMore ? messages.slice(0, input.limit) : messages;
    
    // Get the next cursor
    const nextCursor = hasMore ? data[data.length - 1].id : undefined;
    
    // Mark unread messages as read if requested
    if (input.markAsRead) {
      await db.message.updateMany({
        where: {
          senderId: input.otherUserId,
          recipientId: user.id,
          isRead: false,
        },
        data: {
          isRead: true,
        },
      });
    }
    
    // Format the messages for the frontend
    const formattedMessages = data.map(message => {
      // Get sender name and profile image
      let senderName = "";
      let senderProfileImageUrl = null;
      
      if (message.sender.nannyProfile) {
        senderName = `${message.sender.nannyProfile.firstName} ${message.sender.nannyProfile.lastName}`;
        senderProfileImageUrl = message.sender.nannyProfile.profileImageUrl;
      } else if (message.sender.parentProfile) {
        senderName = `${message.sender.parentProfile.firstName} ${message.sender.parentProfile.lastName}`;
        senderProfileImageUrl = message.sender.parentProfile.profileImageUrl;
      } else if (message.sender.adminProfile) {
        senderName = `${message.sender.adminProfile.firstName} ${message.sender.adminProfile.lastName}`;
      }
      
      return {
        id: message.id,
        content: message.content,
        encryptedContent: message.encryptedContent,
        aiSummary: message.aiSummary,
        isRead: message.isRead,
        createdAt: message.createdAt,
        isFromUser: message.senderId === user.id,
        sender: {
          id: message.sender.id,
          name: senderName,
          role: message.sender.role,
          profileImageUrl: senderProfileImageUrl,
        },
      };
    });
    
    return {
      data: formattedMessages,
      nextCursor,
    };
  });
