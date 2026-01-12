import connectDB from "@/utils/database/db";

export const prisma = async () => {
  return await connectDB();
};
