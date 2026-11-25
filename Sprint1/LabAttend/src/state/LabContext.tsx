import React, { createContext, useContext, useRef, useState } from 'react';
import { Attendance, Identity, Role, Session } from '../types';
import { initialAttendance, initialSessions } from '../data/dummy';
import { recordAttendance, transitionSession } from './transitions';
type Store = {
  role: Role | null;
  identity: Identity | null;
  sessions: Session[];
  attendance: Attendance[];
  selectUser: (role: Role, user: Identity) => void;
  switchUser: () => void;
  changeSession: (id: string, action: 'open' | 'close') => string;
  attend: (id: string) => string;
};
const Context = createContext<Store | null>(null);
export function LabProvider({ children }: {
  children: React.ReactNode;
}) {
  const [role, setRole] = useState<Role | null>(null);
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [sessions, setSessions] = useState(initialSessions);
  const [attendance, setAttendance] = useState(initialAttendance);
  // Ref memberi pemeriksaan atomik untuk mencegah presensi ganda pada ketukan cepat.
  const live = useRef({ sessions, attendance });
  const changeSession = (id: string, action: 'open' | 'close') => {
    const session = live.current.sessions.find(s => s.scheduleId === id);
    if (role !== 'assistant' || !session)
      return 'Tindakan tidak tersedia.';
    if ((action === 'open' && session.status !== 'Belum Dibuka') || (action === 'close' && session.status !== 'Dibuka'))
      return 'Status sesi telah berubah.';
    const next = transitionSession(live.current.sessions, id, action);
    live.current.sessions = next;
    setSessions(next);
    return action === 'open' ? 'Sesi berhasil dibuka. Praktikan dapat melakukan presensi.' : 'Sesi berhasil ditutup. Presensi telah berakhir.';
  };
  const attend = (id: string) => {
    if (role !== 'student' || !identity || live.current.sessions.find(s => s.scheduleId === id)?.status !== 'Dibuka')
      return 'Presensi tidak tersedia. Sesi tidak sedang dibuka.';
    if (live.current.attendance.some(a => a.sessionId === id && a.studentId === identity.id))
      return 'Anda sudah melakukan presensi pada sesi ini.';
    const next = recordAttendance(live.current.sessions, live.current.attendance, id, identity.id);
    live.current.attendance = next;
    setAttendance(next);
    return 'Presensi berhasil! Kehadiran Anda telah tercatat.';
  };
  // Provider berada di atas navigasi: pergantian halaman/identitas tidak mereset data.
  return <Context.Provider value={{ role, identity, sessions, attendance, selectUser: (r, u) => { setRole(r); setIdentity(u); }, switchUser: () => { setRole(null); setIdentity(null); }, changeSession, attend }}>{children}</Context.Provider>;
}
export function useLab() {
  const value = useContext(Context); if (!value)
    throw new Error('LabProvider diperlukan'); return value;
}
