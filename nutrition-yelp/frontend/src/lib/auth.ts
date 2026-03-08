import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

export interface AuthUser {
  userId: string;
  email: string;
  name: string;
}

interface JWTPayload {
  userId: string;
  email: string;
  name: string;
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get("auth_token")?.value;

    if (!token) {
      return null;
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      console.error("JWT_SECRET is not defined");
      return null;
    }

    const decoded = jwt.verify(token, secret) as JWTPayload;

    return {
      userId: decoded.userId,
      email: decoded.email,
      name: decoded.name,
    };
  } catch (error) {
    console.error("Auth error:", error);
    return null;
  }
}
