import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Schedule } from '../types';
import { useLab } from '../state/LabContext';
import { formatDate } from '../data/dummy';
import { Badge, colors, ui } from './UI';
export default function ScheduleCard({ schedule }: {
  schedule: Schedule;
}) {
  const { sessions } = useLab();
  return <Pressable accessibilityRole="button" accessibilityLabel={`Detail ${schedule.name}`} onPress={() => router.push(`/session/${schedule.id}`)} style={({ pressed }) => [ui.card, { opacity: pressed ? 0.75 : 1 }]}>
    <View style={ui.between}>
      <View style={{ backgroundColor: colors.light, borderRadius: 12, padding: 12 }}>
        <Text style={{ fontWeight: '800', color: colors.blue }}>{schedule.initials}</Text>
      </View>
      <Badge status={sessions.find(s => s.scheduleId === schedule.id)!.status} />
    </View>
    <Text style={ui.heading}>{schedule.name}</Text>
    <Text style={ui.subtitle}>Kelas {schedule.className}  ·  {schedule.room}</Text>
    <View style={{ borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 14, gap: 8 }}>
      <Text style={ui.subtitle}>{formatDate(schedule.date)}</Text>
      <View style={ui.between}>
        <Text style={[ui.text, { fontWeight: '600' }]}>◷  {schedule.time}</Text>
        <Text style={{ color: colors.blue, fontWeight: '600', fontSize: 13 }}>Detail sesi  →</Text>
      </View>
    </View>
  </Pressable>;
}
