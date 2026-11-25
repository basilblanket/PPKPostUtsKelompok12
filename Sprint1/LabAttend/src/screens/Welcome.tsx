import React, { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { assistants, students } from '../data/dummy';
import { useLab } from '../state/LabContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Role } from '../types';
import { Button, colors, ui } from '../components/UI';
export default function Welcome() {
  const insets = useSafeAreaInsets();
  const [role, setRole] = useState<Role>('student');
  const [selected, setSelected] = useState('s1');
  const { selectUser } = useLab();
  const people = role === 'student' ? students : assistants;
  return <ScrollView style={ui.page} contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24, paddingTop: Math.max(insets.top, 24), paddingBottom: Math.max(insets.bottom, 24) }}>
    <View style={{ width: '100%', maxWidth: 530, alignSelf: 'center', gap: 28 }}>
      <View style={ui.row}>
        <View style={{ backgroundColor: colors.navy, padding: 13, borderRadius: 14 }}>
          <Text style={{ color: 'white', fontWeight: '800', fontSize: 22 }}>L.</Text>
        </View>
        <Text style={[ui.heading, { fontSize: 25 }]}>LabAttend<Text style={{ color: colors.blue }}>.</Text>
        </Text>
      </View>
      <View style={{ gap: 10 }}>
        <Text style={ui.label}>PRAKTIKUM LEBIH TERATUR</Text>
        <Text style={[ui.title, { fontSize: 36 }]}>Selamat datang di{'\n'}ruang praktikum Anda.</Text>
        <Text style={ui.subtitle}>Satu tempat untuk jadwal, sesi praktikum, dan catatan kehadiran. Mulai dengan memilih peran Anda.</Text>
      </View>
      <View style={ui.card}>
        <Text style={ui.heading}>Masuk sebagai</Text>
        <View style={ui.row}>{(['student', 'assistant'] as Role[]).map(r => <Pressable key={r} accessibilityRole="radio" accessibilityState={{ checked: role === r }} onPress={() => { setRole(r); setSelected(r === 'student' ? 's1' : 'a1'); }} style={{ flex: 1, padding: 18, gap: 8, borderRadius: 12, borderWidth: 1, borderColor: role === r ? colors.blue : colors.line, backgroundColor: role === r ? colors.light : '#FFF' }}>
          <Text style={{ fontSize: 24, color: colors.blue }}>{r === 'student' ? '◇' : '▦'}</Text>
          <Text style={ui.heading}>{r === 'student' ? 'Praktikan' : 'Asisten'}</Text>
        </Pressable>)}</View>
        <Text style={[ui.label, { marginTop: 10 }]}>PILIH IDENTITAS</Text>{people.map(p => <Pressable accessibilityRole="radio" accessibilityState={{ checked: selected === p.id }} key={p.id} onPress={() => setSelected(p.id)} style={[ui.between, { borderRadius: 10, padding: 12, backgroundColor: selected === p.id ? colors.light : colors.bg }]}>
          <View>
            <Text style={[ui.text, { fontWeight: '600' }]}>{p.name}</Text>{p.nim && <Text style={ui.subtitle}>{p.nim}</Text>}</View>
          <Text style={{ color: colors.blue, fontSize: 20 }}>{selected === p.id ? '●' : '○'}</Text>
        </Pressable>)}<Button title="Masuk ke LabAttend  →" onPress={() => {
          const person = people.find(p => p.id === selected); if (person)
            selectUser(role, person);
        }} />
      </View>
      <Text style={[ui.subtitle, { textAlign: 'center', fontSize: 12 }]}>SPRINT 01  /  Demo lokal · Tanpa akun atau kata sandi</Text>
    </View>
  </ScrollView>;
}
