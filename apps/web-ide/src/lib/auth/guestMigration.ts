'use client';

/**
 * Guest-to-Cloud Progress Auto-Migration Utility
 * Seamlessly transfers local browser progress (completed lessons, code drafts, XP, streak)
 * into the learner's persistent Neon Postgres account upon authentication.
 */
export async function migrateGuestProgress(
  targetUserId: string,
  userMeta?: { name?: string; email?: string; avatarUrl?: string }
): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  if (!targetUserId || targetUserId === 'guest') return false;

  try {
    const guestCompletedIds: string[] = [];
    const guestDrafts: Record<string, any> = {};
    const guestAccepted: Record<string, any> = {};

    // 1. Scan localStorage for guest completion, drafts, and accepted solutions
    const prefixCompleted = 'beamforge_completed_guest_';
    const prefixDraft = 'beamforge_draft_guest_';
    const prefixAccepted = 'beamforge_accepted_guest_';

    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k) continue;

      if (k.startsWith(prefixCompleted)) {
        const lid = k.replace(prefixCompleted, '');
        if (lid && !guestCompletedIds.includes(lid)) {
          guestCompletedIds.push(lid);
        }
      } else if (k.startsWith(prefixDraft)) {
        const exId = k.replace(prefixDraft, '');
        try {
          const files = JSON.parse(localStorage.getItem(k) || '{}');
          if (exId && files && Object.keys(files).length > 0) {
            guestDrafts[exId] = files;
          }
        } catch {}
      } else if (k.startsWith(prefixAccepted)) {
        const exId = k.replace(prefixAccepted, '');
        try {
          const files = JSON.parse(localStorage.getItem(k) || '{}');
          if (exId && files && Object.keys(files).length > 0) {
            guestAccepted[exId] = files;
          }
        } catch {}
      }
    }

    // Check beamforge_user_guest for any additional cached metadata
    let guestXp = 0;
    let guestStreak = 1;
    const guestUserRaw = localStorage.getItem('beamforge_user_guest');
    if (guestUserRaw) {
      try {
        const gu = JSON.parse(guestUserRaw);
        if (Array.isArray(gu.completedLevelIds)) {
          gu.completedLevelIds.forEach((id: string) => {
            if (!guestCompletedIds.includes(id)) guestCompletedIds.push(id);
          });
        }
        if (gu.totalXp) guestXp = Number(gu.totalXp);
        if (gu.streakDays) guestStreak = Number(gu.streakDays);
      } catch {}
    }

    const hasGuestProgress = guestCompletedIds.length > 0 || Object.keys(guestDrafts).length > 0 || Object.keys(guestAccepted).length > 0;
    if (!hasGuestProgress && !userMeta) {
      return false;
    }

    // 2. Send migration payload to backend Neon DB endpoint
    try {
      const res = await fetch('/api/user-progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'migrate_guest',
          targetUserId,
          name: userMeta?.name,
          email: userMeta?.email,
          avatarUrl: userMeta?.avatarUrl,
          guestData: {
            completedLevelIds: guestCompletedIds,
            drafts: guestDrafts,
            acceptedFiles: guestAccepted,
            totalXp: guestXp,
            streakDays: guestStreak,
          },
        }),
      });
      if (!res.ok) {
        console.warn('[Migration] Backend migration returned non-OK response:', res.status);
      }
    } catch (apiErr) {
      console.warn('[Migration] API network sync notice (offline mode fallback):', apiErr);
    }

    // 3. Immediately copy to user-scoped localStorage so progress is accessible without reload
    guestCompletedIds.forEach((lid) => {
      try { localStorage.setItem(`beamforge_completed_${targetUserId}_${lid}`, 'true'); } catch {}
    });
    Object.entries(guestDrafts).forEach(([exId, files]) => {
      try { localStorage.setItem(`beamforge_draft_${targetUserId}_${exId}`, JSON.stringify(files)); } catch {}
    });
    Object.entries(guestAccepted).forEach(([exId, files]) => {
      try { localStorage.setItem(`beamforge_accepted_${targetUserId}_${exId}`, JSON.stringify(files)); } catch {}
    });

    // Update target user profile in localStorage with meta if present
    const existingRaw = localStorage.getItem(`beamforge_user_${targetUserId}`);
    let targetProfile = existingRaw ? JSON.parse(existingRaw) : {};
    if (userMeta?.name) targetProfile.name = userMeta.name;
    if (userMeta?.email) targetProfile.email = userMeta.email;
    if (userMeta?.avatarUrl) targetProfile.avatarUrl = userMeta.avatarUrl;
    if (Object.keys(targetProfile).length > 0) {
      try { localStorage.setItem(`beamforge_user_${targetUserId}`, JSON.stringify(targetProfile)); } catch {}
    }

    // 4. Purge migrated guest keys to prevent redundant future migrations
    guestCompletedIds.forEach((lid) => {
      try { localStorage.removeItem(`beamforge_completed_guest_${lid}`); } catch {}
    });
    Object.keys(guestDrafts).forEach((exId) => {
      try { localStorage.removeItem(`beamforge_draft_guest_${exId}`); } catch {}
    });
    Object.keys(guestAccepted).forEach((exId) => {
      try { localStorage.removeItem(`beamforge_accepted_guest_${exId}`); } catch {}
    });
    try { localStorage.removeItem('beamforge_user_guest'); } catch {}

    return true;
  } catch (err) {
    console.warn('[Migration] Error migrating guest progress:', err);
    return false;
  }
}
