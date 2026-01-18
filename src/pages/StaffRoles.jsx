import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Plus, Search, Edit, Trash2, Shield, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const ROLES = ['Admin', 'Principal', 'Head Teacher', 'Teacher', 'Form Teacher', 'Accountant'];
const SECTIONS = ['Nursery', 'Primary', 'Secondary', 'All'];

export default function StaffRoles() {
  const [staffRoles, setStaffRoles] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [formData, setFormData] = useState({
    user_email: '',
    user_name: '',
    role: '',
    section: 'All',
    teacher_id: '',
    status: 'Active'
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [rolesData, teachersData] = await Promise.all([
      base44.entities.StaffRole.list(),
      base44.entities.Teacher.filter({ status: 'Active' })
    ]);
    setStaffRoles(rolesData);
    setTeachers(teachersData);
    setLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (editingRole) {
      await base44.entities.StaffRole.update(editingRole.id, formData);
    } else {
      await base44.entities.StaffRole.create(formData);
    }

    setIsDialogOpen(false);
    resetForm();
    loadData();
  };

  const handleEdit = (role) => {
    setEditingRole(role);
    setFormData(role);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id) => {
    if (confirm('Are you sure you want to remove this role?')) {
      await base44.entities.StaffRole.delete(id);
      loadData();
    }
  };

  const resetForm = () => {
    setEditingRole(null);
    setFormData({
      user_email: '',
      user_name: '',
      role: '',
      section: 'All',
      teacher_id: '',
      status: 'Active'
    });
  };

  const handleTeacherSelect = (teacherId) => {
    const teacher = teachers.find(t => t.id === teacherId);
    if (teacher) {
      setFormData({
        ...formData,
        teacher_id: teacherId,
        user_email: teacher.email,
        user_name: `${teacher.first_name} ${teacher.last_name}`,
        section: teacher.section
      });
    }
  };

  const getRoleColor = (role) => {
    const colors = {
      'Admin': 'bg-red-100 text-red-800',
      'Principal': 'bg-blue-100 text-blue-800',
      'Head Teacher': 'bg-green-100 text-green-800',
      'Teacher': 'bg-purple-100 text-purple-800',
      'Form Teacher': 'bg-indigo-100 text-indigo-800',
      'Accountant': 'bg-orange-100 text-orange-800'
    };
    return colors[role] || 'bg-gray-100 text-gray-800';
  };

  const filteredRoles = staffRoles.filter(r => {
    const matchesSearch = r.user_name?.toLowerCase().includes(search.toLowerCase()) ||
      r.user_email?.toLowerCase().includes(search.toLowerCase());
    const matchesRole = filterRole === 'all' || r.role === filterRole;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Staff Roles</h1>
            <p className="text-gray-500">Assign roles to staff members</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="bg-[#1e3a5f] hover:bg-[#2c4a6e]">
                <UserPlus className="w-4 h-4 mr-2" />
                Assign Role
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{editingRole ? 'Edit Role' : 'Assign New Role'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label>Select Teacher (Optional)</Label>
                  <Select value={formData.teacher_id} onValueChange={handleTeacherSelect}>
                    <SelectTrigger><SelectValue placeholder="Select from teachers" /></SelectTrigger>
                    <SelectContent>
                      {teachers.map(t => (
                        <SelectItem key={t.id} value={t.id}>{t.first_name} {t.last_name} - {t.email}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Email *</Label>
                  <Input
                    type="email"
                    value={formData.user_email}
                    onChange={(e) => setFormData({ ...formData, user_email: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <Label>Full Name *</Label>
                  <Input
                    value={formData.user_name}
                    onChange={(e) => setFormData({ ...formData, user_name: e.target.value })}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Role *</Label>
                    <Select value={formData.role} onValueChange={(v) => setFormData({ ...formData, role: v })}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        {ROLES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Section</Label>
                    <Select value={formData.section} onValueChange={(v) => setFormData({ ...formData, section: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {SECTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={() => { setIsDialogOpen(false); resetForm(); }}>Cancel</Button>
                  <Button type="submit" className="bg-[#1e3a5f] hover:bg-[#2c4a6e]">
                    {editingRole ? 'Update' : 'Assign'} Role
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Role Stats */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
          {ROLES.map(role => (
            <Card key={role} className="border-0 shadow-sm">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold">{staffRoles.filter(r => r.role === role).length}</p>
                <p className="text-sm text-gray-500">{role}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <Card className="mb-6 border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <Input placeholder="Search staff..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
              </div>
              <Select value={filterRole} onValueChange={setFilterRole}>
                <SelectTrigger className="w-full md:w-48"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  {ROLES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Roles Table */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-0">
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin w-8 h-8 border-4 border-[#1e3a5f] border-t-transparent rounded-full"></div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Staff</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Section</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRoles.map((role) => (
                      <TableRow key={role.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-[#1e3a5f]/10 rounded-full flex items-center justify-center">
                              <Shield className="w-5 h-5 text-[#1e3a5f]" />
                            </div>
                            <span className="font-medium">{role.user_name}</span>
                          </div>
                        </TableCell>
                        <TableCell>{role.user_email}</TableCell>
                        <TableCell><Badge className={getRoleColor(role.role)}>{role.role}</Badge></TableCell>
                        <TableCell><Badge variant="outline">{role.section}</Badge></TableCell>
                        <TableCell>
                          <Badge className={role.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                            {role.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="icon" onClick={() => handleEdit(role)}>
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDelete(role.id)}>
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredRoles.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-12 text-gray-500">No staff roles found</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}