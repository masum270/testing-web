import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateAccuracy, calculateLevel } from '../utils/quizLogic.js';

test('calculateLevel works correctly', () => {
  assert.equal(calculateLevel(0), 0);
  assert.equal(calculateLevel(140), 2);
  assert.equal(calculateLevel(500), 6);
});

test('calculateAccuracy handles zero and normal counts', () => {
  assert.equal(calculateAccuracy(0, 0), 0);
  assert.equal(calculateAccuracy(16, 20), 80);
});

test('Leaderboard sorting sorts real users descending by totalXP', () => {
  const users = [
    { name: 'User A', totalXP: 100, totalExams: 1 },
    { name: 'User B', totalXP: 300, totalExams: 2 },
    { name: 'User C', totalXP: 200, totalExams: 3 },
  ];

  const sorted = [...users].sort((a, b) => b.totalXP - a.totalXP);
  assert.equal(sorted[0].name, 'User B');
  assert.equal(sorted[1].name, 'User C');
  assert.equal(sorted[2].name, 'User A');
});

test('Users with 0 exams are filtered out from leaderboard', () => {
  const users = [
    { name: 'Active User', totalXP: 140, totalExams: 2 },
    { name: 'New User', totalXP: 0, totalExams: 0 }
  ];

  const activeOnly = users.filter((u) => u.totalExams > 0);
  assert.equal(activeOnly.length, 1);
  assert.equal(activeOnly[0].name, 'Active User');
});
