import type { Attendance, Session } from '../types/index';
// Sesi mengikuti satu arah: Belum Dibuka → Dibuka → Ditutup.
export function transitionSession(sessions: Session[], id: string, action: 'open' | 'close'): Session[] {
  const required = action === 'open' ? 'Belum Dibuka' : 'Dibuka';
  if (!sessions.some(s => s.scheduleId === id && s.status === required))
    return sessions;
  return sessions.map(s => s.scheduleId === id ? { ...s, status: action === 'open' ? 'Dibuka' : 'Ditutup' } : s);
}
export function recordAttendance(sessions: Session[], attendance: Attendance[], sessionId: string, studentId: string): Attendance[] {
  if (!sessions.some(s => s.scheduleId === sessionId && s.status === 'Dibuka'))
    return attendance;
  // Unik berdasarkan pasangan identitas dan sesi, termasuk pada ketukan berulang.
  if (attendance.some(a => a.sessionId === sessionId && a.studentId === studentId))
    return attendance;
  // Simpan satu titik waktu; tampilkan tanggal/jam dengan zona waktu lokal perangkat.
  return [...attendance, { sessionId, studentId, timestamp: new Date().toISOString() }];
}
