import { z } from "zod";
import { UuidSchema } from "./general.schema";

/*
model User {
  id Uuid @id @default(uuid())

  kindeId String @unique

  email     String?
  firstName String?
  lastName  String?
  imageUrl  String?

  globalRole GlobalRole @default(USER)

  createdAt DateTime @default(now())
  updatedAt temporal.updatedAt()

  memberships StoreMembership[]
  purchases Purchase[]

  @@index([email])
}
*/

export const GlobalRole = z.enum({
    USER: "USER",
    ADMIN: "ADMIN"
})

export const GetUserSchema = z.object({
    id: UuidSchema,
    kindeId: z.string(),

    email: z.email(),
    firstName: z.string().nullable(),
    lastName: z.string().nullable(),

    imageUrl: z.string().nullable(),

    globalRole: GlobalRole.default("USER"),

    createdAt: z.instanceof(Temporal.Instant),
    updatedAt: z.instanceof(Temporal.Instant),
})

export type GetUser = z.infer<typeof GetUserSchema>

export const CreateUserSchema = GetUserSchema.omit({
    id: true, createdAt: true, updatedAt: true
});

export type CreateUserInput = z.infer<typeof CreateUserSchema>

export const UpdateUserSchema = CreateUserSchema.extend({
    id: UuidSchema.readonly(),
    kindeId: z.string().readonly(),
})

export type UpdateUserInput = z.infer<typeof UpdateUserSchema>
