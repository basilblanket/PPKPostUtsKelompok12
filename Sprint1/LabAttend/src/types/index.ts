export type Role = 'student' | 'assistant';
export type SessionStatus = 'Belum Dibuka' | 'Dibuka' | 'Ditutup';
export type Identity = {
  id: string;
  name: string;
  nim?: string;
};
export type Schedule = {
  id: string;
  name: string;
  className: string;
  date: string;
  time: string;
  room: string;
  assistant: string;
  initials: string;
};
export type Session = {
  scheduleId: string;
  status: SessionStatus;
};
export type Attendance = {
  sessionId: string;
  studentId: string;
  timestamp: string;
};
