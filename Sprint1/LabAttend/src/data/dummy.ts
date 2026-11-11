import { Attendance, Identity, Schedule, Session } from '../types';
export const students: Identity[] = [
  { id: 's1', name: 'Andi Pratama', nim: '240601001' },
  { id: 's2', name: 'Budi Santoso', nim: '240601002' },
  { id: 's3', name: 'Citra Maharani', nim: '240601003' },
  { id: 's4', name: 'Dinda Putri', nim: '240601004' },
  { id: 's5', name: 'Eka Ramadhan', nim: '240601005' },
];
export const assistants: Identity[] = [{ id: 'a1', name: 'Rizky Firmansyah' }, { id: 'a2', name: 'Nadia Putri' }];
export const schedules: Schedule[] = [
  { id: 'p1', name: 'Pemrograman Perangkat Bergerak', className: 'D2', date: '2026-11-11', time: '08.00–10.00', room: 'Lab. Komputer 01', assistant: 'Rizky Firmansyah', initials: 'PB' },
  { id: 'p2', name: 'Basis Data', className: 'D2', date: '2026-11-11', time: '10.00–12.00', room: 'Lab. Komputer 02', assistant: 'Nadia Putri', initials: 'BD' },
  { id: 'p3', name: 'Jaringan Komputer', className: 'D2', date: '2026-11-11', time: '13.00–15.00', room: 'Lab. Jaringan', assistant: 'Rizky Firmansyah', initials: 'JK' },
  { id: 'p4', name: 'Sistem Terdistribusi', className: 'D2', date: '2026-11-12', time: '15.30–17.00', room: 'Lab. Komputer 03', assistant: 'Nadia Putri', initials: 'ST' },
];
export const initialSessions: Session[] = schedules.map(s => ({ scheduleId: s.id, status: 'Belum Dibuka' }));
export const initialAttendance: Attendance[] = [];
export const formatDate = (date: string) => new Date(`${date}T12:00:00`).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
export const formatTime = (date: string) => new Date(date).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
