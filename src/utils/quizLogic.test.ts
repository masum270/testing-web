import test from 'node:test';
import assert from 'node:assert/strict';
import {
  toBengaliNumber,
  formatTimer,
  calculateLevel,
  calculateLevelProgress,
  calculateScoreXP,
  calculateAccuracy,
  selectExamQuestions,
} from './quizLogic.js';
import { MCQ } from '../types/quiz.js';

test('toBengaliNumber converts Arabic digits to Bengali digits', () => {
  assert.equal(toBengaliNumber(0), '০');
  assert.equal(toBengaliNumber(15), '১৫');
  assert.equal(toBengaliNumber(100), '১০০');
  assert.equal(toBengaliNumber('12:34'), '১২:৩৪');
});

test('formatTimer formats seconds correctly', () => {
  assert.equal(formatTimer(90, false), '01:30');
  assert.equal(formatTimer(0, false), '00:00');
  assert.equal(formatTimer(65, true), '০১:০৫');
});

test('calculateLevel computes level correctly (every 100 XP is 1 level)', () => {
  assert.equal(calculateLevel(0), 0);
  assert.equal(calculateLevel(50), 1);
  assert.equal(calculateLevel(99), 1);
  assert.equal(calculateLevel(100), 2);
  assert.equal(calculateLevel(250), 3);
  assert.equal(calculateLevel(999), 10);
});

test('calculateLevelProgress returns remainder towards 100', () => {
  assert.equal(calculateLevelProgress(0), 0);
  assert.equal(calculateLevelProgress(75), 75);
  assert.equal(calculateLevelProgress(120), 20);
});

test('calculateScoreXP awards 10 XP for correct, deducts 2 for wrong when enabled', () => {
  assert.equal(calculateScoreXP(10, 0, true), 100);
  assert.equal(calculateScoreXP(8, 2, true), 80 - 4); // 76
  assert.equal(calculateScoreXP(2, 10, true), 0); // clamped at 0
  assert.equal(calculateScoreXP(5, 5, false), 50); // without penalty
});

test('calculateAccuracy calculates percentage', () => {
  assert.equal(calculateAccuracy(12, 15), 80);
  assert.equal(calculateAccuracy(0, 10), 0);
  assert.equal(calculateAccuracy(10, 10), 100);
});

test('selectExamQuestions filters and prioritizes unattempted questions', () => {
  const dummyMCQs: MCQ[] = [
    {
      id: 'phy_1',
      subject: 'পদার্থবিজ্ঞান',
      chapter: 'গতি',
      question: 'Q1',
      options: ['A', 'B', 'C', 'D'],
      correctIndex: 0,
      explanation: 'E1',
      difficulty: 'easy',
    },
    {
      id: 'phy_2',
      subject: 'পদার্থবিজ্ঞান',
      chapter: 'গতি',
      question: 'Q2',
      options: ['A', 'B', 'C', 'D'],
      correctIndex: 1,
      explanation: 'E2',
      difficulty: 'medium',
    },
    {
      id: 'phy_3',
      subject: 'পদার্থবিজ্ঞান',
      chapter: 'বল',
      question: 'Q3',
      options: ['A', 'B', 'C', 'D'],
      correctIndex: 2,
      explanation: 'E3',
      difficulty: 'hard',
    },
    {
      id: 'chem_1',
      subject: 'রসায়ন',
      chapter: 'পদার্থের অবস্থা',
      question: 'Q4',
      options: ['A', 'B', 'C', 'D'],
      correctIndex: 0,
      explanation: 'E4',
      difficulty: 'easy',
    },
  ];

  // Specific chapter filter
  const gotiQuestions = selectExamQuestions(dummyMCQs, 'পদার্থবিজ্ঞান', 'গতি', 10);
  assert.equal(gotiQuestions.length, 2);
  assert.ok(gotiQuestions.every((q) => q.chapter === 'গতি'));

  // Subject all chapters
  const allPhy = selectExamQuestions(dummyMCQs, 'পদার্থবিজ্ঞান', 'সকল অধ্যায়', 10);
  assert.equal(allPhy.length, 3);

  // Prioritize unattempted
  const prioritized = selectExamQuestions(dummyMCQs, 'পদার্থবিজ্ঞান', 'সকল অধ্যায়', 2, ['phy_1']);
  assert.equal(prioritized.length, 2);
  // phy_2 and phy_3 are unattempted, so phy_1 should not be among the top 2 when 2 unattempted exist
  assert.ok(!prioritized.some((q) => q.id === 'phy_1'));
});
