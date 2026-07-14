import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const connectorId = body.connectorId;
    if (!connectorId) {
      return Response.json({ error: 'Missing connectorId' }, { status: 400 });
    }

    // Get the current app user's Google Calendar OAuth token
    const { accessToken } = await base44.asServiceRole.connectors.getCurrentAppUserConnection(connectorId);
    const authHeader = {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    };

    let syncedCount = 0;
    const errors = [];

    // ── 1. Sync published CBT exams ──
    const exams = await base44.asServiceRole.entities.CBTExam.filter({ status: 'Published' });

    for (const exam of exams) {
      if (!exam.start_date) continue;

      const eventId = `mcas-cbt-${exam.id}`.substring(0, 100);
      const startDate = new Date(exam.start_date);
      const endDate = exam.end_date
        ? new Date(exam.end_date)
        : new Date(startDate.getTime() + (exam.duration_minutes || 60) * 60000);

      const eventData = {
        id: eventId,
        summary: `CBT: ${exam.title}`,
        description: [
          `Subject: ${exam.subject_name || 'N/A'}`,
          `Type: ${exam.exam_type}`,
          `Classes: ${(exam.classes || []).join(', ')}`,
          `Term: ${exam.term} | Session: ${exam.session}`,
          `Duration: ${exam.duration_minutes} minutes`,
          `Total Marks: ${exam.total_marks || 'N/A'} | Pass Mark: ${exam.pass_mark || 'N/A'}`,
          '',
          `Instructions:\n${exam.instructions || 'N/A'}`
        ].join('\n'),
        start: { dateTime: startDate.toISOString() },
        end: { dateTime: endDate.toISOString() },
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'email', minutes: 1440 },
            { method: 'popup', minutes: 30 }
          ]
        }
      };

      try {
        const res = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
          { method: 'PUT', headers: authHeader, body: JSON.stringify(eventData) }
        );
        if (res.ok) syncedCount++;
        else errors.push({ item: `CBT: ${exam.title}`, error: `HTTP ${res.status}` });
      } catch (e) {
        errors.push({ item: `CBT: ${exam.title}`, error: e.message });
      }
    }

    // ── 2. Sync academic calendar activities ──
    const calendars = await base44.asServiceRole.entities.Calendar.filter({ status: 'Active' });

    for (const cal of calendars) {
      if (!cal.activities || cal.activities.length === 0) continue;

      for (let i = 0; i < cal.activities.length; i++) {
        const activity = cal.activities[i];
        if (!activity.date || !activity.activity) continue;

        const eventId = `mcas-cal-${cal.id}-${i}`.substring(0, 100);
        const dateStr = new Date(activity.date).toISOString().split('T')[0];

        const eventData = {
          id: eventId,
          summary: activity.activity,
          description: [
            `Calendar: ${cal.title}`,
            `Section: ${cal.section}`,
            `Term: ${cal.term} | Session: ${cal.session}`
          ].join('\n'),
          start: { date: dateStr },
          end: { date: dateStr },
          reminders: {
            useDefault: false,
            overrides: [
              { method: 'email', minutes: 1440 },
              { method: 'popup', minutes: 60 }
            ]
          }
        };

        try {
          const res = await fetch(
            `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
            { method: 'PUT', headers: authHeader, body: JSON.stringify(eventData) }
          );
          if (res.ok) syncedCount++;
          else errors.push({ item: activity.activity, error: `HTTP ${res.status}` });
        } catch (e) {
          errors.push({ item: activity.activity, error: e.message });
        }
      }
    }

    return Response.json({
      success: true,
      synced: syncedCount,
      examsProcessed: exams.length,
      calendarsProcessed: calendars.length,
      errors
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});