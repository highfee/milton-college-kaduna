import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Plus, Search, Edit, Trash2, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';

const CLASSES = {
  'Nursery': ['Reception Class'],
  'Primary': ['Primary 1A', 'Primary 1B', 'Primary 2A', 'Primary 2B', 'Primary 3A', 'Primary 3B', 'Primary 4A', 'Primary 4B', 'Primary 5A', 'Primary 5B'],
  'Secondary': ['JSS 1A', 'JSS 1B', 'JSS 2A', 'JSS 2B', 'JSS 3A', 'JSS 3B', 'SS1 Arts A', 'SS1 Arts B', 'SS1 Com A', 'SS1 Com B', 'SS1 Sci A', 'SS1 Sci B', 'SS2 Arts A', 'SS2 Arts B', 'SS2 Com A', 'SS2 Com B', 'SS2 Sci A', 'SS2 Sci B', 'SS3 Arts A', 'SS3 Arts B', 'SS3 Com A', 'SS3 Com B', 'SS3 Sci A', 'SS3 Sci B']
};

const SECTIONS = ['Nursery', 'Primary', 'Secondary'];

export default function ManageSubjects() {
  const [subjects, setSubjects] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterSection, setFilterSection] = useState('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    section: '',
    classes: [],
    teacher_id: '',
    teacher_name: '',
    description: '',
    status: 'Active'
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [subjectsData, teachersData] = await Promise.all([
      base44.entities.Subject.list(),
      base44.entities.Teacher.filter({ status: 'Active' })
    ]);
    setSubjects(subjectsData);
    setTeachers(teachersData);
    setLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const selectedTeacher = teachers.find(t => t.id === formData.teacher_id);
    const dataToSave = {
      ...formData,
      teacher_name: selectedTeacher ? `${selectedTeacher.first_name} ${selectedTeacher.last_name}` : ''
    };

    if (editingSubject) {
      await base44.entities.Subject.update(editingSubject.id, dataToSave);
    } else {
      await base44.entities.Subject.create(dataToSave);
    }

    setIsDialogOpen(false);
    resetForm();
    loadData();
  };

  const handleEdit = (subject) => {
    setEditingSubject(subject);
    setFormData(subject);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id) => {
    if (confirm('Are you sure you want to delete this subject?')) {
      await base44.entities.Subject.delete(id);
      loadData();
    }
  };

  const resetForm = () => {
    setEditingSubject(null);
    setFormData({
      name: '',
      code: '',
      section: '',
      classes: [],
      teacher_id: '',
      teacher_name: '',
      description: '',
      status: 'Active'
    });
  };

  const handleClassToggle = (cls) => {
    const newClasses = formData.classes?.includes(cls)
      ? formData.classes.filter(c => c !== cls)
      : [...(formData.classes || []), cls];
    setFormData({ ...formData, classes: newClasses });
  };

  const filteredSubjects = subjects.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.code?.toLowerCase().includes(search.toLowerCase());
    const matchesSection = filterSection === 'all' || s.section === filterSection;
    return matchesSearch && matchesSection;
  });

  const filteredTeachers = teachers.filter(t => 
    !formData.section || t.section === formData.section
  );

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Manage Subjects</h1>
            <p className="text-gray-500">Create and manage school subjects</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="bg-[#1e3a5f] hover:bg-[#2c4a6e]">
                <Plus className="w-4 h-4 mr-2" />
                Add Subject
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingSubject ? 'Edit Subject' : 'Add New Subject'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label>Subject Name *</Label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label>Subject Code</Label>
                    <Input
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                      placeholder="e.g., MAT, ENG"
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label>Section *</Label>
                    <Select value={formData.section} onValueChange={(v) => setFormData({ ...formData, section: v, classes: [], teacher_id: '' })}>
                      <SelectTrigger><SelectValue placeholder="Select section" /></SelectTrigger>
                      <SelectContent>
                        {SECTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Assign Teacher</Label>
                    <Select value={formData.teacher_id} onValueChange={(v) => setFormData({ ...formData, teacher_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Select teacher" /></SelectTrigger>
                      <SelectContent>
                        {filteredTeachers.map(t => (
                          <SelectItem key={t.id} value={t.id}>{t.first_name} {t.last_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {formData.section && (
                  <div>
                    <Label>Assign to Classes</Label>
                    <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-2 p-4 bg-gray-50 rounded-lg max-h-48 overflow-y-auto">
                      {(CLASSES[formData.section] || []).map(cls => (
                        <div key={cls} className="flex items-center space-x-2">
                          <Checkbox
                            id={cls}
                            checked={formData.classes?.includes(cls)}
                            onCheckedChange={() => handleClassToggle(cls)}
                          />
                          <label htmlFor={cls} className="text-sm cursor-pointer">{cls}</label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <Label>Description</Label>
                  <Input
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={() => { setIsDialogOpen(false); resetForm(); }}>Cancel</Button>
                  <Button type="submit" className="bg-[#1e3a5f] hover:bg-[#2c4a6e]">
                    {editingSubject ? 'Update' : 'Create'} Subject
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
                <Input placeholder="Search subjects..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
              </div>
              <Select value={filterSection} onValueChange={setFilterSection}>
                <SelectTrigger className="w-full md:w-48"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sections</SelectItem>
                  {SECTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Subjects Table */}
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
                      <TableHead>Subject</TableHead>
                      <TableHead>Code</TableHead>
                      <TableHead>Section</TableHead>
                      <TableHead>Classes</TableHead>
                      <TableHead>Teacher</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSubjects.map((subject) => (
                      <TableRow key={subject.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-[#1e3a5f]/10 rounded-lg flex items-center justify-center">
                              <BookOpen className="w-5 h-5 text-[#1e3a5f]" />
                            </div>
                            <span className="font-medium">{subject.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>{subject.code || '-'}</TableCell>
                        <TableCell><Badge variant="outline">{subject.section}</Badge></TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {subject.classes?.slice(0, 3).map(c => (
                              <Badge key={c} variant="secondary" className="text-xs">{c}</Badge>
                            ))}
                            {subject.classes?.length > 3 && (
                              <Badge variant="secondary" className="text-xs">+{subject.classes.length - 3}</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{subject.teacher_name || '-'}</TableCell>
                        <TableCell>
                          <Badge className={subject.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                            {subject.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="icon" onClick={() => handleEdit(subject)}>
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDelete(subject.id)}>
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredSubjects.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-12 text-gray-500">No subjects found</TableCell>
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