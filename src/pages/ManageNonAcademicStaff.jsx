import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { Plus, Search, Edit, Users, Briefcase, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

const ROLES = ['Admin', 'Accountant', 'Driver', 'Typist', 'Store Keeper', 'School Nurse', 'Security', 'Nanny', 'Cleaner', 'Cashier'];
const STATUSES = ['Active', 'Inactive', 'On Leave', 'Terminated'];

const roleColors = {
  Admin: 'bg-red-100 text-red-800',
  Accountant: 'bg-blue-100 text-blue-800',
  Driver: 'bg-green-100 text-green-800',
  Typist: 'bg-yellow-100 text-yellow-800',
  'Store Keeper': 'bg-purple-100 text-purple-800',
  'School Nurse': 'bg-pink-100 text-pink-800',
  Security: 'bg-orange-100 text-orange-800',
  Nanny: 'bg-teal-100 text-teal-800',
  Cleaner: 'bg-gray-100 text-gray-800',
  Cashier: 'bg-indigo-100 text-indigo-800',
};

const emptyForm = {
  first_name: '', last_name: '', email: '', phone: '', role: '',
  duties: '', department: '', date_employed: '', qualification: '',
  address: '', emergency_contact: '', status: 'Active'
};

export default function ManageNonAcademicStaff() {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [showDialog, setShowDialog] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => { loadStaff(); }, []);

  const loadStaff = async () => {
    setLoading(true);
    const data = await base44.entities.NonAcademicStaff.list('-created_date', 200);
    setStaff(data);
    setLoading(false);
  };

  const openCreate = () => {
    setEditingStaff(null);
    setForm(emptyForm);
    setShowDialog(true);
  };

  const openEdit = (s) => {
    setEditingStaff(s);
    setForm({ ...s });
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!form.first_name || !form.last_name || !form.role) {
      toast({ title: 'Required fields missing', variant: 'destructive' });
      return;
    }
    setSaving(true);
    if (editingStaff) {
      await base44.entities.NonAcademicStaff.update(editingStaff.id, form);
      toast({ title: 'Staff updated successfully' });
    } else {
      const staffId = 'NAS' + Date.now().toString().slice(-6);
      await base44.entities.NonAcademicStaff.create({ ...form, staff_id: staffId });
      toast({ title: 'Staff created successfully' });
    }
    setSaving(false);
    setShowDialog(false);
    loadStaff();
  };

  const filtered = staff.filter(s => {
    const matchSearch = `${s.first_name} ${s.last_name} ${s.email || ''} ${s.phone || ''}`.toLowerCase().includes(search.toLowerCase());
    const matchRole = filterRole === 'all' || s.role === filterRole;
    return matchSearch && matchRole;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-[#1e3a5f] text-white px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/AdminPortal"><ArrowLeft className="w-5 h-5 cursor-pointer hover:opacity-70" /></Link>
            <Briefcase className="w-6 h-6" />
            <div>
              <h1 className="text-xl font-bold">Non-Academic Staff Management</h1>
              <p className="text-sm text-white/70">Manage all non-academic personnel</p>
            </div>
          </div>
          <Button onClick={openCreate} className="bg-white text-[#1e3a5f] hover:bg-white/90">
            <Plus className="w-4 h-4 mr-2" /> Add Staff
          </Button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          {ROLES.slice(0, 5).map(role => (
            <Card key={role} className="border-0 shadow-sm text-center">
              <CardContent className="p-4">
                <p className="text-2xl font-bold text-[#1e3a5f]">{staff.filter(s => s.role === role).length}</p>
                <p className="text-xs text-gray-500 mt-1">{role}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input placeholder="Search staff..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Select value={filterRole} onValueChange={setFilterRole}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Filter by role" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              {ROLES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Staff Table */}
        <Card className="border-0 shadow-md">
          <CardContent className="p-0">
            {loading ? (
              <div className="p-12 text-center"><div className="animate-spin w-8 h-8 border-4 border-[#1e3a5f] border-t-transparent rounded-full mx-auto"></div></div>
            ) : filtered.length === 0 ? (
              <div className="p-12 text-center text-gray-400">
                <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>No staff found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      {['Staff ID', 'Name', 'Role', 'Phone', 'Email', 'Status', 'Actions'].map(h => (
                        <th key={h} className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filtered.map(s => (
                      <tr key={s.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-500">{s.staff_id || '-'}</td>
                        <td className="px-4 py-3 font-medium">{s.first_name} {s.last_name}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${roleColors[s.role] || 'bg-gray-100 text-gray-700'}`}>{s.role}</span>
                        </td>
                        <td className="px-4 py-3 text-sm">{s.phone || '-'}</td>
                        <td className="px-4 py-3 text-sm">{s.email || '-'}</td>
                        <td className="px-4 py-3">
                          <Badge variant={s.status === 'Active' ? 'default' : 'secondary'}>{s.status}</Badge>
                        </td>
                        <td className="px-4 py-3">
                          <Button size="sm" variant="ghost" onClick={() => openEdit(s)}>
                            <Edit className="w-4 h-4" />
                          </Button>
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

      {/* Add/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingStaff ? 'Edit Staff' : 'Add Non-Academic Staff'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
            <div>
              <Label>First Name *</Label>
              <Input value={form.first_name} onChange={e => setForm({ ...form, first_name: e.target.value })} />
            </div>
            <div>
              <Label>Last Name *</Label>
              <Input value={form.last_name} onChange={e => setForm({ ...form, last_name: e.target.value })} />
            </div>
            <div>
              <Label>Role *</Label>
              <Select value={form.role} onValueChange={v => setForm({ ...form, role: v })}>
                <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
                <SelectContent>{ROLES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
            </div>
            <div>
              <Label>Phone</Label>
              <Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div>
              <Label>Department</Label>
              <Input value={form.department} onChange={e => setForm({ ...form, department: e.target.value })} />
            </div>
            <div>
              <Label>Date Employed</Label>
              <Input type="date" value={form.date_employed} onChange={e => setForm({ ...form, date_employed: e.target.value })} />
            </div>
            <div>
              <Label>Qualification</Label>
              <Input value={form.qualification} onChange={e => setForm({ ...form, qualification: e.target.value })} />
            </div>
            <div>
              <Label>Emergency Contact</Label>
              <Input value={form.emergency_contact} onChange={e => setForm({ ...form, emergency_contact: e.target.value })} />
            </div>
            <div className="sm:col-span-2">
              <Label>Address</Label>
              <Input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />
            </div>
            <div className="sm:col-span-2">
              <Label>Assigned Duties</Label>
              <Textarea value={form.duties} onChange={e => setForm({ ...form, duties: e.target.value })} rows={3} />
            </div>
          </div>
          <div className="flex gap-3 justify-end mt-4">
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-[#1e3a5f]">
              {saving ? 'Saving...' : editingStaff ? 'Update' : 'Create'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}