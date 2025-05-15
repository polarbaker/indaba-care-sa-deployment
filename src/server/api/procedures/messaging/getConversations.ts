import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { baseProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";
import { getUserFromToken } from "~/lib/auth";

export const getConversations = baseProcedure
  .input(
    z.object({
      token: z.string(),
    })
  )
  .query(async ({ input }) => {
    // Authenticate user
    const user = await getUserFromToken(input.token);
    
    // Get all users the current user has exchanged messages with
    const conversations = await db.$queryRaw`
      SELECT 
        DISTINCT
        CASE 
          WHEN m.sender_id = ${user.id} THEN m.recipient_id
          ELSE m.sender_id
        END as user_id,
        MAX(m.created_at) as last_message_at
      FROM "Message" m
      WHERE m.sender_id = ${user.id} OR m.recipient_id = ${user.id}
      GROUP BY user_id
      ORDER BY last_message_at DESC
    `;
    
    // If no conversations found, return empty array
    if (!Array.isArray(conversations) || conversations.length === 0) {
      return [];
    }
    
    // Get user IDs from conversations
    const userIds = conversations.map((conv: any) => conv.user_id);
    
    // Get user details for all conversation partners
    const users = await db.user.findMany({
      where: {
        id: { in: userIds },
      },
      include: {
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
    });
    
    // Get last message and unread count for each conversation
    const conversationsWithDetails = await Promise.all(
      userIds.map(async (userId) => {
        // Get the last message
        const lastMessage = await db.message.findFirst({
          where: {
            OR: [
              { senderId: user.id, recipientId: userId },
              { senderId: userId, recipientId: user.id },
            ],
          },
          orderBy: {
            createdAt: "desc",
          },
        });
        
        // Count unread messages
        const unreadCount = await db.message.count({
          where: {
            senderId: userId,
            recipientId: user.id,
            isRead: false,
          },
        });
        
        // Find the user details
        const conversationPartner = users.find(u => u.id === userId);
        
        if (!conversationPartner || !lastMessage) {
          return null;
        }
        
        // Get name and profile image based on role
        let name = "";
        let profileImageUrl = null;
        
        if (conversationPartner.nannyProfile) {
          name = `${conversationPartner.nannyProfile.firstName} ${conversationPartner.nannyProfile.lastName}`;
          profileImageUrl = conversationPartner.nannyProfile.profileImageUrl;
        } else if (conversationPartner.parentProfile) {
          name = `${conversationPartner.parentProfile.firstName} ${conversationPartner.parentProfile.lastName}`;
          profileImageUrl = conversationPartner.parentProfile.profileImageUrl;
        } else if (conversationPartner.adminProfile) {
          name = `${conversationPartner.adminProfile.firstName} ${conversationPartner.adminProfile.lastName}`;
        }
        
        return {
          userId,
          name,
          role: conversationPartner.role,
          profileImageUrl,
          lastMessage: {
            id: lastMessage.id,
            content: lastMessage.content,
            createdAt: lastMessage.createdAt,
            isFromUser: lastMessage.senderId === user.id,
          },
          unreadCount,
        };
      })
    );
    
    // Filter out null values and sort by last message date
    return conversationsWithDetails
      .filter(Boolean)
      .sort((a, b) => 
        new Date(b!.lastMessage.createdAt).getTime() - 
        new Date(a!.lastMessage.createdAt).getTime()
      );
  });
