import jwt from "jsonwebtoken";
import { getJwtSecret } from "@/lib/jwt-secret";

export function verifyJWT(req) {
  const token = req.cookies.get("token")?.value;
  if (!token) {
    return null;
  }

  const secret = getJwtSecret();
  try {
    const decoded = jwt.verify(token, secret);
    return decoded;
  } catch (err) {
    console.log(err);
    return null;
  }
}