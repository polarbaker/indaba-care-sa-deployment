import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { baseProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";
import { getUserFromToken, validateUserRole } from "~/lib/auth";

export const getFamilyDocuments = baseProcedure
  .input(
    z.object({
      token: z.string(),
      familyId: z.string(),
    })
  )
  .query(async ({ input }) => {
    const user = await getUserFromToken(input.token);
    validateUserRole(user, ["PARENT", "NANNY"]); // Nannies might need to view certain documents

    // Ensure parent owns the family or nanny is assigned to it
    if (user.role === "PARENT") {
      const parentProfile = await db.parentProfile.findUnique({
        where: { userId: user.id },
        include: { family: { select: { id: true } } },
      });
      if (parentProfile?.family?.id !== input.familyId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Access denied." });
      }
    } else if (user.role === "NANNY") {
      const nannyProfile = await db.nannyProfile.findUnique({
        where: { userId: user.id },
        include: { assignedFamilies: { where: { familyId: input.familyId } } },
      });
      if (!nannyProfile?.assignedFamilies || nannyProfile.assignedFamilies.length === 0) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Access denied." });
      }
    }

    const documents = await db.familyDocument.findMany({
      where: { familyId: input.familyId },
      orderBy: { createdAt: "desc" },
    });
    return documents;
  });

export const uploadFamilyDocument = baseProcedure
  .input(
    z.object({
      token: z.string(),
      familyId: z.string(),
      name: z.string(),
      type: z.string(),
      fileUrl: z.string().url(),
      description: z.string().optional(),
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
      throw new TRPCError({ code: "FORBIDDEN", message: "You can only upload documents to your own family." });
    }

    const document = await db.familyDocument.create({
      data: {
        familyId: input.familyId,
        name: input.name,
        type: input.type,
        fileUrl: input.fileUrl,
        description: input.description,
      },
    });
    return document;
  });

export const deleteFamilyDocument = baseProcedure
  .input(
    z.object({
      token: z.string(),
      documentId: z.string(),
    })
  )
  .mutation(async ({ input }) => {
    const user = await getUserFromToken(input.token);
    validateUserRole(user, ["PARENT"]);

    const document = await db.familyDocument.findUnique({
      where: { id: input.documentId },
      include: { family: { include: { parent: true } } },
    });

    if (!document) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Document not found." });
    }

    if (document.family.parent.userId !== user.id) {
      throw new TRPCError({ code: "FORBIDDEN", message: "You can only delete documents from your own family." });
    }

    await db.familyDocument.delete({
      where: { id: input.documentId },
    });
    return { success: true };
  });
