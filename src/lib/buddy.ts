export type BuddyMood = 'happy' | 'calm' | 'wow' | 'sleepy';

export type BuddyContext = {
  hour: number;
  habitsDone: number;
  habitsTotal: number;
  slipsToday: number;
  focusMinutes: number;
  focusGoal: number;
  meals: number;
  mood: number | null;
  steps: number;
  stepGoal: number;
  /** Last night, in minutes; 0 when not logged. */
  sleepMinutes: number;
  water: number;
  waterGoal: number;
};

export type BuddyNote = { text: string; mood: BuddyMood };

/** Pick from a pool by the date, so the line changes day to day but not on every render. */
function pick(pool: string[], seed: number) {
  return pool[Math.abs(seed) % pool.length];
}

/** Stable per calendar day (YYYYMMDD). */
export function daySeed(d: Date) {
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
}

/** The situation decides the pool; the most specific situation wins. */
export function buddyNote(ctx: BuddyContext, seed: number): BuddyNote {
  const allDone = ctx.habitsTotal > 0 && ctx.habitsDone === ctx.habitsTotal;
  const goalHit = ctx.focusGoal > 0 && ctx.focusMinutes >= ctx.focusGoal;
  if (ctx.slipsToday > 0) {
    return {
      mood: 'calm',
      text: pick(['A slip is one moment, not the whole day.', 'Noted, and moving on. The next hour is still yours.', 'Counting slips is how the streak comes back. Well logged.'], seed),
    };
  }
  if (ctx.mood !== null && ctx.mood <= 2) {
    return { mood: 'calm', text: pick(['Low day. Water, a short walk, an early night. Small counts.', 'Be kind to yourself today. One tiny thing is enough.'], seed) };
  }
  if (ctx.hour < 11 && ctx.sleepMinutes > 0 && ctx.sleepMinutes < 360) {
    return { mood: 'sleepy', text: pick(['Short night. Go gently and get some daylight early.', 'Under six hours of sleep. Keep today simple.'], seed) };
  }
  if (allDone && goalHit) {
    return { mood: 'wow', text: pick(['Every habit ticked and the focus goal hit. Rare air.', 'A full day, done properly. Take the evening off.'], seed) };
  }
  if (allDone) return { mood: 'wow', text: pick(['Every habit ticked. That’s the whole list.', 'Clean sweep on habits today.'], seed) };
  if (goalHit) {
    return { mood: 'happy', text: pick(['Focus goal reached. Your brain earned a walk.', 'That’s the study time in. Anything more is a bonus.'], seed) };
  }
  if (ctx.stepGoal > 0 && ctx.steps >= ctx.stepGoal) {
    return { mood: 'happy', text: pick(['Step goal done. Your legs have earned a sit.', `${ctx.steps.toLocaleString()} steps. That’s the walking done.`], seed) };
  }
  if (ctx.hour >= 14 && ctx.hour < 20 && ctx.waterGoal > 0 && ctx.water < ctx.waterGoal / 2) {
    return { mood: 'calm', text: `Water check: ${ctx.water} of ${ctx.waterGoal} glasses so far.` };
  }
  if (ctx.hour < 11) {
    return { mood: 'happy', text: pick(['Morning. One small thing first.', 'New day, clean slate. Start with breakfast.', 'Good morning. What’s the one thing that matters today?'], seed) };
  }
  if (ctx.hour >= 20 && ctx.meals === 0 && ctx.habitsDone === 0) {
    return { mood: 'sleepy', text: pick(['Quiet day? Log one meal before bed.', 'Nothing logged yet. Even one entry keeps the thread.'], seed) };
  }
  if (ctx.hour >= 20) return { mood: 'sleepy', text: pick(['Winding down. Anything left to tick off?', 'Evening. A good time to note how today felt.'], seed) };
  return {
    mood: 'happy',
    text: pick(['Steady going. Tick things off as they happen.', 'Halfway through the day. How’s it looking?', 'Small entries add up to a clear picture.'], seed),
  };
}
