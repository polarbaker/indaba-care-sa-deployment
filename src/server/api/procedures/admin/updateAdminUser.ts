import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { baseProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";
import { getUserFromToken, validateUserRole, hashPassword } from "~/lib/auth";
import { UserRole } from "@prisma/client";

const nannyProfileSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phoneNumber: z.string().optional(),
  location: z.string().optional(),
  bio: z.string().optional(),
  availability: z.string().optional(),
  profileImageUrl: z.string().url().optional().or(z.literal("")),
}).optional();

const parentProfileSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phoneNumber: z.string().optional(),
  address: z.string().optional(),
  profileImageUrl: z.string().url().optional().or(z.literal("")),
}).optional();

const adminProfileSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  department: z.string().optional(),
}).optional();

export const updateAdminUser = baseProcedure
  .input(
    z.object({
      token: z.string(),
      userId: z.string().optional(), // Optional for creating new user
      email: z.string().email(),
      password: z.string().min(6).optional(), // Optional: only update if provided
      role: z.nativeEnum(UserRole),
      nannyProfile: nannyProfileSchema,
      parentProfile: parentProfileSchema,
      adminProfile: adminProfileSchema,
    })
  )
  .mutation(async ({ input }) => {
    const adminUser = await getUserFromToken(input.token);
    validateUserRole(adminUser, ["ADMIN"]);

    const { userId, email, password, role, ...profiles } = input;

    let userData: any = {
      email,
      role,
    };

    if (password) {
      userData.passwordHash = await hashPassword(password);
    }

    // Profile data based on role
    let profileData: any = null;
    if (role === "NANNY" && profiles.nannyProfile) profileData = profiles.nannyProfile;
    if (role === "PARENT" && profiles.parentProfile) profileData = profiles.parentProfile;
    if (role === "ADMIN" && profiles.adminProfile) profileData = profiles.adminProfile;

    if (userId) { // Update existing user
      const existingUser = await db.user.findUnique({ where: { id: userId } });
      if (!existingUser) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User to update not found." });
      }

      // Update User
      const updatedUser = await db.user.update({
        where: { id: userId },
        data: userData,
      });

      // Update Profile
      if (profileData) {
        if (role === "NANNY") {
          await db.nannyProfile.upsert({
            where: { userId },
            update: profileData,
            create: { ...profileData, userId },
          });
        } else if (role === "PARENT") {
          await db.parentProfile.upsert({
            where: { userId },
            update: profileData,
            create: { ...profileData, userId },
          });
        } else if (role === "ADMIN") {
          await db.adminProfile.upsert({
            where: { userId },
            update: profileData,
            create: { ...profileData, userId },
          });
        }
      }
      return { success: true, userId: updatedUser.id };

    } else { // Create new user
      if (!password) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Password is required for new users." });
      }
      const existingUserByEmail = await db.user.findUnique({ where: { email } });
      if (existingUserByEmail) {
        throw new TRPCError({ code: "CONFLICT", message: "User with this email already exists." });
      }

      const createProfileData: any = {};
      if (role === "NANNY" && profileData) createProfileData.nannyProfile = { create: profileData };
      if (role === "PARENT" && profileData) createProfileData.parentProfile = { create: profileData };
      if (role === "ADMIN" && profileData) createProfileData.adminProfile = { create: profileData };
      
      const newUser = await db.user.create({
        data: {
          ...userData,
          ...createProfileData,
        },
      });
      return { success: true, userId: newUser.id };
    }
  });
