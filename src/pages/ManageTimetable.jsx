import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Plus, Edit, Trash2, Clock, Upload, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

const CLASSES = {
  'Nursery': ['Reception Class'],
  'Primary': ['Primary 1A', 'Primary 1B', 'Primary 2A', 'Primary 2B', 'Primary 3A', 'Primary 3B', 'Primary 4A', 'Primary 4B', 'Primary 5A', 'Primary 5B'],
  'Secondary': ['JSS 1A', 'JSS 1B', 'JSS 2A', 'JSS 2B', 'JSS 3A', 'JSS 3B', 'SS1 Arts A', 'SS1 Arts B', 'SS1 Com A', 'SS1 Com B', 'SS1 Sci A', 'SS1 Sci B', 'SS2 Arts A', 'SS2 Arts B', 'SS2 Com A', 'SS2 Com B', 'SS2 Sci A', 'SS2 Sci B', 'SS3 Arts A', 'SS3 Arts B', 'SS3 Com A', 'SS3 Com B', 'SS3 Sci A', 'SS3 Sci B']
};

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

export default function ManageTimetable() {
  const [timetables, setTimetables] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTimetable, setEditingTimetable] = useState(null);
  const [formData, setFormData] = useState({
    class: '',
    section: 'Secondary',
    term: 'First Term',
    session: '',
    schedule: [],
    attachment_url: '',
    status: 'Active'
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [timetablesData, subjectsData] = await Promise.all([
      base44.entities.Timetable.list('-created_date'),
      base44.entities.Subject.list()
    ]);
    setTimetables(timetablesData);
    setSubjects(subjectsData);
    setLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (editingTimetable) {
      await base44.entities.Timetable.update(editingTimetable.id, formData);
    } else {
      await base44.entities.Timetable.create(formData);
    }

    setIsDialogOpen(false);
    resetForm();
    loadData();
  };

  const handleEdit = (timetable) => {
    setEditingTimetable(timetable);
    setFormData(timetable);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id) => {
    if (confirm('Are you sure you want to delete this timetable?')) {
      await base44.entities.Timetable.delete(id);
      loadData();
    }
  };

  const resetForm = () => {
    setEditingTimetable(null);
    setFormData({
      class: '',
      section: 'Secondary',
      term: 'First Term',
      session: '',
      schedule: [],
      attachment_url: '',
      status: 'Active'
    });
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData({ ...formData, attachment_url: file_url });
    }
  };

  const initializeSchedule = () => {
    const schedule = DAYS.map(day => ({
      day,
      periods: [
        { time: '8:00-9:00', subject: '', teacher: '' },
        { time: '9:00-10:00', subject: '', teacher: '' },
        { time: '10:00-11:00', subject: '', teacher: '' },
        { time: '11:00-12:00', subject: '', teacher: '' },
        { time: '12:00-1:00', subject: 'Break', teacher: '' },
        { time: '1:00-2:00', subject: '', teacher: '' },
        { time: '2:00-3:00', subject: '', teacher: '' }
      ]
    }));
    setFormData({ ...formData, schedule });
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Manage Timetables</h1>
            <p className="text-gray-500">Create and manage class timetables</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="bg-[#1e3a5f] hover:bg-[#2c4a6e]">
                <Plus className="w-4 h-4 mr-2" />
                Create Timetable
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingTimetable ? 'Edit Timetable' : 'Create New Timetable'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid md:grid-cols-4 gap-4">
                  <div>
                    <Label>Section *</Label>
                    <Select value={formData.section} onValueChange={(v) => setFormData({ ...formData, section: v, class: '' })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Nursery">Nursery</SelectItem>
                        <SelectItem value="Primary">Primary</SelectItem>
                        <SelectItem value="Secondary">Secondary</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Class *</Label>
                    <Select value={formData.class} onValueChange={(v) => setFormData({ ...formData, class: v })}>
                      <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                      <SelectContent>
                        {(CLASSES[formData.section] || []).map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Term *</Label>
                    <Select value={formData.term} onValueChange={(v) => setFormData({ ...formData, term: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="First Term">First Term</SelectItem>
                        <SelectItem value="Second Term">Second Term</SelectItem>
                        <SelectItem value="Third Term">Third Term</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Session *</Label>
                    <Input
                      value={formData.session}
                      onChange={(e) => setFormData({ ...formData, session: e.target.value })}
                      placeholder="2024/2025"
                      required
                    />
                  </div>
                </div>

                {/* Upload Timetable */}
                <div>
                  <Label>Upload Timetable (PDF/Image)</Label>
                  <div className="mt-2">
                    {formData.attachment_url ? (
                      <div className="flex items-center gap-4">
                        <a href={formData.attachment_url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline">
                          View uploaded timetable
                        </a>
                        <Button type="button" variant="outline" size="sm" onClick={() => setFormData({ ...formData, attachment_url: '' })}>
                          Remove
                        </Button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-[#1e3a5f]">
                        <Upload className="w-6 h-6 text-gray-400 mb-1" />
                        <span className="text-sm text-gray-500">Upload timetable document</span>
                        <input type="file" className="hidden" onChange={handleFileUpload} />
                      </label>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-2">You can upload a pre-made timetable or create one manually</p>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={() => { setIsDialogOpen(false); resetForm(); }}>Cancel</Button>
                  <Button type="submit" className="bg-[#1e3a5f] hover:bg-[#2c4a6e]">
                    {editingTimetable ? 'Update' : 'Create'} Timetable
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Timetables Table */}
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
                      <TableHead>Class</TableHead>
                      <TableHead>Section</TableHead>
                      <TableHead>Term</TableHead>
                      <TableHead>Session</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {timetables.map((timetable) => (
                      <TableRow key={timetable.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-[#1e3a5f]/10 rounded-lg flex items-center justify-center">
                              <Clock className="w-5 h-5 text-[#1e3a5f]" />
                            </div>
                            <span className="font-medium">{timetable.class}</span>
                          </div>
                        </TableCell>
                        <TableCell><Badge variant="outline">{timetable.section}</Badge></TableCell>
                        <TableCell>{timetable.term}</TableCell>
                        <TableCell>{timetable.session}</TableCell>
                        <TableCell>
                          <Badge className={timetable.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                            {timetable.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            {timetable.attachment_url && (
                              <a href={timetable.attachment_url} target="_blank" rel="noopener noreferrer">
                                <Button variant="ghost" size="icon">
                                  <Download className="w-4 h-4" />
                                </Button>
                              </a>
                            )}
                            <Button variant="ghost" size="icon" onClick={() => handleEdit(timetable)}>
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDelete(timetable.id)}>
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {timetables.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-12 text-gray-500">No timetables found</TableCell>
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