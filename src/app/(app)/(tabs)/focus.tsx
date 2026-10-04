import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { FocusMusic, openSpotify, useFocusPlaylist } from '@/components/focus-music';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Group, Row } from '@/components/ui/group';
import { IconButton } from '@/components/ui/icon-button';
import { Mesh } from '@/components/ui/mesh';
import { ProgressRing } from '@/components/ui/progress-ring';
import { Screen, Section } from '@/components/ui/screen';
import { useToast } from '@/components/ui/toast';
import { WeekStrip } from '@/components/ui/week-strip';
import { Fonts, Hues, Radius, Spacing, Tracker } from '@/constants/theme';
import { useAsyncData } from '@/hooks/use-async-data';
import { useLayout } from '@/hooks/use-layout';
import { useStopwatch } from '@/hooks/use-stopwatch';
import { useTheme } from '@/hooks/use-theme';
import { addStudySession, deleteStudySession, listStudyWeek, type StudySession } from '@/lib/api/study';
import { addDays, formatDayLabel, isSameDay, localDateString } from '@/lib/day';
import { formatDuration, formatMinutes } from '@/lib/format';
import { useProfile } from '@/lib/profile';
import { useThemeMode } from '@/lib/theme-mode';

export default function FocusScreen() {
  const theme = useTheme();
  const { scheme } = useThemeMode();
  const { twoUp, size } = useLayout();
  const toast = useToast();
  const { profile } = useProfile();
  const goal = profile?.focus_goal_minutes ?? 60;
  const [day, setDay] = useState(() => new Date());
  const [topicDraft, setTopicDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const { isRunning, elapsedMs, topic, start, stop } = useStopwatch();
  const music = useFocusPlaylist();

  const fetcher = useCallback(() => listStudyWeek(day), [day]);
  const { data: week, refetch } = useAsyncData(fetcher);

  // A finished session should appear in the ring and list straight away.
  const wasRunning = useRef(isRunning);
  useEffect(() => {
    if (wasRunning.current && !isRunning) refetch();
    wasRunning.current = isRunning;
  }, [isRunning, refetch]);

  async function toggle() {
    setBusy(true);
    try {
      if (isRunning) await stop();
      else {
        await start(topicDraft.trim() || null);
        if (music.autoplay && music.ref) openSpotify(music.ref).catch(() => {});
      }
    } finally {
      setBusy(false);
    }
  }

  async function remove(session: StudySession) {
    await deleteStudySession(session.id);
    refetch();
    toast('Session deleted', {
      label: 'Undo',
      onPress: () => addStudySession(new Date(session.started_at), new Date(session.ended_at), session.topic).then(refetch),
    });
  }

  const hue = Hues[scheme][Tracker.focus];
  const sessions = week ?? [];
  const dayKey = localDateString(day);
  const isToday = isSameDay(day, new Date());
  const minutesOn = (key: string) => sessions.filter((s) => localDateString(new Date(s.started_at)) === key).reduce((sum, s) => sum + s.duration_seconds, 0) / 60;
  const daySessions = sessions.filter((s) => localDateString(new Date(s.started_at)) === dayKey);
  const dayMinutes = minutesOn(dayKey);
  // While the timer runs, the ring fills live on today.
  const ringMinutes = dayMinutes + (isRunning && isToday ? elapsedMs / 60000 : 0);
  const bars = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(day, i - 6);
    const key = localDateString(d);
    return { d, key, minutes: minutesOn(key) };
  });
  const barMax = Math.max(goal, ...bars.map((b) => b.minutes), 1);
  const weekTotal = bars.reduce((s, b) => s + b.minutes, 0);
  const left = Math.max(0, goal - dayMinutes);
  const ringSize = size === 'phone' ? 240 : 280;

  const timer = (
    <View style={[styles.hero, { borderColor: theme.border }]}>
      <Mesh />
      <ProgressRing progress={ringMinutes / goal} size={ringSize} stroke={14} color={hue} track={theme.glass}>
        <View style={styles.clock} accessibilityRole="timer" accessibilityLabel={isRunning ? `Running: ${formatDuration(elapsedMs)}` : `${formatMinutes(dayMinutes)} of ${goal} minutes`}>
          {/* Past an hour the clock gains a digit group, so it steps down a size to stay inside the ring. */}
          <ThemedText type={isRunning && elapsedMs >= 3600000 ? 'hero' : 'number'} style={styles.tabular}>
            {isRunning ? formatDuration(elapsedMs) : Math.round(dayMinutes)}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {isRunning ? (topic ? `on ${topic}` : 'focusing') : `of ${goal} min`}
          </ThemedText>
        </View>
      </ProgressRing>
      <View style={styles.controls}>
        {!isRunning && (
          <TextInput
            value={topicDraft}
            onChangeText={setTopicDraft}
            placeholder="What are you studying?"
            placeholderTextColor={theme.textTertiary}
            accessibilityLabel="What you are studying, optional"
            style={[styles.topic, { color: theme.text, backgroundColor: theme.glass }]}
            returnKeyType="go"
            maxLength={60}
            onSubmitEditing={toggle}
          />
        )}
        <Button label={isRunning ? 'Finish session' : 'Start focus'} icon={isRunning ? 'stop' : 'play'} onPress={toggle} loading={busy} />
      </View>
    </View>
  );

  const history = (
    <View style={[styles.col, twoUp && styles.half]}>
      <WeekStrip day={day} onChange={setDay} />
      <View style={[styles.card, { backgroundColor: theme.surface }]}>
        <View style={styles.cardHead}>
          <View>
            <ThemedText type="title" style={styles.tabular}>
              {formatMinutes(dayMinutes)}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {left === 0 ? `Goal reached ${isToday ? 'today' : 'that day'}` : `${formatMinutes(left)} to go`}
            </ThemedText>
          </View>
          <View style={styles.right}>
            <ThemedText type="bodyStrong" style={styles.tabular}>
              {formatMinutes(weekTotal)}
            </ThemedText>
            <ThemedText type="caption" themeColor="textTertiary">
              in 7 days
            </ThemedText>
          </View>
        </View>
        <View accessibilityRole="image" accessibilityLabel={`Last 7 days: ${bars.map((b) => `${Math.round(b.minutes)} minutes`).join(', ')}`}>
          <View style={styles.bars}>
            {/* Dashed line at the daily goal. */}
            <View style={[styles.goalLine, { bottom: `${(goal / barMax) * 100}%`, borderColor: theme.textTertiary }]} />
            {bars.map((b) => (
              <View key={b.key} style={styles.barTrack}>
                <View style={[styles.bar, { height: `${Math.max(3, (b.minutes / barMax) * 100)}%`, backgroundColor: b.minutes > 0 ? hue : theme.fog, opacity: b.key === dayKey || b.minutes === 0 ? 1 : 0.55 }]} />
              </View>
            ))}
          </View>
          <View style={styles.labels}>
            {bars.map((b) => (
              <ThemedText key={b.key} type="caption" themeColor={b.key === dayKey ? 'text' : 'textTertiary'} style={styles.label}>
                {b.d.toLocaleDateString(undefined, { weekday: 'narrow' })}
              </ThemedText>
            ))}
          </View>
        </View>
      </View>

      <Section title={isToday ? 'Today’s sessions' : `Sessions on ${formatDayLabel(day)}`}>
        {daySessions.length === 0 ? (
          <ThemedText type="small" themeColor="textSecondary">
            No sessions yet. Start the timer when you sit down to study.
          </ThemedText>
        ) : (
          <Group>
            {daySessions.map((session) => (
              <Row
                key={session.id}
                title={session.topic || 'Focus session'}
                subtitle={`${new Date(session.started_at).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })} to ${new Date(session.ended_at).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`}
                trailing={
                  <View style={styles.trailing}>
                    <ThemedText type="smallStrong" style={styles.tabular}>
                      {formatMinutes(session.duration_seconds / 60)}
                    </ThemedText>
                    <IconButton icon="trash" label="Delete session" variant="bare" color={theme.textTertiary} size={17} onPress={() => remove(session)} />
                  </View>
                }
              />
            ))}
          </Group>
        )}
      </Section>
    </View>
  );

  return (
    <Screen title="Focus" subtitle={`Goal: ${goal} minutes a day`} tabbed>
      {twoUp ? (
        <View style={styles.twoUp}>
          <View style={[styles.col, twoUp && styles.half]}>
            {timer}
            <FocusMusic />
          </View>
          {history}
        </View>
      ) : (
        <>
          {timer}
          <FocusMusic />
          {history}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  tabular: { fontVariant: ['tabular-nums'] },
  twoUp: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.four },
  col: { gap: Spacing.four },
  half: { flex: 1, minWidth: 0 },
  hero: {
    borderRadius: Radius.sheet,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    alignItems: 'center',
    padding: Spacing.four,
    gap: Spacing.four,
  },
  clock: { alignItems: 'center' },
  controls: { alignSelf: 'stretch', gap: 12 },
  topic: { textAlign: 'center', fontFamily: Fonts.regular, fontSize: 17, borderRadius: Radius.medium, minHeight: 50, paddingHorizontal: Spacing.three },
  card: { borderRadius: Radius.large, padding: Spacing.three, gap: Spacing.four },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  right: { alignItems: 'flex-end' },
  bars: { flexDirection: 'row', height: 100, gap: 8 },
  goalLine: { position: 'absolute', left: 0, right: 0, borderTopWidth: 1, borderStyle: 'dashed' },
  barTrack: { flex: 1, justifyContent: 'flex-end' },
  labels: { flexDirection: 'row', gap: 8, marginTop: 6 },
  label: { flex: 1, textAlign: 'center' },
  bar: { width: '100%', borderRadius: 6 },
  trailing: { flexDirection: 'row', alignItems: 'center', gap: 2 },
});
