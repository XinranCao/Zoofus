/** Who was invited and who could not be. */
export interface InviteResult {
  invited: string[];
  failed: string[];
}

/**
 * Invite people one at a time (the rules take one invitation per write). One that fails does not
 * stop the others, and the result says which failed, so only those can be tried again.
 */
export async function inviteEach(
  uids: string[],
  inviteOne: (uid: string) => Promise<void>,
): Promise<InviteResult> {
  const result: InviteResult = { invited: [], failed: [] };
  for (const uid of uids) {
    try {
      await inviteOne(uid);
      result.invited.push(uid);
    } catch (err) {
      console.warn("Could not invite", uid, err);
      result.failed.push(uid);
    }
  }
  return result;
}
