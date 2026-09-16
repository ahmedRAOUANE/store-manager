import { z } from "zod";

import "temporal-polyfill/full/global";

export const UuidSchema = z.uuid();

export type UuidType = z.infer<typeof UuidSchema>;