import { PrismaClient } from "@prisma/client";

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error("Please define the DATABASE_URL environment variable");
}

type GlobalDB = {
  prismaConn: PrismaClient | null;
  prismaPromise: Promise<PrismaClient> | null;
};

const globalForDB = global as unknown as {
  __prismaDB?: GlobalDB;
};

if (!globalForDB.__prismaDB) {
  globalForDB.__prismaDB = {
    prismaConn: null,
    prismaPromise: null,
  };
}

const db = globalForDB.__prismaDB;

const connectDB = async (): Promise<PrismaClient> => {
  if (db?.prismaConn) {
    return db.prismaConn;
  }

  if (!db?.prismaPromise) {
    const prisma = new PrismaClient();

    db!.prismaPromise = prisma
      .$connect()
      .then(() => prisma)
      .catch((err: unknown) => {
        console.error("PostgreSQL connection error:", err);
        db!.prismaPromise = null;
        throw err;
      });
  }

  db!.prismaConn = await db!.prismaPromise;
  return db!.prismaConn;
};

export default connectDB;
