// Grading utility functions for the school system

// Shared class lists used across the app
export const SCHOOL_CLASSES = {
  'Nursery':   ['Nursery 1', 'Nursery 2', 'Reception'],
  'Primary':   ['Primary 1A', 'Primary 1B', 'Primary 2A', 'Primary 2B', 'Primary 3A', 'Primary 3B', 'Primary 4A', 'Primary 4B', 'Primary 5A', 'Primary 5B', 'Primary 6A', 'Primary 6B'],
  'Secondary': ['JSS 1A', 'JSS 1B', 'JSS 2A', 'JSS 2B', 'JSS 3A', 'JSS 3B', 'SS1 Arts A', 'SS1 Arts B', 'SS1 Com A', 'SS1 Com B', 'SS1 Sci A', 'SS1 Sci B', 'SS2 Arts A', 'SS2 Arts B', 'SS2 Com A', 'SS2 Com B', 'SS2 Sci A', 'SS2 Sci B', 'SS3 Arts A', 'SS3 Arts B', 'SS3 Com A', 'SS3 Com B', 'SS3 Sci A', 'SS3 Sci B']
};
export const ALL_SCHOOL_CLASSES = Object.values(SCHOOL_CLASSES).flat();
export const SCHOOL_SECTIONS = ['Nursery', 'Primary', 'Secondary'];

export const getGrade = (percentage, section) => {
  const score = parseFloat(percentage);
  
  if (section === 'Secondary') {
    if (score >= 75) return 'A1';
    if (score >= 70) return 'B2';
    if (score >= 65) return 'B3';
    if (score >= 60) return 'C4';
    if (score >= 55) return 'C5';
    if (score >= 50) return 'C6';
    if (score >= 45) return 'D7';
    if (score >= 40) return 'E8';
    return 'F9';
  } else {
    if (score >= 70) return 'A';
    if (score >= 60) return 'B';
    if (score >= 50) return 'C';
    if (score >= 45) return 'D';
    if (score >= 40) return 'E';
    return 'F';
  }
};

export const getRemark = (percentage, section) => {
  const score = parseFloat(percentage);
  
  if (section === 'Secondary') {
    if (score >= 75) return 'Excellent';
    if (score >= 70) return 'Very Good';
    if (score >= 65) return 'Good';
    if (score >= 60) return 'Credit';
    if (score >= 55) return 'Credit';
    if (score >= 50) return 'Credit';
    if (score >= 45) return 'Pass';
    if (score >= 40) return 'Pass';
    return 'Fail';
  } else {
    if (score >= 70) return 'Excellent';
    if (score >= 60) return 'Very Good';
    if (score >= 50) return 'Good';
    if (score >= 45) return 'Pass';
    if (score >= 40) return 'Weak Pass';
    return 'Fail';
  }
};

/** Returns grade statistics for a result set */
export const getGradeStats = (results, section) => {
  const sec = section || results[0]?.section || 'Primary';
  let credits = 0, fails = 0, aGrades = 0, bGrades = 0, passes = 0;

  results.forEach(r => {
    const g = r.grade || '';
    if (sec === 'Secondary') {
      if (g === 'A1') aGrades++;
      else if (g === 'B2' || g === 'B3') bGrades++;
      else if (g === 'C4' || g === 'C5' || g === 'C6') credits++;
      else if (g === 'D7' || g === 'E8') passes++;
      else if (g === 'F9') fails++;
    } else {
      if (g === 'A') aGrades++;
      else if (g === 'B') bGrades++;
      else if (g === 'C') credits++;
      else if (g === 'D' || g === 'E') passes++;
      else if (g === 'F') fails++;
    }
  });

  return { aGrades, bGrades, credits, passes, fails };
};

export const calculateStudentAverage = (results) => {
  if (!results || results.length === 0) return { average: 0, grade: 'F', totalScore: 0, totalSubjects: 0 };
  
  const totalScore = results.reduce((sum, r) => sum + (r.total || 0), 0);
  const totalSubjects = results.length;
  const average = totalScore / totalSubjects;
  
  const section = results[0]?.section || 'Primary';
  const grade = getGrade(average, section);
  const stats = getGradeStats(results, section);
  
  return {
    average: parseFloat(average.toFixed(2)),
    grade,
    totalScore,
    totalSubjects,
    ...stats
  };
};

export const getPosition = (rank) => {
  const lastDigit = rank % 10;
  const lastTwoDigits = rank % 100;
  
  if (lastTwoDigits >= 11 && lastTwoDigits <= 13) {
    return `${rank}th`;
  }
  
  switch (lastDigit) {
    case 1: return `${rank}st`;
    case 2: return `${rank}nd`;
    case 3: return `${rank}rd`;
    default: return `${rank}th`;
  }
};

// Aliases for backward compatibility
export const calculateGrade = getGrade;
export const calculateRemark = getRemark;
export const calculateAverage = calculateStudentAverage;
export const formatPosition = getPosition;