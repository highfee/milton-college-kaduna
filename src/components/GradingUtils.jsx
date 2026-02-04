// Grading utility functions for the school system

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
    if (score >= 50) return 'Credit';
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

export const calculateStudentAverage = (results) => {
  if (!results || results.length === 0) return { average: 0, grade: 'F', totalScore: 0, totalSubjects: 0 };
  
  const totalScore = results.reduce((sum, r) => sum + (r.total || 0), 0);
  const totalSubjects = results.length;
  const average = totalScore / totalSubjects;
  
  const section = results[0]?.section || 'Primary';
  const grade = getGrade(average, section);
  
  return {
    average: average.toFixed(2),
    grade,
    totalScore,
    totalSubjects
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