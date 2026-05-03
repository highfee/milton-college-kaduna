import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  DollarSign, Receipt, Users, AlertCircle, 
  TrendingUp, LogOut, Printer, Plus, BarChart3, Eye, EyeOff
} from 'lucide-react';

const ACCOUNTANT_EMAIL = 'josephdorathy83@gmail.com';

export default function AccountantPortal() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [accountant, setAccountant] = useState(null);
  const [stats, setStats] = useState({});
  const [recentPayments, setRecentPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Login state
  const [staffId, setStaffId] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  useEffect(() => {
    const session = sessionStorage.getItem('accountant_portal_logged_in');
    if (session === 'true') {
      const saved = JSON.parse(sessionStorage.getItem('accountant_data') || '{}');
      setAccountant(saved);
      setLoggedIn(true);
      loadDashboard();
    } else {
      setLoading(false);
    }
  }, []);

  const handleLogin = async () => {
    if (!staffId || !password) { setLoginError('Please enter Staff ID and password'); return; }
    setLoginLoading(true);
    setLoginError('');
    const staff = await base44.entities.NonAcademicStaff.filter({ staff_id: staffId.trim(), role: 'Accountant' });
    if (!staff[0]) { setLoginError('Staff ID not found or not an Accountant.'); setLoginLoading(false); return; }
    if (password !== 'User123' && password !== staff[0].phone) {
      setLoginError('Incorrect password. Default password is User123 or your phone number.'); setLoginLoading(false); return;
    }
    sessionStorage.setItem('accountant_portal_logged_in', 'true');
    sessionStorage.setItem('accountant_data', JSON.stringify(staff[0]));
    setAccountant(staff[0]);
    setLoggedIn(true);
    setLoginLoading(false);
    loadDashboard();
  };

  const loadDashboard = async () => {
    setLoading(true);
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
    setLoading(false);
  };

  const handleLogout = () => {
    sessionStorage.removeItem('accountant_portal_logged_in');
    sessionStorage.removeItem('accountant_data');
    setLoggedIn(false);
    setAccountant(null);
    setStaffId('');
    setPassword('');
  };

  if (!loggedIn) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-lg border-0">
          <div className="bg-emerald-600 rounded-t-xl p-6 text-white text-center">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
              <DollarSign className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-bold">Accountant Portal</h1>
            <p className="text-white/80 text-sm mt-1">Milton College of Arts & Science</p>
          </div>
          <CardContent className="p-6 space-y-4">
            <div>
              <Label>Staff ID</Label>
              <Input placeholder="Enter your Staff ID (e.g. NAS001)" value={staffId}
                onChange={e => setStaffId(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleLogin()} />
            </div>
            <div>
              <Label>Password</Label>
              <div className="relative">
                <Input type={showPw ? 'text' : 'password'} placeholder="Default: User123 or phone number"
                  value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleLogin()} className="pr-10" />
                <button type="button" className="absolute right-3 top-2.5 text-gray-400" onClick={() => setShowPw(!showPw)}>
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            {loginError && <p className="text-red-500 text-sm">{loginError}</p>}
            <Button className="w-full bg-emerald-600 hover:bg-emerald-700" onClick={handleLogin} disabled={loginLoading}>
              {loginLoading ? 'Signing in...' : 'Sign In'}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full" />
    </div>
  );

  const quickActions = [
    { label: 'New Receipt', icon: Plus, to: '/FeeReceipt', color: 'bg-green-600' },
    { label: 'Fee Payments', icon: DollarSign, to: '/FeePayments', color: 'bg-blue-600' },
    { label: 'Fee Defaulters', icon: AlertCircle, to: '/FeeDefaulters', color: 'bg-red-600' },
    { label: 'Result Tokens', icon: Receipt, to: '/ResultTokens', color: 'bg-purple-600' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-emerald-600 text-white px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <DollarSign className="w-7 h-7" />
            <div>
              <h1 className="text-xl font-bold">Accountant Portal</h1>
              <p className="text-sm text-white/70">{accountant?.first_name} {accountant?.last_name}</p>
            </div>
          </div>
          <Button variant="ghost" className="text-white hover:bg-white/20" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-1" /> Logout
          </Button>
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
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
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