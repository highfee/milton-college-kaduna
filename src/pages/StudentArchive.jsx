import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { ArrowLeft, Search, Archive, Eye, Trash2, UserX, GraduationCap, Filter, Download } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';

const SS3_CLASSES = ['SS3 Arts A', 'SS3 Arts B', 'SS3 Com A', 'SS3 Com B', 'SS3 Sci A', 'SS3 Sci B'];

const reasonColor = {
  Graduated: 'bg-green-100 text-green-800',
  Withdrawn: 'bg-yellow-100 text-yellow-800',
  Expelled: 'bg-red-100 text-red-800',
  Suspended: 'bg-orange-100 text-orange-800',
  Transferred: 'bg-blue-100 text-blue-800',
  Other: 'bg-gray-100 text-gray-800',
};

export default function StudentArchive() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [archived, setArchived] = useState([]);
  const [activeStudents, setActiveStudents] = useState([]);
  const [search, setSearch] = useState('');
  const [filterReason, setFilterReason] = useState('all');
  const [filterSection, setFilterSection] = useState('all');
  const [selected, setSelected] = useState(null);
  const [archivingStudent, setArchivingStudent] = useState(null);
  const [archiveForm, setArchiveForm] = useState({ archive_reason: 'Graduated', archive_notes: '' });
  const [tab, setTab] = useState('archived');
  const { toast } = useToast();

  useEffect(() => {
    init();
  }, []);

  const init = async () => {
    const userData = await base44.auth.me();
    if (userData.role !== 'admin') {
      setLoading(false);
      return;
    }
    setUser(userData);
    await loadAll();
  };

  const loadAll = async () => {
    setLoading(true);
    const [archivedData, studentsData] = await Promise.all([
      base44.entities.ArchivedStudent.list('-year_archived', 200),
      base44.entities.Student.list()
    ]);
    setArchived(archivedData);
    // Show only SS3 students eligible for archiving (graduation). Primary 5 students are promoted/demoted by head teacher into JSS1.
    setActiveStudents(studentsData.filter(s => SS3_CLASSES.includes(s.current_class)));
    setLoading(false);
  };

  const handleArchiveStudent = async () => {
    if (!archivingStudent) return;
    setLoading(true);
    try {
      // Fetch all results and fee payments for this student
      const [results, payments] = await Promise.all([
        base44.entities.Result.filter({ student_id: archivingStudent.id }),
        base44.entities.SchoolFeePayment.filter({ student_name: archivingStudent.first_name + ' ' + archivingStudent.last_name })
      ]);

      const archiveData = {
        student_id: archivingStudent.id,
        admission_number: archivingStudent.admission_number,
        first_name: archivingStudent.first_name,
        last_name: archivingStudent.last_name,
        middle_name: archivingStudent.middle_name || '',
        date_of_birth: archivingStudent.date_of_birth,
        gender: archivingStudent.gender,
        passport_photo: archivingStudent.passport_photo || '',
        section: archivingStudent.section,
        final_class: archivingStudent.current_class,
        year_admitted: archivingStudent.admission_date?.split('-')[0] || archivingStudent.current_session?.split('/')[0] || '',
        year_archived: new Date().getFullYear().toString(),
        archive_reason: archiveForm.archive_reason,
        archive_notes: archiveForm.archive_notes,
        parent_name: archivingStudent.parent_name || '',
        parent_phone: archivingStudent.parent_phone || '',
        parent_email: archivingStudent.parent_email || '',
        address: archivingStudent.address || '',
        blood_group: archivingStudent.blood_group || '',
        genotype: archivingStudent.genotype || '',
        state_of_origin: archivingStudent.state_of_origin || '',
        local_government: archivingStudent.local_government || '',
        tribe: archivingStudent.tribe || '',
        sport_house: archivingStudent.sport_house || '',
        weight: archivingStudent.weight || 0,
        height: archivingStudent.height || 0,
        results_snapshot: results,
        fee_payments_snapshot: payments,
      };

      await base44.entities.ArchivedStudent.create(archiveData);
      // Update student status
      await base44.entities.Student.update(archivingStudent.id, { status: archiveForm.archive_reason === 'Graduated' ? 'Graduated' : archiveForm.archive_reason === 'Expelled' ? 'Withdrawn' : 'Withdrawn' });

      toast({ title: `${archivingStudent.first_name} ${archivingStudent.last_name} archived successfully.` });
      setArchivingStudent(null);
      setArchiveForm({ archive_reason: 'Graduated', archive_notes: '' });
      await loadAll();
    } catch (e) {
      toast({ title: 'Error archiving student: ' + e.message, variant: 'destructive' });
    }
    setLoading(false);
  };

  const filteredArchived = archived.filter(s => {
    const matchSearch = !search || `${s.first_name} ${s.last_name} ${s.admission_number}`.toLowerCase().includes(search.toLowerCase());
    const matchReason = filterReason === 'all' || s.archive_reason === filterReason;
    const matchSection = filterSection === 'all' || s.section === filterSection;
    return matchSearch && matchReason && matchSection;
  });

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <UserX className="w-16 h-16 text-red-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-800 mb-2">Access Restricted</h2>
            <p className="text-gray-500 mb-4">This section is only accessible by administrators.</p>
            <Link to="/AdminPortal"><Button variant="outline"><ArrowLeft className="w-4 h-4 mr-2" />Back to Admin Portal</Button></Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin w-10 h-10 border-4 border-[#1e3a5f] border-t-transparent rounded-full" /></div>;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-[#1e3a5f] text-white px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/AdminPortal"><ArrowLeft className="w-5 h-5 hover:opacity-70 cursor-pointer" /></Link>
            <Archive className="w-6 h-6" />
            <div>
              <h1 className="text-xl font-bold">Student Archive</h1>
              <p className="text-sm text-white/70">Graduated, withdrawn, expelled & transferred students</p>
            </div>
          </div>
          <Badge className="bg-white/20 text-white border-0">{archived.length} Archived</Badge>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="archived">📦 Archive ({archived.length})</TabsTrigger>
            <TabsTrigger value="move">🎓 Move to Archive ({activeStudents.length})</TabsTrigger>
          </TabsList>

          {/* ARCHIVED LIST */}
          <TabsContent value="archived">
            {/* Filters */}
            <div className="flex flex-wrap gap-3 mb-4">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                <Input className="pl-9" placeholder="Search by name or admission number..." value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <Select value={filterReason} onValueChange={setFilterReason}>
                <SelectTrigger className="w-44"><SelectValue placeholder="Reason" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Reasons</SelectItem>
                  {['Graduated', 'Withdrawn', 'Expelled', 'Suspended', 'Transferred', 'Other'].map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filterSection} onValueChange={setFilterSection}>
                <SelectTrigger className="w-40"><SelectValue placeholder="Section" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sections</SelectItem>
                  <SelectItem value="Nursery">Nursery</SelectItem>
                  <SelectItem value="Primary">Primary</SelectItem>
                  <SelectItem value="Secondary">Secondary</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Card className="border-0 shadow-sm">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        {['Photo', 'Name', 'Adm. No', 'Section', 'Final Class', 'Year In', 'Year Out', 'Reason', 'Actions'].map(h => (
                          <th key={h} className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredArchived.length === 0 ? (
                        <tr><td colSpan={9} className="text-center py-12 text-gray-400">No archived students found</td></tr>
                      ) : filteredArchived.map(s => (
                        <tr key={s.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            {s.passport_photo
                              ? <img src={s.passport_photo} alt="" className="w-9 h-9 rounded-full object-cover border" />
                              : <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-500">{s.first_name?.[0]}{s.last_name?.[0]}</div>
                            }
                          </td>
                          <td className="px-4 py-3 font-medium text-sm">{s.first_name} {s.middle_name} {s.last_name}</td>
                          <td className="px-4 py-3 text-sm font-mono">{s.admission_number}</td>
                          <td className="px-4 py-3 text-sm">{s.section}</td>
                          <td className="px-4 py-3 text-sm">{s.final_class}</td>
                          <td className="px-4 py-3 text-sm">{s.year_admitted}</td>
                          <td className="px-4 py-3 text-sm">{s.year_archived}</td>
                          <td className="px-4 py-3">
                            <Badge className={reasonColor[s.archive_reason] || 'bg-gray-100 text-gray-700'}>{s.archive_reason}</Badge>
                          </td>
                          <td className="px-4 py-3">
                            <Button size="sm" variant="outline" onClick={() => setSelected(s)}>
                              <Eye className="w-3 h-3 mr-1" />View
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* MOVE TO ARCHIVE */}
          <TabsContent value="move">
            <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
              <strong>Note:</strong> Only SS3 graduates are shown here for archiving at the end of 3rd term. Primary 5 students are promoted to JSS1 (or demoted) by the Head Teacher and remain in the active students list. Archiving will snapshot all results and fee records permanently.
            </div>
            <Card className="border-0 shadow-sm">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        {['Photo', 'Name', 'Adm. No', 'Class', 'Section', 'Action'].map(h => (
                          <th key={h} className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {activeStudents.length === 0 ? (
                        <tr><td colSpan={6} className="text-center py-12 text-gray-400">No SS3 graduates found for archiving</td></tr>
                      ) : activeStudents.map(s => (
                        <tr key={s.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            {s.passport_photo
                              ? <img src={s.passport_photo} alt="" className="w-9 h-9 rounded-full object-cover border" />
                              : <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-500">{s.first_name?.[0]}{s.last_name?.[0]}</div>
                            }
                          </td>
                          <td className="px-4 py-3 font-medium text-sm">{s.first_name} {s.middle_name || ''} {s.last_name}</td>
                          <td className="px-4 py-3 text-sm font-mono">{s.admission_number}</td>
                          <td className="px-4 py-3 text-sm">{s.current_class}</td>
                          <td className="px-4 py-3 text-sm">{s.section}</td>
                          <td className="px-4 py-3">
                            <Button size="sm" className="bg-[#1e3a5f] hover:bg-[#2c4a6e]" onClick={() => { setArchivingStudent(s); setArchiveForm({ archive_reason: 'Graduated', archive_notes: '' }); }}>
                              <Archive className="w-3 h-3 mr-1" />Archive
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* View Archive Dialog */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Archived Student: {selected?.first_name} {selected?.last_name}</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-6">
              {/* Personal Info */}
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <h3 className="font-semibold text-[#1e3a5f] border-b pb-1">Personal Information</h3>
                  {[
                    ['Admission No', selected.admission_number],
                    ['Full Name', `${selected.first_name} ${selected.middle_name || ''} ${selected.last_name}`],
                    ['Date of Birth', selected.date_of_birth],
                    ['Gender', selected.gender],
                    ['Blood Group', selected.blood_group],
                    ['Genotype', selected.genotype],
                    ['State of Origin', selected.state_of_origin],
                    ['LGA', selected.local_government],
                    ['Sport House', selected.sport_house],
                  ].map(([label, val]) => val ? (
                    <div key={label} className="flex gap-2 text-sm"><span className="font-medium text-gray-600 w-32">{label}:</span><span>{val}</span></div>
                  ) : null)}
                </div>
                <div className="space-y-2">
                  <h3 className="font-semibold text-[#1e3a5f] border-b pb-1">Academic & Archive Info</h3>
                  {[
                    ['Section', selected.section],
                    ['Final Class', selected.final_class],
                    ['Year Admitted', selected.year_admitted],
                    ['Year Archived', selected.year_archived],
                    ['Archive Reason', selected.archive_reason],
                    ['Notes', selected.archive_notes],
                  ].map(([label, val]) => val ? (
                    <div key={label} className="flex gap-2 text-sm"><span className="font-medium text-gray-600 w-32">{label}:</span><span>{val}</span></div>
                  ) : null)}
                  <h3 className="font-semibold text-[#1e3a5f] border-b pb-1 mt-4">Parent/Guardian</h3>
                  {[
                    ['Parent Name', selected.parent_name],
                    ['Phone', selected.parent_phone],
                    ['Email', selected.parent_email],
                    ['Address', selected.address],
                  ].map(([label, val]) => val ? (
                    <div key={label} className="flex gap-2 text-sm"><span className="font-medium text-gray-600 w-32">{label}:</span><span>{val}</span></div>
                  ) : null)}
                </div>
              </div>

              {/* Results */}
              <div>
                <h3 className="font-semibold text-[#1e3a5f] border-b pb-1 mb-3">Academic Results ({selected.results_snapshot?.length || 0} records)</h3>
                {selected.results_snapshot?.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs border-collapse">
                      <thead>
                        <tr className="bg-[#1e3a5f] text-white">
                          <th className="px-2 py-1 text-left">Class</th>
                          <th className="px-2 py-1 text-left">Term</th>
                          <th className="px-2 py-1 text-left">Session</th>
                          <th className="px-2 py-1 text-left">Subject</th>
                          <th className="px-2 py-1">1st CA</th>
                          <th className="px-2 py-1">2nd CA</th>
                          <th className="px-2 py-1">3rd CA</th>
                          <th className="px-2 py-1">Exam</th>
                          <th className="px-2 py-1">Total</th>
                          <th className="px-2 py-1">Grade</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selected.results_snapshot.map((r, i) => (
                          <tr key={i} className={i % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                            <td className="px-2 py-1 border">{r.class}</td>
                            <td className="px-2 py-1 border">{r.term}</td>
                            <td className="px-2 py-1 border">{r.session}</td>
                            <td className="px-2 py-1 border font-medium">{r.subject_name}</td>
                            <td className="px-2 py-1 border text-center">{r.first_ca}</td>
                            <td className="px-2 py-1 border text-center">{r.second_ca}</td>
                            <td className="px-2 py-1 border text-center">{r.third_ca}</td>
                            <td className="px-2 py-1 border text-center">{r.exam_score}</td>
                            <td className="px-2 py-1 border text-center font-bold">{r.total}</td>
                            <td className="px-2 py-1 border text-center font-bold text-green-700">{r.grade}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : <p className="text-sm text-gray-400">No results found.</p>}
              </div>

              {/* Fee Payments */}
              <div>
                <h3 className="font-semibold text-[#1e3a5f] border-b pb-1 mb-3">Fee Payments ({selected.fee_payments_snapshot?.length || 0} receipts)</h3>
                {selected.fee_payments_snapshot?.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs border-collapse">
                      <thead>
                        <tr className="bg-emerald-600 text-white">
                          <th className="px-2 py-1 text-left">Receipt No</th>
                          <th className="px-2 py-1 text-left">Term</th>
                          <th className="px-2 py-1 text-left">Session</th>
                          <th className="px-2 py-1">Amount Paid</th>
                          <th className="px-2 py-1">Balance</th>
                          <th className="px-2 py-1">Date</th>
                          <th className="px-2 py-1">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selected.fee_payments_snapshot.map((p, i) => (
                          <tr key={i} className={i % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                            <td className="px-2 py-1 border font-mono">{p.receipt_number}</td>
                            <td className="px-2 py-1 border">{p.term}</td>
                            <td className="px-2 py-1 border">{p.session}</td>
                            <td className="px-2 py-1 border text-center text-green-700 font-bold">₦{(p.amount_paid || 0).toLocaleString()}</td>
                            <td className="px-2 py-1 border text-center text-red-600">₦{(p.balance || 0).toLocaleString()}</td>
                            <td className="px-2 py-1 border">{p.payment_date}</td>
                            <td className="px-2 py-1 border text-center">{p.status}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : <p className="text-sm text-gray-400">No fee payment records found.</p>}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Archive Student Dialog */}
      <Dialog open={!!archivingStudent} onOpenChange={() => setArchivingStudent(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Archive Student: {archivingStudent?.first_name} {archivingStudent?.last_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
              This will permanently snapshot all results and fee records for this student into the archive.
            </div>
            <div>
              <Label>Reason for Archiving *</Label>
              <Select value={archiveForm.archive_reason} onValueChange={v => setArchiveForm({ ...archiveForm, archive_reason: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['Graduated', 'Withdrawn', 'Expelled', 'Suspended', 'Transferred', 'Other'].map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Notes (optional)</Label>
              <Textarea value={archiveForm.archive_notes} onChange={e => setArchiveForm({ ...archiveForm, archive_notes: e.target.value })} rows={3} placeholder="Add notes e.g. reason for expulsion, transfer school, etc." />
            </div>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setArchivingStudent(null)}>Cancel</Button>
              <Button className="bg-[#1e3a5f] hover:bg-[#2c4a6e]" onClick={handleArchiveStudent} disabled={loading}>
                <Archive className="w-4 h-4 mr-2" />Confirm Archive
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}