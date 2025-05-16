import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { baseProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";
import { getUserFromToken, validateUserRole } from "~/lib/auth";

// Define the certification schema for validation
const certificationSchema = z.object({
  id: z.string().optional(), // Only required for update/delete
  name: z.string().min(1, "Certification name is required"),
  issuingAuthority: z.string().min(1, "Issuing authority is required"),
  dateIssued: z.string().refine(val => !isNaN(Date.parse(val)), {
    message: "Invalid date issued format",
  }),
  expiryDate: z.string().refine(val => !isNaN(Date.parse(val)), {
    message: "Invalid expiry date format",
  }).optional(),
  certificateUrl: z.string().url("Invalid URL format").optional(),
  status: z.enum(["Active", "Expired", "Pending"]),
});

export const manageCertification = baseProcedure
  .input(
    z.object({
      token: z.string(),
      operation: z.enum(["CREATE", "UPDATE", "DELETE"]),
      certification: certificationSchema,
    })
  )
  .mutation(async ({ input }) => {
    // Authenticate user
    const user = await getUserFromToken(input.token);
    
    // Validate user is a nanny
    validateUserRole(user, ["NANNY"]);
    
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
    
    // Process based on operation type
    switch (input.operation) {
      case "CREATE":
        return await db.certification.create({
          data: {
            nannyId: nannyProfile.id,
            name: input.certification.name,
            issuingAuthority: input.certification.issuingAuthority,
            dateIssued: new Date(input.certification.dateIssued),
            expiryDate: input.certification.expiryDate ? new Date(input.certification.expiryDate) : null,
            certificateUrl: input.certification.certificateUrl,
            status: input.certification.status,
          },
        });
        
      case "UPDATE":
        if (!input.certification.id) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Certification ID is required for update",
          });
        }
        
        // Verify the certification belongs to this nanny
        const existingCert = await db.certification.findUnique({
          where: { id: input.certification.id },
        });
        
        if (!existingCert || existingCert.nannyId !== nannyProfile.id) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You don't have permission to update this certification",
          });
        }
        
        return await db.certification.update({
          where: { id: input.certification.id },
          data: {
            name: input.certification.name,
            issuingAuthority: input.certification.issuingAuthority,
            dateIssued: new Date(input.certification.dateIssued),
            expiryDate: input.certification.expiryDate ? new Date(input.certification.expiryDate) : null,
            certificateUrl: input.certification.certificateUrl,
            status: input.certification.status,
          },
        });
        
      case "DELETE":
        if (!input.certification.id) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Certification ID is required for delete",
          });
        }
        
        // Verify the certification belongs to this nanny
        const certToDelete = await db.certification.findUnique({
          where: { id: input.certification.id },
        });
        
        if (!certToDelete || certToDelete.nannyId !== nannyProfile.id) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You don't have permission to delete this certification",
          });
        }
        
        return await db.certification.delete({
          where: { id: input.certification.id },
        });
        
      default:
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid operation",
        });
    }
  });
