import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import {
  CheckCircle, XCircle, Eye, Download, FileText, Search, MessageSquare
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const STATUS_COLORS = {
  'Draft': 'bg-gray-100 text-gray-800',
  'Pending Approval': 'bg-amber-100 text-amber-800',
  'Approved': 'bg-blue-100 text-blue-800',
  'Rejected': 'bg-red-100 text-red-800',
  'Published': 'bg-green-100 text-green-800',
};

/**
 * Reusable Lesson Note review panel for Principal / Head Teacher portals.
 * props:
 *  - reviewer: Teacher object (Principal or Head Teacher)
 *  - sections: array of sections in scope, e.g. ['Secondary'] or ['Nursery','Primary']
 */
export default function LessonNoteReview({ reviewer, sections }) {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('Pending Approval');
  const [selected, setSelected] = useState(null);
  const [comment, setComment] = useState('');
  const [reasons, setReasons] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadNotes(); }, []);

  const loadNotes = async () => {
    setLoading(true);
    const all = await base44.entities.LessonNote.list('-created_date', 500);
    // Only notes in this reviewer's section scope, excluding Drafts
    setNotes(all.filter(n => sections.includes(n.section) && n.status !== 'Draft'));
    setLoading(false);
  };

  const filtered = notes.filter(n => {
    const matchStatus = statusFilter === 'All' || n.status === statusFilter;
    const q = search.toLowerCase();
    const matchSearch = !q || `${n.title} ${n.topic} ${n.subject_name} ${n.teacher_name}`.toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  const openReview = (note) => {
    setSelected(note);
    setComment(note.review_comment || '');
    setReasons(note.rejection_reasons || '');
  };

  const handleApprove = async () => {
    setSaving(true);
    await base44.entities.LessonNote.update(selected.id, {
      status: 'Approved',
      reviewer_id: reviewer.id,
      reviewer_name: `${reviewer.first_name} ${reviewer.last_name}`,
      reviewer_role: reviewer.teacher_type,
      review_comment: comment,
      rejection_reasons: '',
      reviewed_date: new Date().toISOString().split('T')[0],
    });
    setSaving(false);
    setSelected(null);
    loadNotes();
  };

  const handleReject = async () => {
    if (!reasons.trim()) { alert('Please state the reasons for rejection and what the teacher should change.'); return; }
    setSaving(true);
    await base44.entities.LessonNote.update(selected.id, {
      status: 'Rejected',
      reviewer_id: reviewer.id,
      reviewer_name: `${reviewer.first_name} ${reviewer.last_name}`,
      reviewer_role: reviewer.teacher_type,
      review_comment: comment,
      rejection_reasons: reasons,
      reviewed_date: new Date().toISOString().split('T')[0],
      revision_count: (selected.revision_count || 0) + 1,
    });
    setSaving(false);
    setSelected(null);
    loadNotes();
  };

  if (loading) return (
    <div className="flex justify-center py-8">
      <div className="animate-spin w-8 h-8 border-4 border-[#1e3a5f] border-t-transparent rounded-full" />
    </div>
  );

  return (
    <div className="space-y-4">
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle>Lesson Note Approvals — {sections.join(' / ')}</CardTitle>
          <p className="text-sm text-gray-500">Review, comment, approve or reject lesson notes submitted by teachers in your section.</p>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3 mb-4">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
              <Input className="pl-9" placeholder="Search title, topic, teacher..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Statuses</SelectItem>
                <SelectItem value="Pending Approval">Pending Approval</SelectItem>
                <SelectItem value="Approved">Approved</SelectItem>
                <SelectItem value="Rejected">Rejected</SelectItem>
                <SelectItem value="Published">Published</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Teacher</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Topic</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(n => (
                  <TableRow key={n.id}>
                    <TableCell className="font-medium">{n.title}</TableCell>
                    <TableCell className="text-sm">{n.teacher_name}</TableCell>
                    <TableCell className="text-sm">{n.subject_name || '—'}</TableCell>
                    <TableCell><Badge variant="outline">{n.class}</Badge></TableCell>
                    <TableCell className="text-sm">{n.topic}</TableCell>
                    <TableCell><Badge className={STATUS_COLORS[n.status]}>{n.status}</Badge></TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" onClick={() => openReview(n)}>
                        <Eye className="w-4 h-4 mr-1" /> Review
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && <TableRow><TableCell colSpan={7} className="text-center py-8 text-gray-400">No lesson notes found</TableCell></TableRow>}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
          {selected && (
            <>
              <DialogHeader><DialogTitle>{selected.title}</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div className="flex flex-wrap gap-4 p-3 bg-gray-50 rounded-lg text-sm">
                  <div><p className="text-xs text-gray-500">Teacher</p><p className="font-medium">{selected.teacher_name}</p></div>
                  <div><p className="text-xs text-gray-500">Subject</p><p className="font-medium">{selected.subject_name}</p></div>
                  <div><p className="text-xs text-gray-500">Class</p><p className="font-medium">{selected.class}</p></div>
                  <div><p className="text-xs text-gray-500">Term</p><p className="font-medium">{selected.term}</p></div>
                  {selected.week && <div><p className="text-xs text-gray-500">Week</p><p className="font-medium">{selected.week}</p></div>}
                  <div><p className="text-xs text-gray-500">Topic</p><p className="font-medium">{selected.topic}</p></div>
                </div>

                <div>
                  <p className="text-xs text-gray-500 mb-1">Lesson Note Content</p>
                  <div className="p-4 bg-gray-50 rounded-lg whitespace-pre-wrap text-sm max-h-72 overflow-y-auto border">
                    {selected.content || '(No typed content provided)'}
                  </div>
                </div>

                {selected.attachment_url && (
                  <a href={selected.attachment_url} target="_blank" rel="noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-blue-600 underline">
                    <Download className="w-4 h-4" /> Download attached file
                  </a>
                )}

                <div>
                  <Label>Comment / Observation</Label>
                  <Textarea rows={3} value={comment} onChange={e => setComment(e.target.value)}
                    placeholder="General comment about the lesson note..." />
                </div>

                <div>
                  <Label>Reasons for Rejection / Topics to Change <span className="text-red-500">*</span> <span className="text-xs text-gray-400">(required only when rejecting)</span></Label>
                  <Textarea rows={3} value={reasons} onChange={e => setReasons(e.target.value)}
                    placeholder="Highlight the specific topics or content the teacher should change or edit..." />
                </div>

                <div className="flex gap-2 justify-end flex-wrap pt-2">
                  <Button variant="outline" onClick={() => setSelected(null)}>Cancel</Button>
                  <Button variant="destructive" onClick={handleReject} disabled={saving || selected.status === 'Published'}>
                    <XCircle className="w-4 h-4 mr-2" />{saving ? 'Saving...' : 'Reject'}
                  </Button>
                  <Button onClick={handleApprove} disabled={saving || selected.status === 'Published'}
                    className="bg-green-600 hover:bg-green-700">
                    <CheckCircle className="w-4 h-4 mr-2" />{saving ? 'Saving...' : 'Approve'}
                  </Button>
                </div>
                {selected.status === 'Published' && (
                  <p className="text-xs text-center text-gray-500">This lesson note is already published and locked from further review.</p>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}