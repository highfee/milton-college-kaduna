import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Save } from 'lucide-react';

export default function StudentSubjectsDialog({ student, onClose }) {
  const [subjects, setSubjects] = useState([]);
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (student) loadData();
  }, [student]);

  const loadData = async () => {
    setLoading(true);
    const allSubjects = await base44.entities.Subject.filter({ section: student.section, status: 'Active' });
    const classSubjects = allSubjects.filter(s =>
      !s.classes || s.classes.length === 0 || s.classes.includes(student.current_class)
    );
    setSubjects(classSubjects);
    setSelected(student.subjects || []);
    setLoading(false);
  };

  const handleToggle = (subjectId) => {
    setSelected(prev =>
      prev.includes(subjectId) ? prev.filter(id => id !== subjectId) : [...prev, subjectId]
    );
  };

  const handleSelectAll = () => {
    if (selected.length === subjects.length) {
      setSelected([]);
    } else {
      setSelected(subjects.map(s => s.id));
    }
  };

  const handleSave = async () => {
    setSaving(true);
    await base44.entities.Student.update(student.id, { subjects: selected });
    setSaving(false);
    onClose();
  };

  if (!student) return null;

  return (
    <Dialog open={!!student} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Manage Subjects — {student.first_name} {student.last_name}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-gray-500">{student.current_class} · {student.section}</p>
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin w-8 h-8 border-4 border-[#1e3a5f] border-t-transparent rounded-full" />
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">{selected.length} of {subjects.length} selected</span>
              <Button type="button" variant="ghost" size="sm" onClick={handleSelectAll}>
                {selected.length === subjects.length ? 'Deselect All' : 'Select All'}
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-1 max-h-80 overflow-y-auto">
              {subjects.map(subject => (
                <div key={subject.id} className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-50">
                  <Checkbox
                    id={`subj-${subject.id}`}
                    checked={selected.includes(subject.id)}
                    onCheckedChange={() => handleToggle(subject.id)}
                  />
                  <label htmlFor={`subj-${subject.id}`} className="text-sm cursor-pointer flex-1">
                    {subject.name}
                  </label>
                </div>
              ))}
              {subjects.length === 0 && (
                <p className="text-sm text-gray-500 col-span-2 text-center py-4">
                  No subjects assigned to {student.current_class} yet.
                </p>
              )}
            </div>
          </>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving || loading} className="bg-[#1e3a5f] hover:bg-[#2c4a6e]">
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Saving...' : 'Save Subjects'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}