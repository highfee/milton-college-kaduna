import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { 
  Plus, Search, Edit, Trash2, User, Upload, GraduationCap, Download
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { SCHOOL_CLASSES, ALL_SCHOOL_CLASSES, SCHOOL_SECTIONS } from '@/components/GradingUtils';

const CLASSES = SCHOOL_CLASSES;
const ALL_CLASSES = ALL_SCHOOL_CLASSES;
const SECTIONS = SCHOOL_SECTIONS;
const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const GENOTYPES = ['AA', 'AS', 'SS', 'AC', 'SC'];
const SPORT_HOUSES = ['Red House', 'Blue House', 'Green House', 'Yellow House'];

export default function ManageStudents() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterSection, setFilterSection] = useState('all');
  const [filterClass, setFilterClass] = useState('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [settings, setSettings] = useState(null);
  const [isTeacherView, setIsTeacherView] = useState(false);
  const [formData, setFormData] = useState({
    admission_number: '',
    first_name: '',
    last_name: '',
    middle_name: '',
    date_of_birth: '',
    gender: '',
    passport_photo: '',
    section: '',
    current_class: '',
    state_of_origin: '',
    local_government: '',
    blood_group: '',
    genotype: '',
    tribe: '',
    sport_house: '',
    weight: '',
    height: '',
    parent_name: '',
    parent_phone: '',
    parent_email: '',
    address: '',
    admission_date: '',
    status: 'Active',
    fees_paid: false,
    current_term: '',
    current_session: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const settingsData = await base44.entities.SchoolSettings.list();
    setSettings(settingsData[0]);
    if (settingsData[0]) {
      setFormData(prev => ({
        ...prev,
        current_term: settingsData[0].current_term,
        current_session: settingsData[0].current_session
      }));
    }

    // Detect teacher portal session — filter students accordingly
    const portalKeys = ['teacher_portal_staff_id', 'ht_portal_staff_id', 'principal_portal_staff_id'];
    let portalStaffId = null;
    for (const key of portalKeys) { const sid = sessionStorage.getItem(key); if (sid) { portalStaffId = sid; break; } }

    if (portalStaffId) {
      setIsTeacherView(true);
      const teacherData = await base44.entities.Teacher.filter({ staff_id: portalStaffId });
      const t = teacherData[0];
      if (t) {
        const cls = t.assigned_class || t.form_teacher_class;
        if (t.teacher_type === 'Class Teacher' || t.teacher_type === 'Head Teacher') {
          // Show students in assigned class only
          const studentsData = cls ? await base44.entities.Student.filter({ current_class: cls, status: 'Active' }) : [];
          setStudents(studentsData);
        } else if (t.teacher_type === 'Form Teacher') {
          // Form teacher: students in form class
          const formCls = t.form_teacher_class || t.assigned_class;
          const studentsData = formCls ? await base44.entities.Student.filter({ current_class: formCls, status: 'Active' }) : [];
          setStudents(studentsData);
        } else {
          // Subject teacher: students across all subject classes
          const subjects = await base44.entities.Subject.filter({ teacher_id: t.id, status: 'Active' });
          const classSet = new Set();
          subjects.forEach(s => (s.classes || []).forEach(c => classSet.add(c)));
          if (classSet.size > 0) {
            const arrays = await Promise.all([...classSet].map(c => base44.entities.Student.filter({ current_class: c, status: 'Active' })));
            const all = arrays.flat();
            // Deduplicate
            const seen = new Set();
            setStudents(all.filter(s => { if (seen.has(s.id)) return false; seen.add(s.id); return true; }));
          } else {
            setStudents([]);
          }
        }
      }
    } else {
      // Admin/platform user — show all
      const studentsData = await base44.entities.Student.list();
      setStudents(studentsData);
    }
    setLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (editingStudent) {
      await base44.entities.Student.update(editingStudent.id, formData);
    } else {
      const admNum = 'MCA' + Date.now().toString().slice(-6);
      await base44.entities.Student.create({ ...formData, admission_number: admNum });

      // Auto-create Parent record if parent_name + parent_phone provided
      if (formData.parent_name && formData.parent_phone) {
        const existingParents = await base44.entities.Parent.filter({ phone: formData.parent_phone });
        if (existingParents.length === 0) {
          const parentId = 'PAR' + Date.now().toString().slice(-6);
          await base44.entities.Parent.create({
            parent_id: parentId,
            default_username: parentId,
            full_name: formData.parent_name,
            phone: formData.parent_phone,
            email: formData.parent_email || '',
            address: formData.address || '',
            relationship: 'Guardian',
            status: 'Active'
          });
        }
      }
    }

    setIsDialogOpen(false);
    resetForm();
    loadData();
  };

  const handleEdit = (student) => {
    setEditingStudent(student);
    setFormData(student);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id) => {
    if (confirm('Are you sure you want to delete this student?')) {
      await base44.entities.Student.delete(id);
      loadData();
    }
  };

  const resetForm = () => {
    setEditingStudent(null);
    setFormData({
      admission_number: '',
      first_name: '',
      last_name: '',
      middle_name: '',
      date_of_birth: '',
      gender: '',
      passport_photo: '',
      section: '',
      current_class: '',
      state_of_origin: '',
      local_government: '',
      blood_group: '',
      genotype: '',
      tribe: '',
      sport_house: '',
      weight: '',
      height: '',
      parent_name: '',
      parent_phone: '',
      parent_email: '',
      address: '',
      admission_date: '',
      status: 'Active',
      fees_paid: false,
      current_term: settings?.current_term || '',
      current_session: settings?.current_session || ''
    });
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData({ ...formData, passport_photo: file_url });
    }
  };

  const filteredStudents = students.filter(s => {
    const matchesSearch = `${s.first_name} ${s.last_name}`.toLowerCase().includes(search.toLowerCase()) ||
      s.admission_number?.toLowerCase().includes(search.toLowerCase());
    const matchesSection = filterSection === 'all' || s.section === filterSection;
    const matchesClass = filterClass === 'all' || s.current_class === filterClass;
    return matchesSearch && matchesSection && matchesClass;
  });

  const availableClasses = filterSection === 'all' ? ALL_CLASSES : (CLASSES[filterSection] || []);

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Manage Students</h1>
            <p className="text-gray-500">Add, edit, and manage students</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
            {!isTeacherView && (
              <DialogTrigger asChild>
                <Button className="bg-[#1e3a5f] hover:bg-[#2c4a6e]">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Student
                </Button>
              </DialogTrigger>
            )}
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingStudent ? 'Edit Student' : 'Add New Student'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Basic Info */}
                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <Label>First Name *</Label>
                    <Input
                      value={formData.first_name}
                      onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label>Middle Name</Label>
                    <Input
                      value={formData.middle_name}
                      onChange={(e) => setFormData({ ...formData, middle_name: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Last Name *</Label>
                    <Input
                      value={formData.last_name}
                      onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <Label>Date of Birth *</Label>
                    <Input
                      type="date"
                      value={formData.date_of_birth}
                      onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label>Gender *</Label>
                    <Select value={formData.gender} onValueChange={(v) => setFormData({ ...formData, gender: v })}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Male">Male</SelectItem>
                        <SelectItem value="Female">Female</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Section *</Label>
                    <Select value={formData.section} onValueChange={(v) => setFormData({ ...formData, section: v, current_class: '' })}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        {SECTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <Label>Class *</Label>
                    <Select value={formData.current_class} onValueChange={(v) => setFormData({ ...formData, current_class: v })} disabled={!formData.section}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        {(CLASSES[formData.section] || []).map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Sport House</Label>
                    <Select value={formData.sport_house} onValueChange={(v) => setFormData({ ...formData, sport_house: v })}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        {SPORT_HOUSES.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Admission Date</Label>
                    <Input
                      type="date"
                      value={formData.admission_date}
                      onChange={(e) => setFormData({ ...formData, admission_date: e.target.value })}
                    />
                  </div>
                </div>

                {/* Additional Info */}
                <div className="grid md:grid-cols-4 gap-4">
                  <div>
                    <Label>State of Origin</Label>
                    <Input
                      value={formData.state_of_origin}
                      onChange={(e) => setFormData({ ...formData, state_of_origin: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Local Govt</Label>
                    <Input
                      value={formData.local_government}
                      onChange={(e) => setFormData({ ...formData, local_government: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Blood Group</Label>
                    <Select value={formData.blood_group} onValueChange={(v) => setFormData({ ...formData, blood_group: v })}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        {BLOOD_GROUPS.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Genotype</Label>
                    <Select value={formData.genotype} onValueChange={(v) => setFormData({ ...formData, genotype: v })}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        {GENOTYPES.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <Label>Tribe</Label>
                    <Input
                      value={formData.tribe}
                      onChange={(e) => setFormData({ ...formData, tribe: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Weight (kg)</Label>
                    <Input
                      type="number"
                      value={formData.weight}
                      onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Height (cm)</Label>
                    <Input
                      type="number"
                      value={formData.height}
                      onChange={(e) => setFormData({ ...formData, height: e.target.value })}
                    />
                  </div>
                </div>

                {/* Parent Info */}
                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <Label>Parent Name</Label>
                    <Input
                      value={formData.parent_name}
                      onChange={(e) => setFormData({ ...formData, parent_name: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Parent Phone</Label>
                    <Input
                      value={formData.parent_phone}
                      onChange={(e) => setFormData({ ...formData, parent_phone: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Parent Email</Label>
                    <Input
                      type="email"
                      value={formData.parent_email}
                      onChange={(e) => setFormData({ ...formData, parent_email: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <Label>Passport Photo</Label>
                  <div className="mt-2">
                    {formData.passport_photo ? (
                      <div className="flex items-center gap-4">
                        <img src={formData.passport_photo} alt="" className="w-20 h-20 object-cover rounded-lg" />
                        <Button type="button" variant="outline" size="sm" onClick={() => setFormData({ ...formData, passport_photo: '' })}>Remove</Button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-[#1e3a5f]">
                        <Upload className="w-6 h-6 text-gray-400 mb-1" />
                        <span className="text-sm text-gray-500">Upload photo</span>
                        <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} />
                      </label>
                    )}
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={() => { setIsDialogOpen(false); resetForm(); }}>Cancel</Button>
                  <Button type="submit" className="bg-[#1e3a5f] hover:bg-[#2c4a6e]">
                    {editingStudent ? 'Update' : 'Create'} Student
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filters */}
        <Card className="mb-6 border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <Input placeholder="Search students..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
              </div>
              <Select value={filterSection} onValueChange={(v) => { setFilterSection(v); setFilterClass('all'); }}>
                <SelectTrigger className="w-full md:w-48"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sections</SelectItem>
                  {SECTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filterClass} onValueChange={setFilterClass}>
                <SelectTrigger className="w-full md:w-48"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Classes</SelectItem>
                  {availableClasses.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <p className="text-sm text-gray-500">Total Students</p>
              <p className="text-2xl font-bold">{students.length}</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <p className="text-sm text-gray-500">Nursery</p>
              <p className="text-2xl font-bold">{students.filter(s => s.section === 'Nursery').length}</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <p className="text-sm text-gray-500">Primary</p>
              <p className="text-2xl font-bold">{students.filter(s => s.section === 'Primary').length}</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <p className="text-sm text-gray-500">Secondary</p>
              <p className="text-2xl font-bold">{students.filter(s => s.section === 'Secondary').length}</p>
            </CardContent>
          </Card>
        </div>

        {/* Students Table */}
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
                      <TableHead>Student</TableHead>
                      <TableHead>Adm. No.</TableHead>
                      <TableHead>Section</TableHead>
                      <TableHead>Class</TableHead>
                      <TableHead>Gender</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredStudents.map((student) => (
                      <TableRow key={student.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            {student.passport_photo ? (
                              <img src={student.passport_photo} alt="" className="w-10 h-10 rounded-full object-cover" />
                            ) : (
                              <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                                <User className="w-5 h-5 text-gray-400" />
                              </div>
                            )}
                            <div>
                              <p className="font-medium">{student.first_name} {student.last_name}</p>
                              <p className="text-sm text-gray-500">{student.parent_phone}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <span className="font-mono text-sm font-bold">{student.admission_number}</span>
                            <p className="text-xs text-gray-400">Username: {student.admission_number}</p>
                          </div>
                        </TableCell>
                        <TableCell><Badge variant="outline">{student.section}</Badge></TableCell>
                        <TableCell>{student.current_class}</TableCell>
                        <TableCell>{student.gender}</TableCell>
                        <TableCell>
                          <Badge className={student.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                            {student.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="icon" onClick={() => handleEdit(student)}>
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDelete(student.id)}>
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredStudents.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-12 text-gray-500">No students found</TableCell>
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