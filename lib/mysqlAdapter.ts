import { Pool, RowDataPacket } from "mysql2/promise";
import type { Adapter, AdapterUser, AdapterAccount, AdapterSession, VerificationToken } from "next-auth/adapters";
import crypto from "crypto";

export function MySqlAdapter(pool: Pool): Adapter {
  return {
    async createUser(user: Omit<AdapterUser, "id">): Promise<AdapterUser> {
      const id = crypto.randomUUID();
      const email = user.email ? user.email.toLowerCase().trim() : null;
      const name = user.name ?? null;
      const image = user.image ?? null;
      const emailVerified = user.emailVerified ? new Date(user.emailVerified) : null;

      await pool.execute(
        `INSERT INTO users (id, name, email, emailVerified, image) VALUES (?, ?, ?, ?, ?)`,
        [id, name, email, emailVerified, image]
      );

      return {
        id,
        name,
        email: email as string,
        emailVerified,
        image,
      };
    },

    async getUser(id: string): Promise<AdapterUser | null> {
      const [rows] = await pool.execute<RowDataPacket[]>(
        `SELECT id, name, email, emailVerified, image FROM users WHERE id = ? LIMIT 1`,
        [id]
      );
      if (!rows || rows.length === 0) return null;
      const r = rows[0];
      return {
        id: r.id,
        name: r.name,
        email: r.email,
        emailVerified: r.emailVerified ? new Date(r.emailVerified) : null,
        image: r.image,
      };
    },

    async getUserByEmail(email: string): Promise<AdapterUser | null> {
      const normalized = email.toLowerCase().trim();
      const [rows] = await pool.execute<RowDataPacket[]>(
        `SELECT id, name, email, emailVerified, image FROM users WHERE email = ? LIMIT 1`,
        [normalized]
      );
      if (!rows || rows.length === 0) return null;
      const r = rows[0];
      return {
        id: r.id,
        name: r.name,
        email: r.email,
        emailVerified: r.emailVerified ? new Date(r.emailVerified) : null,
        image: r.image,
      };
    },

    async getUserByAccount({
      provider,
      providerAccountId,
    }: {
      provider: string;
      providerAccountId: string;
    }): Promise<AdapterUser | null> {
      const [rows] = await pool.execute<RowDataPacket[]>(
        `SELECT u.id, u.name, u.email, u.emailVerified, u.image
         FROM account a
         INNER JOIN users u ON a.userId = u.id
         WHERE a.provider = ? AND a.providerAccountId = ?
         LIMIT 1`,
        [provider, providerAccountId]
      );
      if (!rows || rows.length === 0) return null;
      const r = rows[0];
      return {
        id: r.id,
        name: r.name,
        email: r.email,
        emailVerified: r.emailVerified ? new Date(r.emailVerified) : null,
        image: r.image,
      };
    },

    async updateUser(user: Partial<AdapterUser> & Pick<AdapterUser, "id">): Promise<AdapterUser> {
      const existing = await this.getUser!(user.id);
      if (!existing) throw new Error("User not found");

      const name = user.name !== undefined ? user.name : existing.name;
      const email = user.email !== undefined ? user.email.toLowerCase().trim() : existing.email;
      const emailVerified =
        user.emailVerified !== undefined
          ? user.emailVerified
            ? new Date(user.emailVerified)
            : null
          : existing.emailVerified;
      const image = user.image !== undefined ? user.image : existing.image;

      await pool.execute(
        `UPDATE users SET name = ?, email = ?, emailVerified = ?, image = ? WHERE id = ?`,
        [name ?? null, email ?? null, emailVerified ?? null, image ?? null, user.id]
      );

      return {
        id: user.id,
        name: name ?? null,
        email: email as string,
        emailVerified: emailVerified ?? null,
        image: image ?? null,
      };
    },

    async deleteUser(userId: string): Promise<void> {
      await pool.execute(`DELETE FROM users WHERE id = ?`, [userId]);
    },

    async linkAccount(account: AdapterAccount): Promise<AdapterAccount> {
      await pool.execute(
        `INSERT INTO account (
          userId, type, provider, providerAccountId, refresh_token, access_token,
          expires_at, token_type, scope, id_token, session_state
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          account.userId,
          account.type,
          account.provider,
          account.providerAccountId,
          account.refresh_token ?? null,
          account.access_token ?? null,
          account.expires_at ?? null,
          account.token_type ?? null,
          account.scope ?? null,
          account.id_token ?? null,
          account.session_state ?? null,
        ]
      );
      return account;
    },

    async unlinkAccount({
      provider,
      providerAccountId,
    }: {
      provider: string;
      providerAccountId: string;
    }): Promise<void> {
      await pool.execute(
        `DELETE FROM account WHERE provider = ? AND providerAccountId = ?`,
        [provider, providerAccountId]
      );
    },

    async createSession(session: {
      sessionToken: string;
      userId: string;
      expires: Date;
    }): Promise<AdapterSession> {
      await pool.execute(
        `INSERT INTO session (sessionToken, userId, expires) VALUES (?, ?, ?)`,
        [session.sessionToken, session.userId, new Date(session.expires)]
      );
      return session;
    },

    async getSessionAndUser(sessionToken: string): Promise<{
      session: AdapterSession;
      user: AdapterUser;
    } | null> {
      const [rows] = await pool.execute<RowDataPacket[]>(
        `SELECT
          s.sessionToken, s.userId, s.expires,
          u.id, u.name, u.email, u.emailVerified, u.image
         FROM session s
         INNER JOIN users u ON s.userId = u.id
         WHERE s.sessionToken = ?
         LIMIT 1`,
        [sessionToken]
      );
      if (!rows || rows.length === 0) return null;
      const r = rows[0];
      return {
        session: {
          sessionToken: r.sessionToken,
          userId: r.userId,
          expires: new Date(r.expires),
        },
        user: {
          id: r.id,
          name: r.name,
          email: r.email,
          emailVerified: r.emailVerified ? new Date(r.emailVerified) : null,
          image: r.image,
        },
      };
    },

    async updateSession(
      session: Partial<AdapterSession> & Pick<AdapterSession, "sessionToken">
    ): Promise<AdapterSession | null | undefined> {
      if (session.expires) {
        await pool.execute(
          `UPDATE session SET expires = ? WHERE sessionToken = ?`,
          [new Date(session.expires), session.sessionToken]
        );
      }
      const [rows] = await pool.execute<RowDataPacket[]>(
        `SELECT sessionToken, userId, expires FROM session WHERE sessionToken = ? LIMIT 1`,
        [session.sessionToken]
      );
      if (!rows || rows.length === 0) return null;
      const r = rows[0];
      return {
        sessionToken: r.sessionToken,
        userId: r.userId,
        expires: new Date(r.expires),
      };
    },

    async deleteSession(sessionToken: string): Promise<void> {
      await pool.execute(`DELETE FROM session WHERE sessionToken = ?`, [sessionToken]);
    },

    async createVerificationToken(token: VerificationToken): Promise<VerificationToken> {
      await pool.execute(
        `INSERT INTO verificationToken (identifier, token, expires) VALUES (?, ?, ?)`,
        [token.identifier, token.token, new Date(token.expires)]
      );
      return token;
    },

    async useVerificationToken({
      identifier,
      token,
    }: {
      identifier: string;
      token: string;
    }): Promise<VerificationToken | null> {
      const [rows] = await pool.execute<RowDataPacket[]>(
        `SELECT identifier, token, expires FROM verificationToken WHERE identifier = ? AND token = ? LIMIT 1`,
        [identifier, token]
      );
      if (!rows || rows.length === 0) return null;
      await pool.execute(
        `DELETE FROM verificationToken WHERE identifier = ? AND token = ?`,
        [identifier, token]
      );
      const r = rows[0];
      return {
        identifier: r.identifier,
        token: r.token,
        expires: new Date(r.expires),
      };
    },
  };
}
