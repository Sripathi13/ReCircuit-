import { db } from './index.ts';
import { users, userProfiles } from './schema.ts';
import { eq } from 'drizzle-orm';

export async function getOrCreateUser(uid: string, email: string, fullName?: string, role: string = 'USER') {
  try {
    const cleanEmail = email.trim().toLowerCase();
    const existingByEmail = await db
      .select()
      .from(users)
      .where(eq(users.email, cleanEmail))
      .limit(1);

    if (existingByEmail.length > 0) {
      const user = existingByEmail[0];
      if (user.uid !== uid) {
        const updated = await db
          .update(users)
          .set({ uid, updatedAt: new Date() })
          .where(eq(users.id, user.id))
          .returning();
        return updated[0];
      }
      return user;
    }

    const result = await db
      .insert(users)
      .values({
        uid,
        email: cleanEmail,
        fullName: fullName || cleanEmail.split('@')[0],
        role,
        emailVerifiedAt: new Date(),
        accountStatus: 'ACTIVE',
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: {
          email: cleanEmail,
          updatedAt: new Date(),
        },
      })
      .returning();

    const createdUser = result[0];

    await db
      .insert(userProfiles)
      .values({
        userId: createdUser.id,
        city: 'Coimbatore',
        state: 'Tamil Nadu',
        pinCode: '641012',
        approximateLocality: 'RS Puram',
      })
      .onConflictDoNothing();

    return createdUser;
  } catch (error) {
    console.error('Database query failed in getOrCreateUser:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

export async function getUserById(id: number) {
  try {
    const rows = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return rows[0] || null;
  } catch (error) {
    console.error('Database query failed in getUserById:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

export async function getUserByUid(uid: string) {
  try {
    const rows = await db.select().from(users).where(eq(users.uid, uid)).limit(1);
    return rows[0] || null;
  } catch (error) {
    console.error('Database query failed in getUserByUid:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

export async function getUserByEmail(email: string) {
  try {
    const rows = await db
      .select()
      .from(users)
      .where(eq(users.email, email.trim().toLowerCase()))
      .limit(1);
    return rows[0] || null;
  } catch (error) {
    console.error('Database query failed in getUserByEmail:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}
