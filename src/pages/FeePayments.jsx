import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Search, Download, Printer } from 'lucide-react';
import { Link } from 'react-router-dom';

const CLASSES = ['Reception Class','Nursery 1','Nursery 2','Primary 1','Primary 2','Primary 3','Primary 4','Primary 5','JSS 1','JSS 2','JSS 3','SS1 Art','SS1 Sc','SS2 Art','SS2 Sc','SS3 Art','SS3 Sc'];

export default function FeePayments() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterClass, setFilterClass] = useState('all');
  const [filterTerm, setFilterTerm] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => { loadPayments(); }, []);

  const loadPayments = async () => {
    setLoading(true);
    const data = await base44.entities.SchoolFeePayment.list('-created_date', 500);
    setPayments(data);
    setLoading(false);
  };

  const filtered = payments.filter(p => {
    const matchSearch = `${p.student_name} ${p.receipt_number || ''}`.toLowerCase().includes(search.toLowerCase());
    const matchClass = filterClass === 'all' || p.class === filterClass;
    const matchTerm = filterTerm === 'all' || p.term === filterTerm;
    const matchStatus = filterStatus === 'all' || p.status === filterStatus;
    return matchSearch && matchClass && matchTerm && matchStatus;
  });

  const totalRevenue = filtered.reduce((s, p) => s + (p.amount_paid || 0), 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-[#1e3a5f] text-white px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/AccountantPortal"><ArrowLeft className="w-5 h-5 hover:opacity-70" /></Link>
            <h1 className="text-xl font-bold">Fee Payments Records</h1>
          </div>
          <Link to="/FeeReceipt">
            <Button className="bg-white text-[#1e3a5f] hover:bg-white/90">+ New Receipt</Button>
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4 text-center">
              <p className="text-sm text-gray-500">Total Records</p>
              <p className="text-3xl font-bold text-[#1e3a5f]">{filtered.length}</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4 text-center">
              <p className="text-sm text-gray-500">Total Revenue</p>
              <p className="text-3xl font-bold text-green-600">₦{totalRevenue.toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4 text-center">
              <p className="text-sm text-gray-500">Partial Payments</p>
              <p className="text-3xl font-bold text-orange-600">{filtered.filter(p => p.status === 'Partial').length}</p>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-wrap gap-3 mb-6">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input placeholder="Search student or receipt..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Select value={filterClass} onValueChange={setFilterClass}>
            <SelectTrigger className="w-40"><SelectValue placeholder="All Classes" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Classes</SelectItem>
              {CLASSES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterTerm} onValueChange={setFilterTerm}>
            <SelectTrigger className="w-36"><SelectValue placeholder="All Terms" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Terms</SelectItem>
              <SelectItem value="First Term">First Term</SelectItem>
              <SelectItem value="Second Term">Second Term</SelectItem>
              <SelectItem value="Third Term">Third Term</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-32"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="Paid">Paid</SelectItem>
              <SelectItem value="Partial">Partial</SelectItem>
              <SelectItem value="Pending">Pending</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Card className="border-0 shadow-md">
          <CardContent className="p-0">
            {loading ? (
              <div className="p-12 text-center"><div className="animate-spin w-8 h-8 border-4 border-[#1e3a5f] border-t-transparent rounded-full mx-auto"></div></div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      {['Receipt #', 'Student', 'Class', 'Term', 'Session', 'Amount Paid', 'Balance', 'Method', 'Date', 'Status'].map(h => (
                        <th key={h} className="text-left text-xs font-semibold text-gray-500 uppercase px-3 py-3">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filtered.map(p => (
                      <tr key={p.id} className="hover:bg-gray-50">
                        <td className="px-3 py-3 text-xs font-mono text-blue-700">{p.receipt_number}</td>
                        <td className="px-3 py-3 text-sm font-medium">{p.student_name}</td>
                        <td className="px-3 py-3 text-sm">{p.class}</td>
                        <td className="px-3 py-3 text-sm">{p.term}</td>
                        <td className="px-3 py-3 text-sm">{p.session || '-'}</td>
                        <td className="px-3 py-3 text-sm font-semibold text-green-700">₦{(p.amount_paid || 0).toLocaleString()}</td>
                        <td className="px-3 py-3 text-sm text-red-600">{p.balance ? `₦${p.balance.toLocaleString()}` : '-'}</td>
                        <td className="px-3 py-3 text-sm">{p.payment_method}</td>
                        <td className="px-3 py-3 text-sm">{p.payment_date}</td>
                        <td className="px-3 py-3">
                          <Badge variant={p.status === 'Paid' ? 'default' : 'secondary'} className="text-xs">{p.status}</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filtered.length === 0 && <p className="p-8 text-center text-gray-400">No records found</p>}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}