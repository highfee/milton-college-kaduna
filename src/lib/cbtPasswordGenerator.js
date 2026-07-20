// Generates unique CBT exam passwords for students.
// Each password is unique globally (no two students share the same password)
// and unique per student per exam (a student cannot reuse the password for another exam).

const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no confusing chars (0/O/1/I)

export function generateRandomPassword(length = 8) {
  let pwd = '';
  for (let i = 0; i < length; i++) {
    pwd += CHARS.charAt(Math.floor(Math.random() * CHARS.length));
  }
  return pwd;
}

/**
 * Generate a batch of unique passwords for a set of students.
 * Ensures no collision with existing passwords (existingPasswords set) and no internal duplicates.
 * @param {Array} students - [{ id, first_name, last_name, admission_number, current_class }]
 * @param {Set<string>} existingPasswords - already-used passwords to avoid
 * @returns {Array} - [{ student, password }]
 */
export function generateUniquePasswords(students, existingPasswords = new Set()) {
  const used = new Set(existingPasswords);
  const results = [];
  for (const student of students) {
    let pwd;
    do {
      pwd = generateRandomPassword(8);
    } while (used.has(pwd));
    used.add(pwd);
    results.push({ student, password: pwd });
  }
  return results;
}