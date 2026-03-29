import prisma from "../prisma";
import { User } from "@/types/user";

export class UserQueries {
  static async createUser(userData: Omit<User, "_key">): Promise<User> {
    const user = await prisma.user.create({
      data: {
        username: userData.username,
        passwordHash: userData.passwordHash,
        createdAt: new Date(userData.createdAt),
        firstLoginAt: userData.firstLoginAt
          ? new Date(userData.firstLoginAt)
          : undefined,
        receivedInitialBlocks: userData.receivedInitialBlocks,
      },
    });

    return {
      _key: user.id,
      username: user.username,
      passwordHash: user.passwordHash,
      createdAt: user.createdAt.toISOString(),
      firstLoginAt: user.firstLoginAt?.toISOString(),
      receivedInitialBlocks: user.receivedInitialBlocks,
    };
  }

  static async findByUsername(username: string): Promise<User | null> {
    const user = await prisma.user.findUnique({
      where: { username },
    });

    if (!user) return null;

    return {
      _key: user.id,
      username: user.username,
      passwordHash: user.passwordHash,
      createdAt: user.createdAt.toISOString(),
      firstLoginAt: user.firstLoginAt?.toISOString(),
      receivedInitialBlocks: user.receivedInitialBlocks,
    };
  }

  static async findById(userId: string): Promise<User | null> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) return null;

    return {
      _key: user.id,
      username: user.username,
      passwordHash: user.passwordHash,
      createdAt: user.createdAt.toISOString(),
      firstLoginAt: user.firstLoginAt?.toISOString(),
      receivedInitialBlocks: user.receivedInitialBlocks,
    };
  }

  static async updateFirstLogin(
    userId: string,
    firstLoginAt: string,
  ): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: { firstLoginAt: new Date(firstLoginAt) },
    });
  }

  static async markInitialBlocksReceived(userId: string): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: { receivedInitialBlocks: true },
    });
  }

  static async getAllUsers(): Promise<User[]> {
    const users = await prisma.user.findMany();

    return users.map((user) => ({
      _key: user.id,
      username: user.username,
      passwordHash: user.passwordHash,
      createdAt: user.createdAt.toISOString(),
      firstLoginAt: user.firstLoginAt?.toISOString(),
      receivedInitialBlocks: user.receivedInitialBlocks,
    }));
  }
}
