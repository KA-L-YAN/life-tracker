import * as Location from 'expo-location';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { HabitRow, QuitRow } from '@/components/habits/habit-row';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { Group } from '@/components/ui/group';
import { HABIT_ICONS, Icon, type IconName } from '@/components/ui/icon';
import { IconButton } from '@/components/ui/icon-button';
import { goBack, Screen, Section } from '@/components/ui/screen';
import { Segmented } from '@/components/ui/segmented';
import { Stepper } from '@/components/ui/stepper';
import { Tap } from '@/components/ui/tap';
import { Fonts, Hues, Radius, Spacing, TILE_COLORS, type TileColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { createHabit, getHabit, type HabitKind, updateHabit } from '@/lib/api/habits';
import { type AutoKind, type AutoRule, describeRule, isAutoRule } from '@/lib/auto';
import { errorMessage } from '@/lib/errors';
import { useThemeMode } from '@/lib/theme-mode';

const noop = () => {};

export default function HabitFormScreen() {
  const theme = useTheme();
  const { scheme } = useThemeMode();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const editing = !!id;

  const [kind, setKind] = useState<HabitKind>('build');
  const [name, setName] = useState('');
  const [note, setNote] = useState('');
  const [icon, setIcon] = useState<IconName>('book');
  const [color, setColor] = useState<TileColor>('lime');
  const [auto, setAuto] = useState<AutoRule | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    getHabit(id).then((h) => {
      if (!h) return;
      setKind(h.kind);
      setName(h.name);
      setNote(h.note ?? '');
      setIcon(HABIT_ICONS.includes(h.icon as IconName) ? (h.icon as IconName) : 'sparkles');
      setColor((TILE_COLORS as string[]).includes(h.color) ? (h.color as TileColor) : 'lime');
      setAuto(isAutoRule(h.auto) ? h.auto : null);
    });
  }, [id]);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const input = { name: name.trim(), note: note.trim() || null, kind, icon, color, auto: kind === 'build' ? auto : null };
      if (id) await updateHabit(id, input);
      else await createHabit(input);
      goBack();
    } catch (err) {
      setError(errorMessage(err, 'Couldn’t save the habit.'));
      setSaving(false);
    }
  }

  const hue = Hues[scheme][color];
  const preview = { id: 'preview', name: name.trim() || 'Your habit', note: note.trim() || null, kind, icon, color, created_at: '', auto: kind === 'build' ? auto : null };
  const inputStyle = [styles.input, { color: theme.text, backgroundColor: theme.surface }];

  return (
    <Screen title={editing ? 'Edit habit' : 'New habit'} right={<IconButton icon="close" label="Close" onPress={goBack} />}>
      <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <Group>
          {kind === 'build' ? (
            <HabitRow habit={preview} done streak={0} onToggle={noop} onOpen={noop} />
          ) : (
            <QuitRow habit={preview} daysClean={0} slipsToday={0} onChange={noop} onOpen={noop} />
          )}
        </Group>
      </View>

      <Section>
        <Segmented
          label="Habit type"
          value={kind}
          onChange={setKind}
          options={[
            { key: 'build', label: 'Build a habit' },
            { key: 'quit', label: 'Quit a habit' },
          ]}
        />
        <ThemedText type="small" themeColor="textSecondary">
          {kind === 'build' ? 'Tick it off each day you do it. Streaks count up.' : 'Log each slip. We count the days in between.'}
        </ThemedText>
      </Section>

      <Section title="Name">
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder={kind === 'build' ? 'Read 20 pages' : 'No phone in bed'}
          placeholderTextColor={theme.textTertiary}
          accessibilityLabel="Habit name"
          maxLength={60}
          style={inputStyle}
        />
        <TextInput
          value={note}
          onChangeText={setNote}
          placeholder="A note, optional (e.g. before 10 pm)"
          placeholderTextColor={theme.textTertiary}
          accessibilityLabel="Habit note, optional"
          maxLength={120}
          style={inputStyle}
        />
      </Section>

      {kind === 'build' && <AutoSection value={auto} onChange={setAuto} />}

      <Section title="Colour">
        <View style={styles.swatches} accessibilityRole="radiogroup" accessibilityLabel="Colour">
          {TILE_COLORS.map((c) => {
            const selected = c === color;
            return (
              <Tap
                key={c}
                onPress={() => setColor(c)}
                scaleTo={0.88}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                accessibilityLabel={c}
                style={[styles.swatchRing, { borderColor: selected ? Hues[scheme][c] : 'transparent' }]}>
                <View style={[styles.swatch, { backgroundColor: Hues[scheme][c] }]} />
              </Tap>
            );
          })}
        </View>
      </Section>

      <Section title="Icon">
        <View style={styles.iconGrid} accessibilityRole="radiogroup" accessibilityLabel="Icon">
          {HABIT_ICONS.map((iconName) => {
            const selected = iconName === icon;
            return (
              <Tap
                key={iconName}
                scaleTo={0.9}
                onPress={() => setIcon(iconName)}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                accessibilityLabel={`${iconName} icon`}
                style={[styles.iconTile, { backgroundColor: selected ? hue : theme.surface }]}>
                <Icon name={iconName} color={selected ? '#FFFFFF' : theme.textSecondary} size={22} weight={selected ? 'fill' : 'regular'} />
              </Tap>
            );
          })}
        </View>
      </Section>

      {error && (
        <ThemedText type="small" color={theme.danger}>
          {error}
        </ThemedText>
      )}
      <Button label={editing ? 'Save changes' : 'Create habit'} onPress={save} loading={saving} disabled={!name.trim()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  autoRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, borderRadius: Radius.medium, paddingLeft: Spacing.three, paddingRight: Spacing.two, paddingVertical: 6 },
  input: { minHeight: 52, borderRadius: Radius.medium, paddingHorizontal: Spacing.three, fontSize: 17, fontFamily: Fonts.regular },
  swatches: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  swatchRing: { width: 44, height: 44, borderRadius: 22, borderWidth: 2.5, alignItems: 'center', justifyContent: 'center' },
  swatch: { width: 32, height: 32, borderRadius: 16 },
  iconGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  iconTile: { width: 52, height: 52, borderRadius: Radius.medium, alignItems: 'center', justifyContent: 'center' },
});

const DEFAULTS: Record<Exclude<AutoKind, 'place'>, { target: number; step: number; min: number; max: number; format: (v: number) => string }> = {
  steps: { target: 8000, step: 500, min: 1000, max: 30000, format: (v) => `${v.toLocaleString()} steps` },
  sleep: { target: 420, step: 30, min: 300, max: 600, format: (v) => `${v / 60} h` },
  water: { target: 8, step: 1, min: 1, max: 20, format: (v) => `${v} glasses` },
  focus: { target: 60, step: 10, min: 10, max: 300, format: (v) => `${v} min` },
  workout: { target: 30, step: 5, min: 5, max: 180, format: (v) => `${v} min` },
};
const KINDS: { key: AutoKind | 'off'; label: string }[] = [
  { key: 'off', label: 'Off' },
  { key: 'steps', label: 'Steps' },
  { key: 'place', label: 'A place' },
  { key: 'workout', label: 'Workout' },
  { key: 'focus', label: 'Focus' },
  { key: 'sleep', label: 'Sleep' },
  { key: 'water', label: 'Water' },
];

/** Pick what ticks the habit for you: a step count, a place you go, a workout, focus time… */
function AutoSection({ value, onChange }: { value: AutoRule | null; onChange: (rule: AutoRule | null) => void }) {
  const theme = useTheme();
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function pick(kind: AutoKind | 'off') {
    setError(null);
    if (kind === 'off') return onChange(null);
    if (kind === 'place') return here();
    onChange({ kind, target: DEFAULTS[kind].target });
  }

  async function here(radius = 150) {
    setLocating(true);
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (!perm.granted) throw new Error('Allow location to set a place.');
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      onChange({ kind: 'place', lat: pos.coords.latitude, lng: pos.coords.longitude, radius });
    } catch (err) {
      setError(errorMessage(err, 'Couldn’t get your location.'));
    } finally {
      setLocating(false);
    }
  }

  return (
    <Section title="Tick it automatically">
      <View style={styles.chips}>
        {KINDS.map((k) => (
          <Chip key={k.key} label={k.label} selected={(value?.kind ?? 'off') === k.key} onPress={() => pick(k.key)} />
        ))}
      </View>
      {value && value.kind !== 'place' && (
        <View style={[styles.autoRow, { backgroundColor: theme.surface }]}>
          <ThemedText type="body" style={styles.fill}>
            Target
          </ThemedText>
          <Stepper
            label="Target"
            value={value.target}
            onChange={(target) => onChange({ ...value, target })}
            step={DEFAULTS[value.kind].step}
            min={DEFAULTS[value.kind].min}
            max={DEFAULTS[value.kind].max}
            format={DEFAULTS[value.kind].format}
          />
        </View>
      )}
      {value?.kind === 'place' && (
        <View style={[styles.autoRow, { backgroundColor: theme.surface }]}>
          <ThemedText type="body" style={styles.fill}>
            Counts within
          </ThemedText>
          <Stepper label="Distance" value={value.radius} onChange={(radius) => onChange({ ...value, radius })} step={50} min={50} max={500} format={(v) => `${v} m`} />
        </View>
      )}
      <ThemedText type="small" themeColor="textSecondary">
        {locating
          ? 'Finding where you are…'
          : value
            ? `${describeRule(value)}.${value.kind === 'place' ? ' Set to where you are now; on Android it ticks even with the app closed while route tracking is on.' : ''}`
            : 'Off: you tick it yourself.'}
      </ThemedText>
      {value?.kind === 'place' && <Button label="Use where I am now" icon="locate" variant="secondary" compact onPress={() => here(value.radius)} loading={locating} />}
      {error && (
        <ThemedText type="small" color={theme.danger}>
          {error}
        </ThemedText>
      )}
    </Section>
  );
}
