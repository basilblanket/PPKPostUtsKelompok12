import React, { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { formatDate, formatTime, schedules, students } from '../data/dummy';
import { useLab } from '../state/LabContext';
import { Badge, Button, colors, Confirmation, Empty, ui } from '../components/UI';
export default function SessionDetail() {
  const { id } = useLocalSearchParams<{
    id: string;
  }>();
  const { identity, role, sessions, attendance, changeSession, attend } = useLab();
  const [action, setAction] = useState<'open' | 'close' | 'attend' | null>(null);
  const [feedback, setFeedback] = useState('');
  if (!identity)
    return <Redirect href="/" />;
  const schedule = schedules.find(s => s.id === id);
  if (!schedule)
    return <SafeAreaView style={ui.page}>
      <View style={ui.content}>
        <Empty title="Sesi tidak ditemukan" description="Pilih sesi dari daftar jadwal praktikum." />
        <Button title="Kembali ke beranda" onPress={() => router.replace('/')} />
      </View>
    </SafeAreaView>;
  const status = sessions.find(s => s.scheduleId === id)!.status;
  const records = attendance.filter(a => a.sessionId === id);
  const mine = records.find(a => a.studentId === identity.id);
  const student = role === 'student';
  const disabled = !!mine || status !== 'Dibuka';
  return <SafeAreaView style={ui.page}>
    <ScrollView contentContainerStyle={[ui.content, { maxWidth: 780 }]}>
      <View style={{ alignSelf: 'flex-start' }}>
        <Button secondary title="← Kembali" onPress={() => router.canGoBack() ? router.back() : router.replace('/')} />
      </View>
      <Text style={ui.label}>JADWAL / DETAIL SESI</Text>
      <View style={{ gap: 12 }}>
        <Badge status={status} />
        <Text style={ui.title}>{schedule.name}</Text>
        <Text style={ui.subtitle}>Kelas {schedule.className} · Praktikum Informatika</Text>
      </View>
      <View style={ui.card}>
        <Text style={ui.heading}>Informasi praktikum</Text>{[['Jadwal', formatDate(schedule.date)], ['Waktu', schedule.time], ['Ruangan', schedule.room], ['Asisten', schedule.assistant]].map(([label, value]) => <View key={label} style={{ gap: 4, borderTopWidth: 1, borderColor: colors.line, paddingTop: 12 }}>
          <Text style={ui.label}>{label.toUpperCase()}</Text>
          <Text style={ui.text}>{value}</Text>
        </View>)}</View>
      {!!feedback && <View accessibilityRole="alert" style={[ui.card, { backgroundColor: '#EFFAF5', borderColor: '#CDEADD' }]}>
        <Text style={{ color: colors.green, lineHeight: 22 }}>{feedback}</Text>
      </View>}
      <View style={ui.card}>
        <Text style={ui.heading}>{student ? 'Presensi Anda' : 'Pengelolaan sesi'}</Text>{student ? <>
          <Text style={ui.subtitle}>{mine ? `Hadir · Tercatat pukul ${formatTime(mine.timestamp)} (waktu lokal perangkat).` : status === 'Belum Dibuka' ? 'Presensi belum tersedia. Tunggu asisten membuka sesi ini.' : status === 'Ditutup' ? 'Sesi telah ditutup. Anda tidak dapat melakukan presensi.' : 'Sesi sedang dibuka. Konfirmasikan kehadiran Anda sekarang.'}</Text>{mine && <Badge status="Hadir" />}<Button disabled={disabled} title={mine ? 'Sudah Presensi' : 'Lakukan Presensi'} onPress={() => setAction('attend')} />
        </> : <>
          <Text style={ui.subtitle}>{status === 'Belum Dibuka' ? 'Buka sesi agar praktikan dapat mencatat kehadiran.' : status === 'Dibuka' ? 'Praktikan dapat melakukan presensi. Tutup sesi setelah praktikum selesai.' : 'Sesi selesai. Rekap kehadiran tetap tersedia di bawah.'}</Text>
          <Button title={status === 'Belum Dibuka' ? 'Buka Sesi' : status === 'Dibuka' ? 'Tutup Sesi' : 'Sesi Sudah Ditutup'} disabled={status === 'Ditutup'} danger={status === 'Dibuka'} onPress={() => setAction(status === 'Belum Dibuka' ? 'open' : 'close')} />
        </>}</View>
      {!student && <>
        <View style={ui.between}>
          <Text style={ui.heading}>Rekap kehadiran</Text>
          <Text style={ui.subtitle}>{records.length}/{students.length} hadir</Text>
        </View>{records.length === 0 ? <Empty title="Belum ada kehadiran" description="Presensi praktikan akan muncul di sini setelah mereka mengonfirmasi kehadiran." /> : records.map(a => {
          const p = students.find(p => p.id === a.studentId)!;
          return <View style={ui.card} key={a.studentId}>
            <View style={ui.between}>
              <Text style={ui.heading}>{p.name}</Text>
              <Badge status="Hadir" />
            </View>
            <Text style={ui.subtitle}>NIM {p.nim}</Text>
            <Text style={ui.text}>{schedule.name}</Text>
            <Text style={ui.subtitle}>Presensi {formatTime(a.timestamp)} · {new Date(a.timestamp).toLocaleDateString('id-ID')}</Text>
          </View>;
        })}</>}
    </ScrollView>
    <Confirmation visible={action !== null} title={action === 'attend' ? 'Konfirmasi presensi' : action === 'open' ? 'Buka sesi praktikum?' : 'Tutup sesi praktikum?'} description={action === 'attend' ? `Catat kehadiran ${identity.name} pada sesi ${schedule.name}?` : action === 'open' ? 'Praktikan dapat melakukan presensi setelah sesi dibuka.' : 'Setelah sesi ditutup, praktikan tidak dapat melakukan presensi lagi. Sesi tidak dapat dibuka kembali.'} danger={action === 'close'} cancel={() => setAction(null)} confirm={() => {
      if (!action)
        return; setFeedback(action === 'attend' ? attend(id) : changeSession(id, action)); setAction(null);
    }} />
  </SafeAreaView>;
}
