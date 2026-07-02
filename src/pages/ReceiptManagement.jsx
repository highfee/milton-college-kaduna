import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ArrowLeft, Search, Printer, Download, FileText, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';
import { printReceiptFromPayment } from '@/lib/receiptPrint';
import { generateTransactionReportPDF } from '@/lib/transactionReportPDF';

export default function ReceiptManagement() {
  const [payments, setPayments] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [period, setPeriod] = useState('all');
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);

  useEffect(() => {
    loadPayments();
    base44.entities.SchoolSettings.list().then(s => { if (s[0]) setSettings(s[0]); });
  }, []);

  const loadPayments = async () => {
    setLoading(true);
    const data = await base44.entities.SchoolFeePayment.list('-created_date', 500);
    setPayments(data);
    setLoading(false);
  };

  const getDateRange = (periodKey) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    switch (periodKey) {
      case 'today':
        return { from: today.toISOString().split('T')[0], to: today.toISOString().split('T')[0], label: 'Today' };
      case 'week': {
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);
        return { from: weekAgo.toISOString().split('T')[0], to: today.toISOString().split('T')[0], label: 'This Week' };
      }
      case 'month': {
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        return { from: monthStart.toISOString().split('T')[0], to: today.toISOString().split('T')[0], label: 'This Month' };
      }
      case 'year': {
        const yearStart = new Date(now.getFullYear(), 0, 1);
        return { from: yearStart.toISOString().split('T')[0], to: today.toISOString().split('T')[0], label: 'This Year' };
      }
      case 'first_term':
        return { from: `${now.getFullYear()}-09-01`, to: `${now.getFullYear()}-12-31`, label: 'First Term' };
      case 'second_term':
        return { from: `${now.getFullYear()}-01-01`, to: `${now.getFullYear()}-04-30`, label: 'Second Term' };
      case 'third_term':
        return { from: `${now.getFullYear()}-05-01`, to: `${now.getFullYear()}-08-31`, label: 'Third Term' };
      default:
        return null;
    }
  };

  const filtered = payments.filter(p => {
    const matchSearch = !search ||
      `${p.student_name} ${p.receipt_number || ''} ${p.admission_number || ''}`.toLowerCase().includes(search.toLowerCase());
    if (!matchSearch) return false;
    if (period === 'all') return true;
    const range = getDateRange(period);
    if (!range) return true;
    return p.payment_date >= range.from && p.payment_date <= range.to;
  });

  const totalRevenue = filtered.reduce((s, p) => s + (p.amount_paid || 0), 0);
  const totalBalance = filtered.reduce((s, p) => s + (p.balance || 0), 0);

  const handleReprint = (payment) => {
    printReceiptFromPayment(payment, settings);
  };

  const handleDownloadReport = () => {
    setReportLoading(true);
    try {
      const range = getDateRange(period);
      const doc = generateTransactionReportPDF(filtered, {
        periodLabel: range?.label || 'All Time',
        dateFrom: range?.from,
        dateTo: range?.to
      });
      doc.save(`transaction-report-${period}-${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (e) {
      alert('Error generating report: ' + e.message);
    }
    setReportLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-[#1e3a5f] text-white px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/AccountantPortal"><ArrowLeft className="w-5 h-5 hover:opacity-70" /></Link>
            <h1 className="text-xl font-bold">Receipt Management</h1>
          </div>
          <Button onClick={handleDownloadReport} disabled={reportLoading || filtered.length === 0}
            className="bg-white text-[#1e3a5f] hover:bg-white/90">
            <Download className="w-4 h-4 mr-2" /> {reportLoading ? 'Generating...' : 'Download A4 Report'}
          </Button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4 text-center">
              <p className="text-sm text-gray-500">Total Receipts</p>
              <p className="text-2xl font-bold text-[#1e3a5f]">{filtered.length}</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4 text-center">
              <p className="text-sm text-gray-500">Total Collected</p>
              <p className="text-2xl font-bold text-green-600">{totalRevenue.toLocaleString('en-NG', { style: 'currency', currency: 'NGN' })}</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4 text-center">
              <p className="text-sm text-gray-500">Outstanding</p>
              <p className="text-2xl font-bold text-red-600">{totalBalance.toLocaleString('en-NG', { style: 'currency', currency: 'NGN' })}</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4 text-center">
              <p className="text-sm text-gray-500">Partial Payments</p>
              <p className="text-2xl font-bold text-orange-600">{filtered.filter(p => p.status === 'Partial').length}</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input placeholder="Search by receipt #, student name, or admission number..."
              className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-44"><Calendar className="w-4 h-4 mr-2" /><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="year">This Year</SelectItem>
              <SelectItem value="first_term">First Term</SelectItem>
              <SelectItem value="second_term">Second Term</SelectItem>
              <SelectItem value="third_term">Third Term</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <Card className="border-0 shadow-md">
          <CardContent className="p-0">
            {loading ? (
              <div className="p-12 text-center"><div className="animate-spin w-8 h-8 border-4 border-[#1e3a5f] border-t-transparent rounded-full mx-auto"></div></div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      {['Receipt #', 'Student', 'Class', 'Term', 'Amount Paid', 'Balance', 'Method', 'Date', 'Status', 'Actions'].map(h => (
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
                        <td className="px-3 py-3 text-sm font-semibold text-green-700">{(p.amount_paid || 0).toLocaleString('en-NG', { style: 'currency', currency: 'NGN' })}</td>
                        <td className="px-3 py-3 text-sm text-red-600">{p.balance ? p.balance.toLocaleString('en-NG', { style: 'currency', currency: 'NGN' }) : '-'}</td>
                        <td className="px-3 py-3 text-sm">{p.payment_method}</td>
                        <td className="px-3 py-3 text-sm">{p.payment_date}</td>
                        <td className="px-3 py-3">
                          <Badge variant={p.status === 'Paid' ? 'default' : 'secondary'} className="text-xs">{p.status}</Badge>
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex gap-1">
                            <Button size="sm" variant="outline" onClick={() => setSelectedPayment(p)}>
                              <FileText className="w-3 h-3" />
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => handleReprint(p)}>
                              <Printer className="w-3 h-3" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filtered.length === 0 && <p className="p-8 text-center text-gray-400">No receipts found</p>}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* View Receipt Dialog */}
      <Dialog open={!!selectedPayment} onOpenChange={() => setSelectedPayment(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Receipt Details — {selectedPayment?.receipt_number}</DialogTitle>
          </DialogHeader>
          {selectedPayment && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><p className="text-gray-500">Student Name</p><p className="font-semibold">{selectedPayment.student_name}</p></div>
                <div><p className="text-gray-500">Admission No</p><p className="font-semibold">{selectedPayment.admission_number || 'N/A'}</p></div>
                <div><p className="text-gray-500">Class</p><p className="font-semibold">{selectedPayment.class}</p></div>
                <div><p className="text-gray-500">Section</p><p className="font-semibold">{selectedPayment.section || 'N/A'}</p></div>
                <div><p className="text-gray-500">Term</p><p className="font-semibold">{selectedPayment.term}</p></div>
                <div><p className="text-gray-500">Session</p><p className="font-semibold">{selectedPayment.session || 'N/A'}</p></div>
                <div><p className="text-gray-500">Payment Method</p><p className="font-semibold">{selectedPayment.payment_method}</p></div>
                <div><p className="text-gray-500">Date</p><p className="font-semibold">{selectedPayment.payment_date}</p></div>
                <div><p className="text-gray-500">Parent/Guardian</p><p className="font-semibold">{selectedPayment.parent_name || 'N/A'}</p></div>
                <div><p className="text-gray-500">Parent Phone</p><p className="font-semibold">{selectedPayment.parent_phone || 'N/A'}</p></div>
                <div><p className="text-gray-500">Recorded By</p><p className="font-semibold">{selectedPayment.recorded_by || 'N/A'}</p></div>
                <div><p className="text-gray-500">Status</p><Badge variant={selectedPayment.status === 'Paid' ? 'default' : 'secondary'}>{selectedPayment.status}</Badge></div>
              </div>
              <div className="border-t pt-3">
                <p className="text-sm font-semibold text-gray-700 mb-2">Fee Items</p>
                <table className="w-full text-sm">
                  <thead><tr className="border-b"><th className="text-left py-1">Item</th><th className="text-right py-1">Amount</th></tr></thead>
                  <tbody>
                    {(selectedPayment.items || []).map((item, i) => (
                      <tr key={i} className="border-b">
                        <td className="py-1">{item.item_name}</td>
                        <td className="py-1 text-right">{(item.amount || 0).toLocaleString('en-NG', { style: 'currency', currency: 'NGN' })}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="font-bold bg-gray-50">
                      <td className="py-2 px-1">Total Paid</td>
                      <td className="py-2 px-1 text-right text-green-700">{(selectedPayment.amount_paid || 0).toLocaleString('en-NG', { style: 'currency', currency: 'NGN' })}</td>
                    </tr>
                    {selectedPayment.balance > 0 && (
                      <tr><td className="py-1 px-1 text-red-600">Balance</td><td className="py-1 px-1 text-right text-red-600">{selectedPayment.balance.toLocaleString('en-NG', { style: 'currency', currency: 'NGN' })}</td></tr>
                    )}
                  </tfoot>
                </table>
              </div>
              <Button onClick={() => handleReprint(selectedPayment)} className="w-full bg-[#1e3a5f] hover:bg-[#2c4a6e]">
                <Printer className="w-4 h-4 mr-2" /> Reprint Receipt
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}