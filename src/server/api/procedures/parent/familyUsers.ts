import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { baseProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";
import { getUserFromToken, validateUserRole } from "~/lib/auth";
import crypto from "crypto";

export const getFamilyUsers = baseProcedure
  .input(
    z.object({
      token: z.string(),
      familyId: z.string(),
    })
  )
  .query(async ({ input }) => {
    const user = await getUserFromToken(input.token);
    validateUserRole(user, ["PARENT"]);

    const parentProfile = await db.parentProfile.findUnique({
      where: { userId: user.id },
      include: { family: { select: { id: true } } },
    });

    if (parentProfile?.family?.id !== input.familyId) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Access denied." });
    }

    // Fetch parent users associated with the family
    // This is a simplified version. A more robust way would be to link users to a family directly
    // or infer from ParentProfile.familyId. For now, we list the primary parent.
    // The ParentAccounts component will need to be adapted based on how parent users are truly linked.
    const primaryParentUser = await db.user.findUnique({
      where: { id: parentProfile.userId },
      select: { 
        id: true, 
        email: true, 
        parentProfile: { select: { firstName: true, lastName: true, profileImageUrl: true } },
        // lastLogin: true, // Assuming lastLogin is added to User model
      }
    });
    
    const parentUsers = primaryParentUser ? [{
      id: primaryParentUser.id,
      email: primaryParentUser.email,
      firstName: primaryParentUser.parentProfile?.firstName || "",
      lastName: primaryParentUser.parentProfile?.lastName || "",
      profileImageUrl: primaryParentUser.parentProfile?.profileImageUrl,
      // lastLogin: primaryParentUser.lastLogin?.toISOString(), // Convert Date to string
      accessLevel: "full" as "full" | "view_only", // Primary parent has full access
      role: "PARENT" as "PARENT",
    }] : [];


    const invitations = await db.parentInvitation.findMany({
      where: { familyId: input.familyId, status: "pending" },
      orderBy: { createdAt: "desc" },
    });

    return { parentUsers, invitations };
  });

export const inviteParent = baseProcedure
  .input(
    z.object({
      token: z.string(),
      familyId: z.string(),
      email: z.string().email(),
      role: z.enum(["full", "view_only"]),
    })
  )
  .mutation(async ({ input }) => {
    const user = await getUserFromToken(input.token);
    validateUserRole(user, ["PARENT"]);

    const parentProfile = await db.parentProfile.findUnique({
      where: { userId: user.id },
      include: { family: { select: { id: true } } },
    });

    if (parentProfile?.family?.id !== input.familyId) {
      throw new TRPCError({ code: "FORBIDDEN", message: "You can only invite parents to your own family." });
    }

    // Check if user already exists or has a pending invitation
    const existingUser = await db.user.findUnique({ where: { email: input.email } });
    if (existingUser) {
      // Potentially link existing user to family if they are not already part of it
      // For now, we'll throw an error if they exist.
      throw new TRPCError({ code: "BAD_REQUEST", message: "User with this email already exists." });
    }

    const existingInvitation = await db.parentInvitation.findFirst({
      where: { email: input.email, familyId: input.familyId, status: "pending" },
    });
    if (existingInvitation) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "An invitation already exists for this email." });
    }

    const invitationToken = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const invitation = await db.parentInvitation.create({
      data: {
        familyId: input.familyId,
        email: input.email,
        role: input.role,
        status: "pending",
        token: invitationToken,
        expiresAt,
      },
    });

    // TODO: Send email with invitation link (e.g., using an email service)
    // `Invitation link: /auth/accept-invitation?token=${invitationToken}`

    return invitation;
  });

export const resendParentInvitation = baseProcedure
  .input(z.object({ token: z.string(), invitationId: z.string() }))
  .mutation(async ({ input }) => {
    const user = await getUserFromToken(input.token);
    validateUserRole(user, ["PARENT"]);

    const invitation = await db.parentInvitation.findUnique({
      where: { id: input.invitationId },
      include: { family: { include: { parent: true } } },
    });

    if (!invitation) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Invitation not found." });
    }
    if (invitation.family.parent.userId !== user.id) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Access denied." });
    }
    if (invitation.status !== "pending") {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Invitation is not pending." });
    }

    const newInvitationToken = crypto.randomBytes(32).toString("hex");
    const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const updatedInvitation = await db.parentInvitation.update({
      where: { id: input.invitationId },
      data: {
        token: newInvitationToken,
        expiresAt: newExpiresAt,
      },
    });

    // TODO: Resend email with new invitation link
    
    return updatedInvitation;
  });

export const cancelParentInvitation = baseProcedure
  .input(z.object({ token: z.string(), invitationId: z.string() }))
  .mutation(async ({ input }) => {
    const user = await getUserFromToken(input.token);
    validateUserRole(user, ["PARENT"]);

    const invitation = await db.parentInvitation.findUnique({
      where: { id: input.invitationId },
      include: { family: { include: { parent: true } } },
    });

    if (!invitation) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Invitation not found." });
    }
    if (invitation.family.parent.userId !== user.id) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Access denied." });
    }

    await db.parentInvitation.delete({
      where: { id: input.invitationId },
    });

    return { success: true };
  });
