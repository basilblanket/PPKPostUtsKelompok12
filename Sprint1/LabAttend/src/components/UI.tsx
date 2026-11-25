import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SessionStatus } from '../types';
export const colors = { navy: '#132F53', blue: '#2563EB', light: '#EAF2FF', bg: '#F5F7FB', muted: '#738196', line: '#E5EAF1', green: '#12805C', red: '#C34B52' };
export const ui = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.bg }, content: { width: '100%', maxWidth: 1080, alignSelf: 'center', padding: 24, paddingBottom: 36, gap: 24 },
  title: { color: colors.navy, fontSize: 28, fontWeight: '700', letterSpacing: -0.8 }, subtitle: { color: colors.muted, fontSize: 14, lineHeight: 22 },
  heading: { color: colors.navy, fontSize: 19, fontWeight: '700' }, text: { color: colors.navy, fontSize: 14, lineHeight: 22 },
  card: { backgroundColor: '#FFF', borderRadius: 18, padding: 20, borderWidth: 1, borderColor: colors.line, gap: 14 }, row: { flexDirection: 'row', alignItems: 'center', gap: 12 }, between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  label: { color: colors.muted, fontSize: 11, fontWeight: '700', letterSpacing: 1.5 },
});
export function Button({ title, onPress, disabled, secondary, danger }: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  secondary?: boolean;
  danger?: boolean;
}) {
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled: !!disabled }} disabled={disabled} onPress={onPress} style={({ pressed }) => ({ minHeight: 50, borderRadius: 12, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20, backgroundColor: disabled ? '#E7ECF2' : danger ? colors.red : secondary ? colors.light : colors.navy, opacity: pressed ? 0.75 : 1 })}>
    <Text style={{ fontSize: 14, fontWeight: '700', color: disabled ? colors.muted : secondary ? colors.blue : '#FFF' }}>{title}</Text>
  </Pressable>;
}
export function Badge({ status }: {
  status: SessionStatus | 'Hadir';
}) {
  const color = status === 'Dibuka' || status === 'Hadir' ? colors.green : status === 'Ditutup' ? colors.red : colors.muted;
  return <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: `${color}12`, borderRadius: 20, paddingVertical: 6, paddingHorizontal: 10, alignSelf: 'flex-start' }}>
    <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: color }} />
    <Text style={{ color, fontSize: 11, fontWeight: '700' }}>{status}</Text>
  </View>;
}
export function Empty({ title, description }: {
  title: string;
  description: string;
}) {
  return <View style={[ui.card, { alignItems: 'center', paddingVertical: 36 }]}>
    <Text style={{ fontSize: 30, color: colors.blue }}>▤</Text>
    <Text style={ui.heading}>{title}</Text>
    <Text style={[ui.subtitle, { textAlign: 'center', maxWidth: 360 }]}>{description}</Text>
  </View>;
}
export function Confirmation({ visible, title, description, confirm, cancel, danger }: {
  visible: boolean;
  title: string;
  description: string;
  confirm: () => void;
  cancel: () => void;
  danger?: boolean;
}) {
  return <Modal transparent visible={visible} animationType="fade" onRequestClose={cancel}>
    <View style={{ flex: 1, backgroundColor: '#0B1D3C88', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
      <View accessibilityViewIsModal style={[ui.card, { width: '100%', maxWidth: 420, gap: 20 }]}>
        <Text style={ui.heading}>{title}</Text>
        <Text style={ui.subtitle}>{description}</Text>
        <Button title="Ya, konfirmasi" onPress={confirm} danger={danger} />
        <Button title="Batal" onPress={cancel} secondary />
      </View>
    </View>
  </Modal>;
}
