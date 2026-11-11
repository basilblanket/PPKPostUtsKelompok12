import React, { useState } from 'react';
import { Pressable, ScrollView, Text, useWindowDimensions, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { assistants, formatDate, formatTime, schedules, students } from '../data/dummy';
import { useLab } from '../state/LabContext';
import { Badge, Button, colors, Empty, ui } from '../components/UI';
import ScheduleCard from '../components/ScheduleCard';
export default function Main() {
  const { role, identity, sessions, attendance, switchUser } = useLab();
  const [tab, setTab] = useState(0);
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isStudent = role === 'student';
  const tabs = ['Beranda', 'Jadwal', isStudent ? 'Riwayat' : 'Rekap', 'Profil'];
  const myAttendance = isStudent ? attendance.filter(a => a.studentId === identity?.id) : attendance;
  const open = sessions.filter(s => s.status === 'Dibuka');
  const stats = isStudent ? [['Sesi praktikum', schedules.length, '▦'], ['Telah dihadiri', myAttendance.length, '✓'], ['Sesi dibuka', open.length, '◉']] : [['Total sesi', schedules.length, '▦'], ['Sedang dibuka', open.length, '◉'], ['Sudah ditutup', sessions.filter(s => s.status === 'Ditutup').length, '✓']];
  const list = <View style={{ flexDirection: width >= 720 ? 'row' : 'column', flexWrap: 'wrap', gap: 16 }}>{schedules.map(s => <View key={s.id} style={{ width: width >= 720 ? '48.8%' : '100%', flexGrow: 1 }}>
    <ScheduleCard schedule={s} />
  </View>)}</View>;
  return <View style={ui.page}>
    <View style={{ backgroundColor: '#FFF', borderBottomWidth: 1, borderColor: colors.line, paddingTop: insets.top }}>
      <View style={[ui.between, { maxWidth: 1080, width: '100%', alignSelf: 'center', paddingHorizontal: 24, paddingVertical: 18 }]}>
        <View style={ui.row}>
          <View style={{ backgroundColor: colors.navy, borderRadius: 9, padding: 8 }}>
            <Text style={{ fontSize: 18, fontWeight: '800', color: '#FFF' }}>L.</Text>
          </View>
          <Text style={[ui.heading, { fontSize: 21 }]}>LabAttend<Text style={{ color: colors.blue }}>.</Text>
          </Text>
        </View>
        <View style={{ borderRadius: 20, backgroundColor: colors.light, paddingHorizontal: 12, paddingVertical: 8 }}>
          <Text style={{ color: colors.blue, fontSize: 12, fontWeight: '600' }}>{isStudent ? 'Praktikan' : 'Asisten'}</Text>
        </View>
      </View>
    </View>
    <ScrollView contentContainerStyle={ui.content}>
      <View style={{ gap: 6 }}>
        <Text style={ui.label}>{tab === 0 ? 'RUANG PRAKTIKUM ANDA' : 'LABATTEND / ' + tabs[tab].toUpperCase()}</Text>
        <Text style={ui.title}>{tab === 0 ? `Halo, ${identity?.name} 👋` : tab === 2 ? isStudent ? 'Riwayat presensi' : 'Rekap kehadiran' : tab === 3 ? 'Profil Anda' : 'Jadwal praktikum'}</Text>
        <Text style={ui.subtitle}>{['Siap untuk belajar hal baru hari ini?', 'Temukan jadwal dan informasi sesi praktikum Anda.', isStudent ? 'Setiap kehadiran, satu langkah kemajuan.' : 'Pantau kehadiran praktikan di seluruh sesi.', 'Kelola identitas untuk menjelajahi alur praktikum.'][tab]}</Text>
      </View>
      {tab === 0 && <>
        <View style={{ backgroundColor: colors.navy, padding: 24, borderRadius: 20, gap: 14, overflow: 'hidden' }}>
          <Text style={{ color: '#A8C9FF', fontSize: 11, letterSpacing: 2, fontWeight: '700' }}>BELAJAR. HADIR. BERKEMBANG.</Text>
          <Text style={{ color: '#FFF', fontSize: width < 400 ? 23 : 28, fontWeight: '700', maxWidth: 580 }}>{isStudent ? 'Praktikum terjadwal.\nKehadiran tercatat.' : 'Kelola sesi dengan mudah.\nPantau setiap kehadiran.'}</Text>
          <Text style={{ color: '#C0D0E4', fontSize: 14, lineHeight: 22 }}>{isStudent ? 'Cek jadwal Anda dan lakukan presensi saat asisten membuka sesi.' : 'Buka sesi, pantau rekap praktikan, lalu tutup sesi setelah selesai.'}</Text>
          <View style={{ alignSelf: 'flex-start', marginTop: 4 }}>
            <Button title="Lihat jadwal  →" secondary onPress={() => setTab(1)} />
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 10 }}>{stats.map(([label, value, icon]) => <View key={label} style={[ui.card, { flex: 1, padding: width < 400 ? 12 : 18, gap: 10 }]}>
          <Text style={{ color: colors.blue, fontSize: 20 }}>{icon}</Text>
          <Text style={[ui.title, { fontSize: 28 }]}>{value}</Text>
          <Text style={[ui.subtitle, { fontSize: 12, lineHeight: 18 }]}>{label}</Text>
        </View>)}</View>
        {open.length ? <View style={[ui.card, { backgroundColor: '#EFFAF5', borderColor: '#CDEADD' }]}>
          <Text style={[ui.heading, { color: colors.green }]}>◉  {open.length} sesi sedang dibuka</Text>{open.map(s => <Pressable accessibilityRole="button" key={s.scheduleId} onPress={() => router.push(`/session/${s.scheduleId}`)}>
            <Text style={[ui.text, { color: colors.green }]}>{schedules.find(p => p.id === s.scheduleId)?.name}  →</Text>
          </Pressable>)}</View> : <View style={[ui.card, { backgroundColor: colors.light }]}>
          <Text style={[ui.text, { color: colors.blue }]}>ⓘ  Belum ada sesi yang dibuka</Text>
          <Text style={ui.subtitle}>{isStudent ? 'Presensi tersedia setelah asisten membuka sesi.' : 'Pilih jadwal untuk mulai membuka sesi praktikum.'}</Text>
        </View>}
        {!isStudent && <View style={[ui.between, { flexWrap: 'wrap' }]}>
          <Text style={ui.heading}>Ringkasan kehadiran</Text>
          <Text style={ui.text}>{attendance.length} presensi · {new Set(attendance.map(a => a.studentId)).size}/{students.length} praktikan</Text>
        </View>}
        <View style={ui.between}>
          <Text style={ui.heading}>Jadwal praktikum</Text>
          <Pressable accessibilityRole="button" onPress={() => setTab(1)}>
            <Text style={{ color: colors.blue, fontSize: 13 }}>Lihat semua →</Text>
          </Pressable>
        </View>{list}</>}
      {tab === 1 && <>
        <View style={ui.between}>
          <Text style={ui.heading}>Semua jadwal</Text>
          <Text style={ui.subtitle}>{schedules.length} sesi · Kelas D2</Text>
        </View>{list}</>}
      {tab === 2 && <>
        <View style={ui.card}>
          <Text style={ui.label}>{isStudent ? 'TOTAL KEHADIRAN ANDA' : 'TOTAL PRESENSI TERCATAT'}</Text>
          <Text style={ui.title}>{myAttendance.length}<Text style={ui.subtitle}> presensi</Text>
          </Text>
          {!isStudent && <Text style={ui.subtitle}>{new Set(myAttendance.map(a => a.studentId)).size} dari {students.length} praktikan telah hadir</Text>}
        </View>{myAttendance.length === 0 ? <Empty title={isStudent ? 'Belum ada riwayat presensi' : 'Belum ada praktikan yang hadir'} description={isStudent ? 'Lakukan presensi pada sesi yang dibuka. Catatan kehadiran Anda akan muncul di sini.' : 'Buka sesi dan minta praktikan melakukan presensi. Daftar kehadiran akan diperbarui otomatis.'} /> : [...myAttendance].reverse().map(a => {
          const s = schedules.find(s => s.id === a.sessionId)!;
          const p = students.find(s => s.id === a.studentId)!;
          return <View key={`${a.sessionId}-${a.studentId}`} style={ui.card}>
            <View style={ui.between}>
              <Text style={[ui.heading, { flex: 1 }]}>{isStudent ? s.name : p.name}</Text>
              <Badge status="Hadir" />
            </View>{!isStudent && <Text style={ui.subtitle}>NIM {p.nim} · {s.name}</Text>}<Text style={ui.subtitle}>{new Date(a.timestamp).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</Text>
            <Text style={ui.text}>Presensi pukul {formatTime(a.timestamp)}</Text>
          </View>;
        })}</>}
      {tab === 3 && <>
        <View style={ui.card}>
          <View style={{ alignSelf: 'flex-start', backgroundColor: colors.light, padding: 20, borderRadius: 18 }}>
            <Text style={{ color: colors.blue, fontSize: 28, fontWeight: '700' }}>{identity?.name.split(' ').map(n => n[0]).slice(0, 2).join('')}</Text>
          </View>
          <Text style={ui.heading}>{identity?.name}</Text>
          <Text style={ui.subtitle}>{isStudent ? `Praktikan · NIM ${identity?.nim}` : 'Asisten Praktikum'}</Text>
          <Text style={ui.text}>Kelas D2 · Laboratorium Informatika</Text>
          <Button title="Ganti peran atau identitas" onPress={switchUser} secondary />
        </View>
        <View style={ui.card}>
          <Text style={ui.heading}>Tentang demo ini</Text>
          <Text style={ui.subtitle}>LabAttend · Sprint 1\nData disimpan dalam memori selama aplikasi berjalan. Pergantian identitas tetap mempertahankan sesi dan presensi. Refresh akan mengembalikan data ke kondisi awal.</Text>
          <Text style={ui.subtitle}>{students.length} praktikan · {assistants.length} asisten · {schedules.length} jadwal</Text>
        </View>
      </>}
      <Text style={[ui.label, { textAlign: 'center', fontSize: 9, marginTop: 8 }]}>LABATTEND · SETIAP KEHADIRAN BERARTI</Text>
    </ScrollView>
    <View style={{ backgroundColor: '#FFF', borderTopWidth: 1, borderColor: colors.line, paddingBottom: Math.max(insets.bottom, 8) }}>
      <View style={{ flexDirection: 'row', maxWidth: 650, width: '100%', alignSelf: 'center', paddingTop: 8 }}>{tabs.map((label, i) => <Pressable key={label} accessibilityRole="tab" accessibilityState={{ selected: tab === i }} onPress={() => setTab(i)} style={{ flex: 1, alignItems: 'center', minHeight: 54, justifyContent: 'center', gap: 4 }}>
        <Text style={{ color: tab === i ? colors.blue : colors.muted, fontSize: 21 }}>{['⌂', '▦', '▤', '◎'][i]}</Text>
        <Text style={{ color: tab === i ? colors.blue : colors.muted, fontSize: 11, fontWeight: tab === i ? '700' : '400' }}>{label}</Text>
      </Pressable>)}</View>
    </View>
  </View>;
}
