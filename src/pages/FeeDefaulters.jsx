import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Search, AlertCircle, MessageSquare, Mail } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';

export default function FeeDefaulters() {
  const [students, setStudents] = useState([]);
  const [payments, setPayments] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterClass, setFilterClass] = useState('all');
  const [filterTerm, setFilterTerm] = useState('First Term');
  const [filterSession, setFilterSession] = useState('');
  const { toast } = useToast();

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    const [s, p, st] = await Promise.all([
      base44.entities.Student.filter({ status: 'Active' }),
      base44.entities.SchoolFeePayment.list('-created_date', 1000),
      base44.entities.SchoolSettings.list()
    ]);
    setStudents(s);
    setPayments(p);
    if (st[0]) {
      setSettings(st[0]);
      setFilterSession(st[0].current_session || '');
      setFilterTerm(st[0].current_term || 'First Term');
    }
    setLoading(false);
  };

  // Students who have no payment for the selected term/session
  const defaulters = students.filter(s => {
    const matchSearch = `${s.first_name} ${s.last_name} ${s.admission_number || ''}`.toLowerCase().includes(search.toLowerCase());
    const matchClass = filterClass === 'all' || s.current_class === filterClass;
    const hasPaid = payments.some(p =>
      p.student_id === s.id &&
      p.term === filterTerm &&
      (!filterSession || p.session === filterSession) &&
      p.status !== 'Pending'
    );
    return matchSearch && matchClass && !hasPaid;
  });

  const sendWhatsApp = (student) => {
    const msg = encodeURIComponent(
      `Dear Parent/Guardian of ${student.first_name} ${student.last_name} (${student.current_class}),\n\nThis is a reminder from Milton College of Arts & Science that the school fees for ${filterTerm} ${filterSession} are yet to be paid. Please visit the school to make payment.\n\nThank you.`
    );
    const phone = student.parent_phone?.replace(/\D/g, '');
    if (!phone) { toast({ title: 'No phone number for this student', variant: 'destructive' }); return; }
    window.open(`https://wa.me/${phone}?text=${msg}`, '_blank');
  };

  const sendEmail = (student) => {
    if (!student.parent_email) { toast({ title: 'No email for this student', variant: 'destructive' }); return; }
    const subject = encodeURIComponent(`School Fees Reminder - ${student.first_name} ${student.last_name}`);
    const body = encodeURIComponent(`Dear Parent/Guardian,\n\nThe school fees for ${student.first_name} ${student.last_name} (${student.current_class}) for ${filterTerm} ${filterSession} are yet to be paid.\n\nPlease contact the school at your earliest convenience.\n\nMilton College of Arts & Science`);
    window.open(`mailto:${student.parent_email}?subject=${subject}&body=${body}`, '_blank');
  };

  const classes = [...new Set(students.map(s => s.current_class))].sort();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-[#1e3a5f] text-white px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center gap-3">
          <Link to="/AccountantPortal"><ArrowLeft className="w-5 h-5 hover:opacity-70" /></Link>
          <AlertCircle className="w-6 h-6 text-yellow-300" />
          <h1 className="text-xl font-bold">Fee Defaulters</h1>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex flex-wrap gap-3 mb-6">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input placeholder="Search student..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Select value={filterTerm} onValueChange={setFilterTerm}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="First Term">First Term</SelectItem>
              <SelectItem value="Second Term">Second Term</SelectItem>
              <SelectItem value="Third Term">Third Term</SelectItem>
            </SelectContent>
          </Select>
          <Input placeholder="Session e.g. 2024/2025" value={filterSession} onChange={e => setFilterSession(e.target.value)} className="w-44" />
          <Select value={filterClass} onValueChange={setFilterClass}>
            <SelectTrigger className="w-40"><SelectValue placeholder="All Classes" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Classes</SelectItem>
              {classes.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <Card className="border-0 shadow-md mb-4">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-red-600">
              <AlertCircle className="w-5 h-5" />
              <span className="font-semibold">{defaulters.length} defaulter(s) found for {filterTerm} {filterSession}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardContent className="p-0">
            {loading ? (
              <div className="p-12 text-center"><div className="animate-spin w-8 h-8 border-4 border-[#1e3a5f] border-t-transparent rounded-full mx-auto"></div></div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-red-50 border-b">
                    <tr>
                      {['S/N', 'Admission No', 'Student Name', 'Class', 'Section', 'Parent Phone', 'Parent Email', 'Actions'].map(h => (
                        <th key={h} className="text-left text-xs font-semibold text-gray-600 uppercase px-4 py-3">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {defaulters.map((s, idx) => (
                      <tr key={s.id} className="hover:bg-red-50/30">
                        <td className="px-4 py-3 text-sm text-gray-500">{idx + 1}</td>
                        <td className="px-4 py-3 text-sm font-mono">{s.admission_number || '-'}</td>
                        <td className="px-4 py-3 font-medium text-sm">{s.first_name} {s.last_name}</td>
                        <td className="px-4 py-3 text-sm">{s.current_class}</td>
                        <td className="px-4 py-3 text-sm">{s.section}</td>
                        <td className="px-4 py-3 text-sm">{s.parent_phone || '-'}</td>
                        <td className="px-4 py-3 text-sm">{s.parent_email || '-'}</td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" className="text-green-700 border-green-300 hover:bg-green-50 h-7 text-xs px-2" onClick={() => sendWhatsApp(s)}>
                              <MessageSquare className="w-3 h-3 mr-1" /> WA
                            </Button>
                            <Button size="sm" variant="outline" className="text-blue-700 border-blue-300 hover:bg-blue-50 h-7 text-xs px-2" onClick={() => sendEmail(s)}>
                              <Mail className="w-3 h-3 mr-1" /> Email
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {defaulters.length === 0 && !loading && (
                  <div className="p-12 text-center text-green-600">
                    <p className="text-lg font-semibold">No defaulters found!</p>
                    <p className="text-sm text-gray-400">All students have paid for this term</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}