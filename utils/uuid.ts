import { UuidSchema } from "@/zod/general.schema";

export const isUuid = (id: string) =>  UuidSchema.safeParse(id).success;