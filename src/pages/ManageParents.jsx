import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Plus, Search, Edit, Trash2, User, RefreshCw, Eye, Phone, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function ManageParents() {
  const [parents, setParents] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [search, setSearch] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingParent, setEditingParent] = useState(null);
  const [selectedParent, setSelectedParent] = useState(null);
  const [parentChildren, setParentChildren] = useState([]);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    email: '',
    address: '',
    occupation: '',
    relationship: 'Guardian',
    status: 'Active'
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [parentsData, studentsData] = await Promise.all([
      base44.entities.Parent.list(),
      base44.entities.Student.list()
    ]);
    setParents(parentsData);
    setStudents(studentsData);
    setLoading(false);
  };

  // Auto-extract parents from students database
  const handleSyncFromStudents = async () => {
    setSyncing(true);
    const existingParents = await base44.entities.Parent.list();

    // Group students by parent_name + parent_phone
    const parentMap = {};
    for (const student of students) {
      if (!student.parent_name || !student.parent_phone) continue;
      const key = `${student.parent_name.trim().toLowerCase()}__${student.parent_phone.trim()}`;
      if (!parentMap[key]) {
        parentMap[key] = {
          full_name: student.parent_name,
          phone: student.parent_phone,
          email: student.parent_email || '',
          address: student.address || '',
        };
      }
    }

    let created = 0;
    for (const [key, pData] of Object.entries(parentMap)) {
      // Check if already exists (by phone)
      const exists = existingParents.find(p => p.phone === pData.phone);
      if (!exists) {
        const parentId = 'PAR' + Date.now().toString().slice(-6) + Math.floor(Math.random() * 100);
        await base44.entities.Parent.create({
          ...pData,
          parent_id: parentId,
          default_username: parentId,
          relationship: 'Guardian',
          status: 'Active'
        });
        created++;
      }
    }

    setSyncing(false);
    alert(`Sync complete! ${created} new parent(s) added.`);
    loadData();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (editingParent) {
      await base44.entities.Parent.update(editingParent.id, formData);
    } else {
      const parentId = 'PAR' + Date.now().toString().slice(-6);
      await base44.entities.Parent.create({
        ...formData,
        parent_id: parentId,
        default_username: parentId
      });
    }
    setIsDialogOpen(false);
    resetForm();
    loadData();
  };

  const handleEdit = (parent) => {
    setEditingParent(parent);
    setFormData(parent);
    setIsDialogOpen(true);
  };

  const handleView = (parent) => {
    setSelectedParent(parent);
    const children = students.filter(s =>
      s.parent_phone === parent.phone || s.parent_email === parent.email
    );
    setParentChildren(children);
    setViewDialogOpen(true);
  };

  const handleDelete = async (id) => {
    if (confirm('Delete this parent record?')) {
      await base44.entities.Parent.delete(id);
      loadData();
    }
  };

  const resetForm = () => {
    setEditingParent(null);
    setFormData({ full_name: '', phone: '', email: '', address: '', occupation: '', relationship: 'Guardian', status: 'Active' });
  };

  const filteredParents = parents.filter(p =>
    p.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    p.phone?.includes(search) ||
    p.email?.toLowerCase().includes(search.toLowerCase()) ||
    p.parent_id?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Manage Parents</h1>
            <p className="text-gray-500">View, add and manage parent profiles</p>
          </div>
          <div className="flex gap-3 flex-wrap">
            <Button
              variant="outline"
              onClick={handleSyncFromStudents}
              disabled={syncing}
              className="border-green-600 text-green-700 hover:bg-green-50"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Syncing...' : 'Sync from Students'}
            </Button>
            <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
              <DialogTrigger asChild>
                <Button className="bg-[#1e3a5f] hover:bg-[#2c4a6e]">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Parent
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>{editingParent ? 'Edit Parent' : 'Add New Parent'}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <Label>Full Name *</Label>
                      <Input value={formData.full_name} onChange={e => setFormData({ ...formData, full_name: e.target.value })} required />
                    </div>
                    <div>
                      <Label>Phone *</Label>
                      <Input value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} required />
                    </div>
                    <div>
                      <Label>Email</Label>
                      <Input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
                    </div>
                    <div>
                      <Label>Occupation</Label>
                      <Input value={formData.occupation} onChange={e => setFormData({ ...formData, occupation: e.target.value })} />
                    </div>
                    <div>
                      <Label>Relationship</Label>
                      <Select value={formData.relationship} onValueChange={v => setFormData({ ...formData, relationship: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {['Father','Mother','Guardian','Other'].map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-2">
                      <Label>Address</Label>
                      <Input value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} />
                    </div>
                  </div>
                  <div className="flex justify-end gap-3 pt-2">
                    <Button type="button" variant="outline" onClick={() => { setIsDialogOpen(false); resetForm(); }}>Cancel</Button>
                    <Button type="submit" className="bg-[#1e3a5f] hover:bg-[#2c4a6e]">{editingParent ? 'Update' : 'Add'} Parent</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="border-0 shadow-sm"><CardContent className="p-4"><p className="text-sm text-gray-500">Total Parents</p><p className="text-2xl font-bold">{parents.length}</p></CardContent></Card>
          <Card className="border-0 shadow-sm"><CardContent className="p-4"><p className="text-sm text-gray-500">Active</p><p className="text-2xl font-bold text-green-600">{parents.filter(p => p.status === 'Active').length}</p></CardContent></Card>
          <Card className="border-0 shadow-sm"><CardContent className="p-4"><p className="text-sm text-gray-500">With Email</p><p className="text-2xl font-bold text-blue-600">{parents.filter(p => p.email).length}</p></CardContent></Card>
          <Card className="border-0 shadow-sm"><CardContent className="p-4"><p className="text-sm text-gray-500">Unique Families</p><p className="text-2xl font-bold text-purple-600">{parents.length}</p></CardContent></Card>
        </div>

        {/* Search */}
        <Card className="mb-6 border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <Input placeholder="Search by name, phone, email or Parent ID..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
            </div>
          </CardContent>
        </Card>

        {/* Table */}
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
                      <TableHead>Parent</TableHead>
                      <TableHead>Parent ID</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Relationship</TableHead>
                      <TableHead>Children</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredParents.map(parent => {
                      const childCount = students.filter(s => s.parent_phone === parent.phone || s.parent_email === parent.email).length;
                      return (
                        <TableRow key={parent.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                                <User className="w-5 h-5 text-purple-600" />
                              </div>
                              <div>
                                <p className="font-medium">{parent.full_name}</p>
                                <p className="text-xs text-gray-500">{parent.occupation}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="font-mono">{parent.parent_id}</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm space-y-1">
                              <p className="flex items-center gap-1 text-gray-600"><Phone className="w-3 h-3" />{parent.phone}</p>
                              {parent.email && <p className="flex items-center gap-1 text-gray-600"><Mail className="w-3 h-3" />{parent.email}</p>}
                            </div>
                          </TableCell>
                          <TableCell>{parent.relationship}</TableCell>
                          <TableCell><Badge className="bg-blue-100 text-blue-800">{childCount} child(ren)</Badge></TableCell>
                          <TableCell>
                            <Badge className={parent.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                              {parent.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button variant="ghost" size="icon" onClick={() => handleView(parent)}><Eye className="w-4 h-4" /></Button>
                              <Button variant="ghost" size="icon" onClick={() => handleEdit(parent)}><Edit className="w-4 h-4" /></Button>
                              <Button variant="ghost" size="icon" onClick={() => handleDelete(parent.id)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {filteredParents.length === 0 && (
                      <TableRow><TableCell colSpan={7} className="text-center py-12 text-gray-500">No parents found. Click "Sync from Students" to auto-import.</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* View Dialog */}
        <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Parent Profile – {selectedParent?.full_name}</DialogTitle>
            </DialogHeader>
            {selectedParent && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
                  <div><p className="text-xs text-gray-500">Parent ID</p><p className="font-bold font-mono text-[#1e3a5f]">{selectedParent.parent_id}</p></div>
                  <div><p className="text-xs text-gray-500">Default Username</p><p className="font-mono">{selectedParent.default_username}</p></div>
                  <div><p className="text-xs text-gray-500">Phone</p><p className="font-medium">{selectedParent.phone}</p></div>
                  <div><p className="text-xs text-gray-500">Email</p><p className="font-medium">{selectedParent.email || '—'}</p></div>
                  <div><p className="text-xs text-gray-500">Occupation</p><p className="font-medium">{selectedParent.occupation || '—'}</p></div>
                  <div><p className="text-xs text-gray-500">Relationship</p><p className="font-medium">{selectedParent.relationship}</p></div>
                  <div className="col-span-2"><p className="text-xs text-gray-500">Address</p><p className="font-medium">{selectedParent.address || '—'}</p></div>
                </div>

                <div>
                  <h3 className="font-semibold mb-3">Children ({parentChildren.length})</h3>
                  {parentChildren.length === 0 ? (
                    <p className="text-gray-500 text-sm">No children linked</p>
                  ) : (
                    <div className="space-y-2">
                      {parentChildren.map(child => (
                        <div key={child.id} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                          <div className="flex items-center gap-3">
                            {child.passport_photo ? <img src={child.passport_photo} className="w-8 h-8 rounded-full object-cover" alt="" /> : <div className="w-8 h-8 bg-blue-200 rounded-full flex items-center justify-center"><User className="w-4 h-4 text-blue-700" /></div>}
                            <div>
                              <p className="font-medium text-sm">{child.first_name} {child.last_name}</p>
                              <p className="text-xs text-gray-500">{child.admission_number} | {child.current_class}</p>
                            </div>
                          </div>
                          <Badge variant="outline">{child.section}</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-sm font-semibold text-yellow-800 mb-1">Login Credentials (Default)</p>
                  <p className="text-xs text-yellow-700">Username: <span className="font-mono font-bold">{selectedParent.parent_id}</span></p>
                  <p className="text-xs text-yellow-700">Password: <span className="font-mono font-bold">User123</span></p>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}