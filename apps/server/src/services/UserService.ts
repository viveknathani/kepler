import { eq } from 'drizzle-orm';
import { users } from '../database/schema';
import { newId } from '../database';
import type { AppState } from '../state';

export class UserService {
  constructor(private readonly state: AppState) {}

  async findOrCreateByClerkId(clerkId: string, email = '') {
    const [existing] = await this.state.database
      .select()
      .from(users)
      .where(eq(users.clerkId, clerkId))
      .limit(1);
    if (existing) return existing;
    const [created] = await this.state.database
      .insert(users)
      .values({ id: newId('user'), clerkId, email })
      .returning();
    if (!created) throw new Error('failed to create user');
    return created;
  }
}
