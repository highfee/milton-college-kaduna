import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Plus, Edit, Trash2, Calendar as CalendarIcon, Upload, Download, Smartphone } from 'lucide-react';
import { downloadCalendarICS } from '@/lib/icsGenerator';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

export default function ManageCalendar() {
  const [calendars, setCalendars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCalendar, setEditingCalendar] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    section: 'All',
    term: 'First Term',
    session: '',
    activities: [],
    attachment_url: '',
    status: 'Active'
  });
  const [newActivity, setNewActivity] = useState({ date: '', activity: '' });

  useEffect(() => {
    loadCalendars();
  }, []);

  const loadCalendars = async () => {
    const data = await base44.entities.Calendar.list('-created_date');
    setCalendars(data);
    setLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (editingCalendar) {
      await base44.entities.Calendar.update(editingCalendar.id, formData);
    } else {
      await base44.entities.Calendar.create(formData);
    }

    setIsDialogOpen(false);
    resetForm();
    loadCalendars();
  };

  const handleEdit = (calendar) => {
    setEditingCalendar(calendar);
    setFormData(calendar);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id) => {
    if (confirm('Are you sure you want to delete this calendar?')) {
      await base44.entities.Calendar.delete(id);
      loadCalendars();
    }
  };

  const resetForm = () => {
    setEditingCalendar(null);
    setFormData({
      title: '',
      section: 'All',
      term: 'First Term',
      session: '',
      activities: [],
      attachment_url: '',
      status: 'Active'
    });
    setNewActivity({ date: '', activity: '' });
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData({ ...formData, attachment_url: file_url });
    }
  };

  const handleAddActivity = () => {
    if (newActivity.date && newActivity.activity) {
      setFormData({
        ...formData,
        activities: [...(formData.activities || []), { ...newActivity }]
      });
      setNewActivity({ date: '', activity: '' });
    }
  };

  const handleRemoveActivity = (index) => {
    const newActivities = formData.activities.filter((_, i) => i !== index);
    setFormData({ ...formData, activities: newActivities });
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Manage Calendar</h1>
            <p className="text-gray-500">Create and manage academic calendars</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="bg-[#1e3a5f] hover:bg-[#2c4a6e]">
                <Plus className="w-4 h-4 mr-2" />
                Create Calendar
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingCalendar ? 'Edit Calendar' : 'Create New Calendar'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label>Title *</Label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g., Academic Calendar - First Term"
                    required
                  />
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <Label>Section *</Label>
                    <Select value={formData.section} onValueChange={(v) => setFormData({ ...formData, section: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="All">All Sections</SelectItem>
                        <SelectItem value="Nursery">Nursery</SelectItem>
                        <SelectItem value="Primary">Primary</SelectItem>
                        <SelectItem value="Secondary">Secondary</SelectItem>
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

                {/* Activities */}
                <div>
                  <Label>Activities</Label>
                  <div className="mt-2 space-y-2">
                    {formData.activities?.map((activity, index) => (
                      <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                        <span className="text-sm font-medium">{activity.date}</span>
                        <span className="text-sm flex-1">{activity.activity}</span>
                        <Button type="button" size="sm" variant="ghost" onClick={() => handleRemoveActivity(index)}>
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    ))}
                  </div>
                  <div className="grid md:grid-cols-3 gap-2 mt-2">
                    <Input
                      type="date"
                      value={newActivity.date}
                      onChange={(e) => setNewActivity({ ...newActivity, date: e.target.value })}
                      placeholder="Date"
                    />
                    <Input
                      value={newActivity.activity}
                      onChange={(e) => setNewActivity({ ...newActivity, activity: e.target.value })}
                      placeholder="Activity description"
                      className="md:col-span-2"
                    />
                  </div>
                  <Button type="button" size="sm" onClick={handleAddActivity} className="mt-2">
                    <Plus className="w-4 h-4 mr-1" />
                    Add Activity
                  </Button>
                </div>

                {/* Upload Calendar */}
                <div>
                  <Label>Upload Calendar Document (Optional)</Label>
                  <div className="mt-2">
                    {formData.attachment_url ? (
                      <div className="flex items-center gap-4">
                        <a href={formData.attachment_url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline">
                          View uploaded calendar
                        </a>
                        <Button type="button" variant="outline" size="sm" onClick={() => setFormData({ ...formData, attachment_url: '' })}>
                          Remove
                        </Button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-[#1e3a5f]">
                        <Upload className="w-6 h-6 text-gray-400 mb-1" />
                        <span className="text-sm text-gray-500">Upload calendar document</span>
                        <input type="file" className="hidden" onChange={handleFileUpload} />
                      </label>
                    )}
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={() => { setIsDialogOpen(false); resetForm(); }}>Cancel</Button>
                  <Button type="submit" className="bg-[#1e3a5f] hover:bg-[#2c4a6e]">
                    {editingCalendar ? 'Update' : 'Create'} Calendar
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Calendars Table */}
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
                      <TableHead>Title</TableHead>
                      <TableHead>Section</TableHead>
                      <TableHead>Term</TableHead>
                      <TableHead>Session</TableHead>
                      <TableHead>Activities</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {calendars.map((calendar) => (
                      <TableRow key={calendar.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-[#1e3a5f]/10 rounded-lg flex items-center justify-center">
                              <CalendarIcon className="w-5 h-5 text-[#1e3a5f]" />
                            </div>
                            <span className="font-medium">{calendar.title}</span>
                          </div>
                        </TableCell>
                        <TableCell><Badge variant="outline">{calendar.section}</Badge></TableCell>
                        <TableCell>{calendar.term}</TableCell>
                        <TableCell>{calendar.session}</TableCell>
                        <TableCell>{calendar.activities?.length || 0} activities</TableCell>
                        <TableCell>
                          <Badge className={calendar.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                            {calendar.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            {calendar.activities?.length > 0 && (
                              <Button
                                variant="ghost"
                                size="icon"
                                title="Sync to your device calendar"
                                onClick={() => downloadCalendarICS(calendar)}
                              >
                                <Smartphone className="w-4 h-4 text-teal-600" />
                              </Button>
                            )}
                            {calendar.attachment_url && (
                              <a href={calendar.attachment_url} target="_blank" rel="noopener noreferrer">
                                <Button variant="ghost" size="icon">
                                  <Download className="w-4 h-4" />
                                </Button>
                              </a>
                            )}
                            <Button variant="ghost" size="icon" onClick={() => handleEdit(calendar)}>
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDelete(calendar.id)}>
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {calendars.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-12 text-gray-500">No calendars found</TableCell>
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