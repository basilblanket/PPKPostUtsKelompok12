import test from 'node:test';
import assert from 'node:assert/strict';
import { recordAttendance, transitionSession } from '../src/state/transitions.ts';

test('alur membuka sesi, presensi dua identitas, menutup, dan menolak presensi lanjutan', () => {
  const initial = [{ scheduleId: 'p1', status: 'Belum Dibuka' }, { scheduleId: 'p2', status: 'Belum Dibuka' }];
  let sessions = initial;
  let attendance = [];
  assert.equal(recordAttendance(sessions, attendance, 'p1', 's1'), attendance);
  sessions = transitionSession(sessions, 'p1', 'open');
  assert.equal(sessions[0].status, 'Dibuka');
  assert.equal(initial[0].status, 'Belum Dibuka');
  assert.equal(sessions[1].status, 'Belum Dibuka');
  attendance = recordAttendance(sessions, attendance, 'p1', 's1');
  assert.equal(attendance.length, 1);
  assert.ok(Number.isFinite(Date.parse(attendance[0].timestamp)));
  assert.equal(recordAttendance(sessions, attendance, 'p1', 's1'), attendance);
  attendance = recordAttendance(sessions, attendance, 'p1', 's2');
  assert.equal(attendance.length, 2);
  sessions = transitionSession(sessions, 'p2', 'open');
  attendance = recordAttendance(sessions, attendance, 'p2', 's1');
  assert.equal(attendance.filter(a => a.studentId === 's1').length, 2);
  sessions = transitionSession(sessions, 'p1', 'close');
  assert.equal(sessions[0].status, 'Ditutup');
  assert.equal(recordAttendance(sessions, attendance, 'p1', 's3'), attendance);
  assert.equal(transitionSession(sessions, 'p1', 'open'), sessions);
  assert.equal(transitionSession(sessions, 'missing', 'open'), sessions);
  assert.equal(attendance.filter(a => a.sessionId === 'p1').length, 2);
});
