import React from 'react';
import { getPosition, getGrade, gradeToPoint } from '@/components/GradingUtils';

const RATING_KEY = [
  { score: 5, label: '5 = Excellent' },
  { score: 4, label: '4 = Very Good' },
  { score: 3, label: '3 = Good' },
  { score: 2, label: '2 = Fair' },
  { score: 1, label: '1 = Poor' },
];

const AFFECTIVE_TRAITS = [
  { key: 'punctuality', label: 'Punctuality' },
  { key: 'neatness', label: 'Neatness' },
  { key: 'honesty', label: 'Honesty' },
  { key: 'politeness', label: 'Politeness' },
  { key: 'attentiveness', label: 'Attentiveness' },
  { key: 'cooperation', label: 'Cooperation' },
  { key: 'perseverance', label: 'Perseverance' },
  { key: 'leadership', label: 'Leadership' },
];

const PSYCHOMOTOR_SKILLS = [
  { key: 'handwriting', label: 'Handwriting' },
  { key: 'drawing', label: 'Drawing/Art' },
  { key: 'verbal_fluency', label: 'Verbal Fluency' },
  { key: 'sport_games', label: 'Sport & Games' },
  { key: 'music', label: 'Music' },
  { key: 'computer_skills', label: 'Computer Skills' },
];

function RatingDots({ value }) {
  return (
    <div style={{ display: 'flex', gap: '2px', alignItems: 'center' }}>
      {[1,2,3,4,5].map(n => (
        <div key={n} style={{
          width: '10px', height: '10px', borderRadius: '50%',
          background: n <= (value || 0) ? '#1e3a5f' : '#e5e7eb',
          border: '1px solid #ccc'
        }} />
      ))}
      <span style={{ marginLeft: '4px', fontSize: '10px', fontWeight: 'bold', color: '#1e3a5f' }}>{value || '-'}</span>
    </div>
  );
}

// SS classes where class/subject position is hidden
const SS_CLASSES = ['SS1 Arts A', 'SS1 Arts B', 'SS1 Com A', 'SS1 Com B', 'SS1 Sci A', 'SS1 Sci B',
  'SS2 Arts A', 'SS2 Arts B', 'SS2 Com A', 'SS2 Com B', 'SS2 Sci A', 'SS2 Sci B',
  'SS3 Arts A', 'SS3 Arts B', 'SS3 Com A', 'SS3 Com B', 'SS3 Sci A', 'SS3 Sci B'];

// Stamp images (transparent background versions via mix-blend-mode)
const PRINCIPAL_STAMP_URL = 'https://media.base44.com/images/public/696cc2e2095499293173480a/5814af416_IMG-20260503-WA0002.jpg';
const PROMOTED_STAMP_URL = 'https://media.base44.com/images/public/696cc2e2095499293173480a/0b5b8ac13_download31.jpg';

export default function ResultSlip({ student, results, settings, term, session, classTeacher, rankings, attendance }) {
  if (!student || !results) return null;

  const section = student.section || 'Primary';
  const isSecondary = section === 'Secondary';
  const isNurseryOrPrimary = section === 'Nursery' || section === 'Primary';
  const isSS = SS_CLASSES.includes(student.current_class);
  const isThirdTerm = term === 'Third Term';

  // Determine if result is approved and promotion status
  const isApproved = results[0]?.status === 'Approved';
  const promotionStatus = results[0]?.promotion_status; // 'Promoted' | 'Repeated' | 'Demoted' | undefined
  const isPromoted = isThirdTerm && isApproved && promotionStatus === 'Promoted';
  const isRepeated = isThirdTerm && isApproved && promotionStatus === 'Repeated';
  const isDemoted = isThirdTerm && isApproved && promotionStatus === 'Demoted';

  // For 3rd term: always show the class the result was recorded in (NOT the updated current_class after promotion)
  const displayClass = results[0]?.class || student.current_class;

  // Calculate totals and averages
  const totalScore = results.reduce((s, r) => s + (r.total || 0), 0);
  const avgScore = results.length ? (totalScore / results.length).toFixed(1) : 0;
  // GPA calculation
  const gpa = results.length
    ? parseFloat((results.reduce((sum, r) => sum + gradeToPoint(r.grade, section), 0) / results.length).toFixed(2))
    : 0;
  const maxGPA = section === 'Secondary' ? 5 : 4;
  const totalInClass = results[0]?.total_in_class || 0;
  const classPosition = results[0]?.class_position || rankings?.classPosition || 0;
  const totalScoreAllSubjects = results[0]?.total_score_all_subjects || totalScore;
  const nextTermBegins = results[0]?.next_term_begins || '';
  const feesArrears = results[0]?.school_fees_arrears || 0;
  const feesCurrent = results[0]?.school_fees_current || 0;

  // Affective + Psychomotor from first result
  const affective = results[0]?.affective_traits || {};
  const psychomotor = results[0]?.psychomotor_skills || {};

  const schoolName = settings?.school_name || 'School Name';
  const logo = settings?.school_logo;
  const address = settings?.address || '';
  const phone = settings?.phone || '';
  const email = settings?.email || '';
  const motto = settings?.motto || '';

  const principalName = settings?.principal_name || 'The Principal';
  const headTeacherName = settings?.head_teacher_name || 'The Head Teacher';

  const tableStyle = {
    width: '100%', borderCollapse: 'collapse', fontSize: '9.5px', marginBottom: '5px'
  };
  const thStyle = {
    background: '#1e3a5f', color: 'white', padding: '3px 5px', border: '1px solid #1e3a5f',
    textAlign: 'center', fontWeight: 'bold', fontSize: '9px'
  };
  const tdStyle = {
    padding: '2.5px 5px', border: '1px solid #b0b8c4', textAlign: 'center', fontSize: '9px'
  };
  const tdLeftStyle = { ...tdStyle, textAlign: 'left' };

  const gradeColor = (grade) => {
    if (!grade) return 'inherit';
    if (grade === 'A1' || grade === 'A') return '#16a34a';
    if (grade.startsWith('B')) return '#2563eb';
    if (grade.startsWith('C')) return '#7c3aed';
    if (grade === 'F9' || grade === 'F') return '#dc2626';
    return '#92400e';
  };

  return (
    <div className="result-slip" style={{
      width: '210mm', minHeight: '297mm', maxHeight: '297mm',
      fontFamily: '"Times New Roman", serif',
      background: 'white', position: 'relative', overflow: 'hidden',
      padding: '7mm 9mm', boxSizing: 'border-box',
      pageBreakAfter: 'always', pageBreakInside: 'avoid',
      fontSize: '10px', color: '#111'
    }}>
      {/* Watermark */}
      {logo && (
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%,-50%)',
          opacity: 0.06, zIndex: 0, pointerEvents: 'none'
        }}>
          <img src={logo} alt="" style={{ width: '180px', height: '180px', objectFit: 'contain' }} />
        </div>
      )}

      <div style={{ position: 'relative', zIndex: 1 }}>
        {/* ===== HEADER ===== */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          borderBottom: '3px double #1e3a5f', paddingBottom: '5px', marginBottom: '5px'
        }}>
          {logo && <img src={logo} alt="" style={{ width: '52px', height: '52px', objectFit: 'contain' }} />}
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#1e3a5f', textTransform: 'uppercase', letterSpacing: '1px' }}>
              {schoolName}
            </div>
            {address && <div style={{ fontSize: '9px', color: '#555', marginTop: '1px' }}>{address}</div>}
            <div style={{ fontSize: '9px', color: '#555' }}>
              {phone && `Tel: ${phone}`}{phone && email && ' | '}{email && `Email: ${email}`}
            </div>
            {motto && <div style={{ fontSize: '9px', color: '#b45309', fontStyle: 'italic', marginTop: '1px' }}>"{motto}"</div>}
            <div style={{
              marginTop: '4px', fontSize: '11px', fontWeight: 'bold', color: 'white',
              background: '#1e3a5f', display: 'inline-block', padding: '2px 12px', borderRadius: '4px'
            }}>
              {term} RESULT — {session} SESSION
            </div>
          </div>
          {logo && <img src={logo} alt="" style={{ width: '52px', height: '52px', objectFit: 'contain' }} />}
        </div>

        {/* ===== STUDENT INFO ===== */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr auto',
          gap: '6px', marginBottom: '5px'
        }}>
          <div style={{
            border: '2px solid #1e3a5f', borderRadius: '4px', padding: '4px 6px',
            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px 10px', fontSize: '9.5px'
          }}>
            <div><b style={{ color: '#1e3a5f' }}>Name:</b> <span style={{ color: '#b45309', fontWeight: 'bold' }}>{student.first_name} {student.middle_name || ''} {student.last_name}</span></div>
            <div><b style={{ color: '#1e3a5f' }}>Adm. No:</b> {student.admission_number}</div>
            <div><b style={{ color: '#1e3a5f' }}>Class:</b> <span style={{ color: '#7c3aed', fontWeight: 'bold' }}>{displayClass}</span></div>
            <div><b style={{ color: '#1e3a5f' }}>Section:</b> {section}</div>
            <div><b style={{ color: '#1e3a5f' }}>Date of Birth:</b> {student.date_of_birth || '—'}</div>
            <div><b style={{ color: '#1e3a5f' }}>Gender:</b> {student.gender || '—'}</div>
            <div><b style={{ color: '#1e3a5f' }}>State of Origin:</b> {student.state_of_origin || '—'}</div>
            <div><b style={{ color: '#1e3a5f' }}>LGA:</b> {student.local_government || '—'}</div>
            <div><b style={{ color: '#1e3a5f' }}>Tribe:</b> {student.tribe || '—'}</div>
            <div><b style={{ color: '#1e3a5f' }}>Blood Group:</b> {student.blood_group || '—'}</div>
            <div><b style={{ color: '#1e3a5f' }}>Genotype:</b> {student.genotype || '—'}</div>
            <div><b style={{ color: '#1e3a5f' }}>Sport House:</b> {student.sport_house || '—'}</div>
            <div><b style={{ color: '#1e3a5f' }}>Weight:</b> {student.weight ? `${student.weight}kg` : '—'}</div>
            <div><b style={{ color: '#1e3a5f' }}>Height:</b> {student.height ? `${student.height}cm` : '—'}</div>
          </div>
          {/* Passport */}
          <div style={{
            width: '55px', height: '65px', border: '2px solid #1e3a5f', borderRadius: '4px',
            overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: '#f0f4f8'
          }}>
            {student.passport_photo
              ? <img src={student.passport_photo} alt="Passport" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <span style={{ fontSize: '7px', color: '#888', textAlign: 'center' }}>Passport Photo</span>
            }
          </div>
        </div>

        {/* ===== PERFORMANCE SUMMARY ===== */}
        <div style={{
          display: 'grid', gridTemplateColumns: isSS ? 'repeat(4, 1fr)' : 'repeat(6, 1fr)',
          gap: '3px', marginBottom: '5px', textAlign: 'center'
        }}>
          {[
            { label: 'Total Score', value: totalScoreAllSubjects, color: '#1e3a5f' },
            { label: 'Average', value: `${avgScore}%`, color: '#16a34a' },
            ...(!isSS ? [
              { label: 'Class Position', value: classPosition ? getPosition(classPosition) : '—', color: '#dc2626' },
              { label: 'Total in Class', value: totalInClass || '—', color: '#7c3aed' },
            ] : []),
            { label: 'GPA', value: `${gpa}/${maxGPA}`, color: '#0891b2' },
            { label: 'Overall Grade', value: results.length ? getGrade(parseFloat(avgScore), section) : '—', color: '#2563eb' },
          ].map((item, i) => (
            <div key={i} style={{
              border: `1.5px solid ${item.color}`, borderRadius: '4px', padding: '3px 2px',
              background: `${item.color}10`
            }}>
              <div style={{ fontSize: '8px', color: '#555' }}>{item.label}</div>
              <div style={{ fontSize: '12px', fontWeight: 'bold', color: item.color }}>{item.value}</div>
            </div>
          ))}
        </div>

        {/* ===== RESULTS TABLE ===== */}
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={{ ...thStyle, textAlign: 'left', width: isSS ? '26%' : '22%' }}>Subject</th>
              <th style={{ ...thStyle, width: '7%' }}>1st CA<br />(10)</th>
              <th style={{ ...thStyle, width: '7%' }}>2nd CA<br />(10)</th>
              <th style={{ ...thStyle, width: '7%' }}>3rd CA<br />(10)</th>
              <th style={{ ...thStyle, width: '8%' }}>Exam<br />(70)</th>
              <th style={{ ...thStyle, width: '8%', background: '#2563eb' }}>Total<br />(100)</th>
              <th style={{ ...thStyle, width: '8%' }}>Class<br />Avg</th>
              {!isSS && <th style={{ ...thStyle, width: '7%' }}>Subj.<br />Pos.</th>}
              <th style={{ ...thStyle, width: '6%' }}>Grade</th>
              <th style={{ ...thStyle, width: '10%' }}>Remark</th>
            </tr>
          </thead>
          <tbody>
            {results.map((r, i) => (
              <tr key={i} style={{ background: i % 2 === 0 ? '#f8f9ff' : '#fff' }}>
                <td style={{ ...tdLeftStyle, fontWeight: '600', color: '#1e3a5f' }}>{r.subject_name}</td>
                <td style={tdStyle}>{r.first_ca ?? '—'}</td>
                <td style={tdStyle}>{r.second_ca ?? '—'}</td>
                <td style={tdStyle}>{r.third_ca ?? '—'}</td>
                <td style={tdStyle}>{r.exam_score ?? '—'}</td>
                <td style={{ ...tdStyle, fontWeight: 'bold', fontSize: '9px', background: '#dbeafe', color: '#1e40af' }}>{r.total ?? '—'}</td>
                <td style={{ ...tdStyle, color: '#6b7280' }}>{r.class_average_score ? parseFloat(r.class_average_score).toFixed(1) : '—'}</td>
                {!isSS && <td style={{ ...tdStyle, color: '#7c3aed', fontWeight: 'bold' }}>{r.subject_position ? getPosition(r.subject_position) : '—'}</td>}
                <td style={{ ...tdStyle, fontWeight: 'bold', color: gradeColor(r.grade) }}>{r.grade || '—'}</td>
                <td style={{ ...tdStyle, fontSize: '7.5px' }}>{r.remark || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* ===== GRADE KEY ===== */}
        <div style={{
          display: 'flex', gap: '8px', fontSize: '8px', marginBottom: '5px',
          background: '#f0f4f8', padding: '3px 6px', borderRadius: '3px', border: '1px solid #c7d2e4'
        }}>
          <b style={{ color: '#1e3a5f', fontSize: '8px' }}>Grade Key:</b>
          {isSecondary
            ? 'A1(75-100)=Excellent | B2(70-74)=V.Good | B3(65-69)=Good | C4(60-64)=Credit | C5(55-59)=Credit | C6(50-54)=Credit | D7(45-49)=Pass | E8(40-44)=Pass | F9(0-39)=Fail'
            : 'A(70-100)=Excellent | B(60-69)=V.Good | C(50-59)=Good | D(45-49)=Pass | E(40-44)=Weak Pass | F(0-39)=Fail'
          }
        </div>

        {/* ===== STATS ROW ===== */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '3px',
          marginBottom: '5px', fontSize: '9px'
        }}>
          {[
            { label: 'No. of Subjects Passed', value: results.filter(r => r.grade && r.grade !== 'F' && r.grade !== 'F9').length, color: '#16a34a' },
            { label: 'No. of Credits (C & above)', value: results.filter(r => ['A1','A','B2','B3','B','C4','C5','C6','C'].includes(r.grade || '')).length, color: '#2563eb' },
            { label: 'No. of Distinctions (A)', value: results.filter(r => r.grade === 'A1' || r.grade === 'A').length, color: '#b45309' },
            { label: 'No. of Subjects Failed', value: results.filter(r => r.grade === 'F9' || r.grade === 'F').length, color: '#dc2626' },
          ].map((item, i) => (
            <div key={i} style={{
              border: `1px solid ${item.color}`, borderRadius: '3px', padding: '2px 4px',
              textAlign: 'center', background: `${item.color}10`
            }}>
              <div style={{ color: '#555', fontSize: '8px' }}>{item.label}</div>
              <div style={{ fontWeight: 'bold', color: item.color, fontSize: '12px' }}>{item.value}</div>
            </div>
          ))}
        </div>

        {/* ===== ATTENDANCE SUMMARY ===== */}
        {attendance && attendance.length > 0 && (() => {
          const present = attendance.filter(a => a.status === 'Present' || a.status === 'Late').length;
          const absent = attendance.filter(a => a.status === 'Absent').length;
          const total = attendance.length;
          const rate = total > 0 ? Math.round((present / total) * 100) : 0;
          return (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '3px', marginBottom: '5px', fontSize: '9px' }}>
              {[
                { label: 'Days Present', value: present, color: '#16a34a' },
                { label: 'Days Absent', value: absent, color: '#dc2626' },
                { label: 'Total School Days', value: total, color: '#1e3a5f' },
                { label: 'Attendance Rate', value: `${rate}%`, color: '#2563eb' },
              ].map((item, i) => (
                <div key={i} style={{ border: `1px solid ${item.color}`, borderRadius: '3px', padding: '2px 4px', textAlign: 'center', background: `${item.color}10` }}>
                  <div style={{ color: '#555', fontSize: '8px' }}>{item.label}</div>
                  <div style={{ fontWeight: 'bold', color: item.color, fontSize: '12px' }}>{item.value}</div>
                </div>
              ))}
            </div>
          );
        })()}

        {/* ===== AFFECTIVE TRAITS + PSYCHOMOTOR ===== */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px', marginBottom: '5px' }}>
          {/* Affective Traits */}
          <div style={{ border: '1.5px solid #1e3a5f', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{
              background: '#1e3a5f', color: 'white', padding: '2px 6px',
              fontSize: '9px', fontWeight: 'bold', textAlign: 'center'
            }}>AFFECTIVE TRAITS</div>
            <div style={{ padding: '3px 4px' }}>
              {AFFECTIVE_TRAITS.map(trait => (
                <div key={trait.key} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '1px 2px', borderBottom: '1px solid #e5e7eb', fontSize: '8.5px'
                }}>
                  <span style={{ color: '#374151' }}>{trait.label}</span>
                  <RatingDots value={affective[trait.key]} />
                </div>
              ))}
            </div>
          </div>
          {/* Psychomotor Skills */}
          <div style={{ border: '1.5px solid #7c3aed', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{
              background: '#7c3aed', color: 'white', padding: '2px 6px',
              fontSize: '9px', fontWeight: 'bold', textAlign: 'center'
            }}>PSYCHOMOTOR SKILLS</div>
            <div style={{ padding: '3px 4px' }}>
              {PSYCHOMOTOR_SKILLS.map(skill => (
                <div key={skill.key} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '1px 2px', borderBottom: '1px solid #e5e7eb', fontSize: '8.5px'
                }}>
                  <span style={{ color: '#374151' }}>{skill.label}</span>
                  <RatingDots value={psychomotor[skill.key]} />
                </div>
              ))}
              {/* Rating key */}
              <div style={{ marginTop: '3px', fontSize: '8px', color: '#6b7280' }}>
                {RATING_KEY.map(k => k.label).join(' | ')}
              </div>
            </div>
          </div>
        </div>

        {/* ===== COMMENTS + NEXT TERM + FEES ===== */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '5px', marginBottom: '5px' }}>
          <div style={{ border: '1px solid #c7d2e4', borderRadius: '4px', padding: '4px 6px' }}>
            {(results[0]?.class_teacher_comment || results[0]?.teacher_comment) && (
              <div style={{ marginBottom: '3px' }}>
                <b style={{ color: '#1e3a5f', fontSize: '8.5px' }}>Class Teacher's Remark:</b>
                <span style={{ fontSize: '8.5px', marginLeft: '4px' }}>{results[0].class_teacher_comment || results[0].teacher_comment}</span>
              </div>
            )}
            {isNurseryOrPrimary && results[0]?.head_teacher_comment && (
              <div style={{ marginBottom: '3px' }}>
                <b style={{ color: '#b45309', fontSize: '8.5px' }}>Head Teacher's Remark:</b>
                <span style={{ fontSize: '8.5px', marginLeft: '4px' }}>{results[0].head_teacher_comment}</span>
              </div>
            )}
            {isSecondary && results[0]?.principal_comment && (
              <div style={{ marginBottom: '3px' }}>
                <b style={{ color: '#7c3aed', fontSize: '8.5px' }}>Principal's Remark:</b>
                <span style={{ fontSize: '8.5px', marginLeft: '4px' }}>{results[0].principal_comment}</span>
              </div>
            )}
            {results[0]?.form_teacher_comment && (
              <div>
                <b style={{ color: '#16a34a', fontSize: '8.5px' }}>Form Teacher's Remark:</b>
                <span style={{ fontSize: '8.5px', marginLeft: '4px' }}>{results[0].form_teacher_comment}</span>
              </div>
            )}
          </div>
          <div style={{ border: '1px solid #c7d2e4', borderRadius: '4px', padding: '4px 6px', fontSize: '9px' }}>
            <div style={{ marginBottom: '3px' }}>
              <b style={{ color: '#1e3a5f' }}>Next Term Begins:</b><br />
              <span style={{ color: '#16a34a', fontWeight: 'bold' }}>{nextTermBegins || '—'}</span>
            </div>
            <div style={{ marginBottom: '3px' }}>
              <b style={{ color: '#dc2626' }}>School Fees Arrears:</b><br />
              <span style={{ color: '#dc2626', fontWeight: 'bold' }}>₦{Number(feesArrears).toLocaleString()}</span>
            </div>
            <div>
              <b style={{ color: '#1e3a5f' }}>Current School Fees:</b><br />
              <span style={{ color: '#1e3a5f', fontWeight: 'bold' }}>₦{Number(feesCurrent).toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* ===== PROMOTION STATEMENT (3rd Term only) ===== */}
        {isThirdTerm && isApproved && promotionStatus && (
          <div style={{
            textAlign: 'center', margin: '4px 0',
            padding: '5px 10px',
            borderRadius: '4px',
            border: `2px solid ${isPromoted ? '#16a34a' : isDemoted ? '#dc2626' : '#b45309'}`,
            background: isPromoted ? '#f0fdf4' : isDemoted ? '#fef2f2' : '#fffbeb',
            fontSize: '10px', fontWeight: 'bold',
            color: isPromoted ? '#15803d' : isDemoted ? '#b91c1c' : '#92400e',
            letterSpacing: '0.5px'
          }}>
            {isPromoted && (() => {
              const parts = session?.split('/');
              const nextSession = parts?.length === 2 ? `${parts[1]}/${parseInt(parts[1]) + 1}` : 'next';
              return `✓ This student has been PROMOTED to ${student.current_class} for the ${nextSession} academic session.`;
            })()}
            {isRepeated && `↺ This student is to REPEAT ${displayClass} in the next academic session.`}
            {isDemoted && `↓ This student has been DEMOTED to ${student.current_class} for the next academic session.`}
          </div>
        )}

        {/* ===== SIGNATURES ===== */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: isNurseryOrPrimary ? '1fr 1fr 1fr' : '1fr 1fr',
          gap: '8px', marginBottom: '5px', marginTop: '4px'
        }}>
          {/* Class/Form Teacher Signature */}
          <div style={{ textAlign: 'center', fontSize: '8.5px' }}>
            <div style={{ borderBottom: '1px solid #1e3a5f', marginBottom: '2px', paddingBottom: '12px' }}></div>
            <b style={{ color: '#1e3a5f' }}>{classTeacher?.name || 'Class/Form Teacher'}</b>
            <div style={{ color: '#555' }}>{classTeacher?.phone || ''}</div>
            <div style={{ color: '#7c3aed' }}>Class/Form Teacher's Signature & Date</div>
          </div>
          {/* HT signature for Nursery/Primary */}
          {isNurseryOrPrimary && (
            <div style={{ textAlign: 'center', fontSize: '8.5px' }}>
              <div style={{ borderBottom: '1px solid #b45309', marginBottom: '2px', paddingBottom: '12px' }}></div>
              <b style={{ color: '#b45309' }}>{headTeacherName}</b>
              <div style={{ color: '#7c3aed' }}>Head Teacher's Signature & Date</div>
            </div>
          )}
          {/* Principal signature for Secondary */}
          {isSecondary && (
            <div style={{ textAlign: 'center', fontSize: '8.5px' }}>
              <div style={{ borderBottom: '1px solid #7c3aed', marginBottom: '2px', paddingBottom: '12px' }}></div>
              <b style={{ color: '#7c3aed' }}>{principalName}</b>
              <div style={{ color: '#7c3aed' }}>Principal's Signature & Date</div>
            </div>
          )}
          {/* Admin signature — ALL sections */}
          <div style={{ textAlign: 'center', fontSize: '8.5px' }}>
            <div style={{ borderBottom: '1px solid #dc2626', marginBottom: '2px', paddingBottom: '12px' }}></div>
            <b style={{ color: '#dc2626' }}>Administrator</b>
            <div style={{ color: '#7c3aed' }}>Admin's Signature & Date</div>
          </div>
        </div>

        {/* ===== FOOTER: Class/Form Teacher contact ===== */}
        <div style={{
          borderTop: '2px solid #1e3a5f', paddingTop: '3px', marginTop: '3px',
          textAlign: 'center', fontSize: '8.5px', color: '#555'
        }}>
          {classTeacher
            ? <>
                <b style={{ color: '#1e3a5f' }}>Class/Form Teacher: {classTeacher.name}</b>
                {classTeacher.phone && <> | Tel: {classTeacher.phone}</>}
                {classTeacher.email && <> | Email: {classTeacher.email}</>}
                <br />
              </>
            : null
          }
          <span style={{ color: '#1e3a5f', fontStyle: 'italic' }}>{schoolName} — {term} {session}</span>
        </div>

        {/* ===== APPROVAL STAMP ===== */}
        {isApproved && (
          <div style={{
            position: 'absolute', bottom: '18mm', right: '10mm',
            width: '90px', height: '65px', zIndex: 10, pointerEvents: 'none'
          }}>
            <img
              src={PRINCIPAL_STAMP_URL}
              alt="Approved"
              style={{
                width: '100%', height: '100%', objectFit: 'contain',
                mixBlendMode: 'multiply', opacity: 0.82,
                filter: 'contrast(1.1) saturate(1.2)'
              }}
            />
          </div>
        )}

        {/* ===== PROMOTED STAMP ===== */}
        {isPromoted && (
          <div style={{
            position: 'absolute', bottom: '18mm', left: '10mm',
            width: '90px', height: '90px', zIndex: 10, pointerEvents: 'none'
          }}>
            <img
              src={PROMOTED_STAMP_URL}
              alt="Promoted"
              style={{
                width: '100%', height: '100%', objectFit: 'contain',
                mixBlendMode: 'multiply', opacity: 0.82,
                filter: 'contrast(1.1) saturate(1.2)'
              }}
            />
          </div>
        )}
        {/* Repeated / Demoted text stamp */}
        {(isRepeated || isDemoted) && (
          <div style={{
            position: 'absolute', bottom: '18mm', left: '10mm',
            width: '90px', height: '90px', zIndex: 10, pointerEvents: 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: `3px solid ${isDemoted ? '#dc2626' : '#b45309'}`,
            borderRadius: '50%', transform: 'rotate(-20deg)',
            background: 'transparent'
          }}>
            <span style={{
              fontSize: '11px', fontWeight: 'bold', textAlign: 'center', lineHeight: '1.2',
              color: isDemoted ? '#dc2626' : '#b45309',
              textTransform: 'uppercase', letterSpacing: '1px'
            }}>
              {isDemoted ? 'DEMOTED' : 'REPEAT CLASS'}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}