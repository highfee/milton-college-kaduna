import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

const EMAILJS_SERVICE_ID = 'service_6sssd2s';
const EMAILJS_TEMPLATE_ID = 'template_jrrxz2o';
const EMAILJS_PUBLIC_KEY = 'lIf1A2oKN5LRjDPfK';

Deno.serve(async (req) => {
  try {
    const body = await req.json();
    const { type, assignment_id, exam_id, student_name, admission_number, title, class_name, score, total_marks, has_theory } = body;

    if (!type || !student_name || !title) {
      return Response.json({ error: 'type, student_name, and title are required' }, { status: 400 });
    }

    const base44 = createClientFromRequest(req);
    let teacherEmail = null;
    let teacherName = 'Teacher';

    if (type === 'cbt' && exam_id) {
      const exam = await base44.asServiceRole.entities.CBTExam.get(exam_id);
      teacherEmail = exam?.created_by;
    } else if (type === 'assignment' && assignment_id) {
      const assignment = await base44.asServiceRole.entities.Assignment.get(assignment_id);
      if (assignment?.teacher_id) {
        const teacher = await base44.asServiceRole.entities.Teacher.get(assignment.teacher_id);
        teacherEmail = teacher?.email;
        teacherName = teacher ? `${teacher.first_name} ${teacher.last_name}` : 'Teacher';
      } else if (assignment?.teacher_name) {
        teacherName = assignment.teacher_name;
      }
    }

    if (!teacherEmail) {
      return Response.json({ success: false, message: 'Teacher email not found — skipping notification' });
    }

    const typeLabel = type === 'cbt' ? 'CBT Exam' : 'Assignment';
    const subjectLine = `${typeLabel} Submitted: ${title} — ${student_name}`;

    const scoreLine = score !== undefined && total_marks !== undefined
      ? `Instant Score: ${score}/${total_marks}\n`
      : '';
    const theoryLine = has_theory
      ? 'Note: This exam contains theory questions that require manual grading.\n'
      : '';

    const message = `Dear ${teacherName},

A student has just submitted their ${typeLabel}.

Student: ${student_name}
Admission No: ${admission_number || 'N/A'}
Class: ${class_name || 'N/A'}
${typeLabel}: ${title}
${scoreLine}${theoryLine}
Please log in to your Teacher Portal → Classroom Management System to review and grade the submission.

Milton College of Arts and Science, Kaduna`;

    const emailResponse = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        service_id: EMAILJS_SERVICE_ID,
        template_id: EMAILJS_TEMPLATE_ID,
        user_id: EMAILJS_PUBLIC_KEY,
        accessToken: Deno.env.get('EMAILJS_PRIVATE_KEY'),
        template_params: { to_email: teacherEmail, subject: subjectLine, message }
      })
    });

    if (!emailResponse.ok) {
      const errText = await emailResponse.text();
      return Response.json({ error: `EmailJS error: ${errText}` }, { status: 500 });
    }

    return Response.json({ success: true, message: 'Teacher notification sent' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});