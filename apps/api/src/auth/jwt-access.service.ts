import { Injectable } from "@nestjs/common";
import { SignJWT, jwtVerify } from "jose";
import { apiRuntimeEnv } from "../config/api-runtime.js";

export type AccessTokenPayload = {
  sub: string;
  email: string;
  globalRole: string;
};

const textEncoder = new TextEncoder();

@Injectable()
export class JwtAccessService {
  private readonly secretBytes = textEncoder.encode(apiRuntimeEnv.JWT_ACCESS_SECRET);

  private readonly ttlMinutes = apiRuntimeEnv.JWT_ACCESS_TTL_MINUTES;

  async signAccessToken(payload: AccessTokenPayload): Promise<string> {
    return new SignJWT({
      email: payload.email,
      globalRole: payload.globalRole,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject(payload.sub)
      .setIssuedAt()
      .setExpirationTime(`${this.ttlMinutes}m`)
      .sign(this.secretBytes);
  }

  async verifyAccessToken(token: string): Promise<AccessTokenPayload> {
    const { payload } = await jwtVerify(token, this.secretBytes, {
      algorithms: ["HS256"],
    });
    const sub = typeof payload.sub === "string" ? payload.sub : "";
    const email = typeof payload.email === "string" ? payload.email : "";
    const globalRole = typeof payload.globalRole === "string" ? payload.globalRole : "USER";
    if (!sub) {
      throw new Error("Invalid access token subject");
    }
    return { sub, email, globalRole };
  }
}
