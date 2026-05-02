import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  DollarSign, Receipt, Users, AlertCircle, 
  TrendingUp, LogOut, Printer, Plus, BarChart3, ArrowLeft
} from 'lucide-react';

export default function AccountantPortal() {
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState({});
  const [recentPayments, setRecentPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const userData = await base44.auth.me();
      setUser(userData);
      const [payments, students] = await Promise.all([
        base44.entities.SchoolFeePayment.list('-created_date', 10),
        base44.entities.Student.list()
      ]);
      setRecentPayments(payments);
      const today = new Date().toISOString().split('T')[0];
      const todayPayments = payments.filter(p => p.payment_date === today);
      const todayTotal = todayPayments.reduce((s, p) => s + (p.amount_paid || 0), 0);
      setStats({
        totalStudents: students.length,
        todayPayments: todayPayments.length,
        todayTotal,
        recentCount: payments.length
      });
    } catch {
      base44.auth.redirectToLogin();
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin w-10 h-10 border-4 border-[#1e3a5f] border-t-transparent rounded-full" />
    </div>
  );

  const quickActions = [
    { label: 'New Receipt', icon: Plus, to: '/FeeReceipt', color: 'bg-green-600' },
    { label: 'Fee Payments', icon: DollarSign, to: '/FeePayments', color: 'bg-blue-600' },
    { label: 'Fee Defaulters', icon: AlertCircle, to: '/FeeDefaulters', color: 'bg-red-600' },
    { label: 'Print Reports', icon: Printer, to: '/FeeReports', color: 'bg-purple-600' },
    { label: 'Analytics', icon: BarChart3, to: '/FeeAnalytics', color: 'bg-orange-600' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-[#1e3a5f] text-white px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <DollarSign className="w-7 h-7" />
            <div>
              <h1 className="text-xl font-bold">Accountant Portal</h1>
              <p className="text-sm text-white/70">Milton College of Arts & Science</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge className="bg-white/20 text-white border-0 hidden md:flex">{user?.full_name}</Badge>
            <Button variant="ghost" className="text-white hover:bg-white/20" onClick={() => base44.auth.logout()}>
              <LogOut className="w-4 h-4 mr-1" /> Logout
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Today's Payments", value: stats.todayPayments || 0, icon: Receipt, color: 'text-green-600' },
            { label: "Today's Revenue", value: `₦${(stats.todayTotal || 0).toLocaleString()}`, icon: TrendingUp, color: 'text-blue-600' },
            { label: 'Total Students', value: stats.totalStudents || 0, icon: Users, color: 'text-purple-600' },
            { label: 'Recent Transactions', value: stats.recentCount || 0, icon: BarChart3, color: 'text-orange-600' },
          ].map((s, i) => (
            <Card key={i} className="border-0 shadow-md">
              <CardContent className="p-6 flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">{s.label}</p>
                  <p className="text-2xl font-bold mt-1">{s.value}</p>
                </div>
                <s.icon className={`w-8 h-8 ${s.color} opacity-70`} />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick Actions */}
        <Card className="border-0 shadow-md mb-8">
          <CardHeader><CardTitle>Quick Actions</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
              {quickActions.map((a, i) => (
                <Link key={i} to={a.to}>
                  <div className="flex flex-col items-center gap-2 p-4 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer group">
                    <div className={`w-12 h-12 ${a.color} rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform`}>
                      <a.icon className="w-6 h-6 text-white" />
                    </div>
                    <span className="text-sm font-medium text-gray-700 text-center">{a.label}</span>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Payments */}
        <Card className="border-0 shadow-md">
          <CardHeader><CardTitle>Recent Payments</CardTitle></CardHeader>
          <CardContent className="p-0">
            {recentPayments.length === 0 ? (
              <p className="p-6 text-center text-gray-400">No payments yet</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      {['Receipt #', 'Student', 'Class', 'Term', 'Amount', 'Method', 'Date', 'Status'].map(h => (
                        <th key={h} className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {recentPayments.map(p => (
                      <tr key={p.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-mono">{p.receipt_number}</td>
                        <td className="px-4 py-3 font-medium text-sm">{p.student_name}</td>
                        <td className="px-4 py-3 text-sm">{p.class}</td>
                        <td className="px-4 py-3 text-sm">{p.term}</td>
                        <td className="px-4 py-3 text-sm font-semibold text-green-700">₦{(p.amount_paid || 0).toLocaleString()}</td>
                        <td className="px-4 py-3 text-sm">{p.payment_method}</td>
                        <td className="px-4 py-3 text-sm">{p.payment_date}</td>
                        <td className="px-4 py-3">
                          <Badge variant={p.status === 'Paid' ? 'default' : 'secondary'} className="text-xs">{p.status}</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}