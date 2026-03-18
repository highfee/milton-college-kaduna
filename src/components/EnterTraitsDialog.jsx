import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Save } from 'lucide-react';

const AFFECTIVE_TRAITS = [
  { key: 'punctuality', label: 'Punctuality' },
  { key: 'neatness', label: 'Neatness' },
  { key: 'honesty', label: 'Honesty' },
  { key: 'politeness', label: 'Politeness' },
  { key: 'attentiveness', label: 'Attentiveness' },
  { key: 'cooperation', label: 'Cooperation' },
  { key: 'perseverance', label: 'Perseverance' },
  { key: 'leadership', label: 'Leadership' },
];

const PSYCHOMOTOR_SKILLS = [
  { key: 'handwriting', label: 'Handwriting' },
  { key: 'drawing', label: 'Drawing/Art' },
  { key: 'verbal_fluency', label: 'Verbal Fluency' },
  { key: 'sport_games', label: 'Sport & Games' },
  { key: 'music', label: 'Music' },
  { key: 'computer_skills', label: 'Computer Skills' },
];

const RATING_LABELS = { 1: 'Poor', 2: 'Fair', 3: 'Good', 4: 'Very Good', 5: 'Excellent' };

export default function EnterTraitsDialog({ open, onClose, student, term, session }) {
  const [affective, setAffective] = useState({});
  const [psychomotor, setPsychomotor] = useState({});
  const [classComment, setClassComment] = useState('');
  const [nextTerm, setNextTerm] = useState('');
  const [arrears, setArrears] = useState('');
  const [currentFees, setCurrentFees] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && student && term && session) loadExisting();
  }, [open, student, term, session]);

  const loadExisting = async () => {
    const results = await base44.entities.Result.filter({ student_id: student.id, term, session });
    if (results[0]) {
      setAffective(results[0].affective_traits || {});
      setPsychomotor(results[0].psychomotor_skills || {});
      setClassComment(results[0].teacher_comment || '');
      setNextTerm(results[0].next_term_begins || '');
      setArrears(results[0].school_fees_arrears || '');
      setCurrentFees(results[0].school_fees_current || '');
    }
  };

  const handleSave = async () => {
    setSaving(true);
    const results = await base44.entities.Result.filter({ student_id: student.id, term, session });
    for (const r of results) {
      await base44.entities.Result.update(r.id, {
        affective_traits: affective,
        psychomotor_skills: psychomotor,
        teacher_comment: classComment,
        next_term_begins: nextTerm,
        school_fees_arrears: parseFloat(arrears) || 0,
        school_fees_current: parseFloat(currentFees) || 0,
      });
    }
    setSaving(false);
    alert('Traits and details saved!');
    onClose();
  };

  const RatingRow = ({ label, traitKey, state, setState }) => (
    <div className="flex items-center gap-4 py-2 border-b last:border-0">
      <span className="w-36 text-sm text-gray-700 flex-shrink-0">{label}</span>
      <div className="flex gap-1">
        {[1,2,3,4,5].map(n => (
          <button key={n} onClick={() => setState(prev => ({ ...prev, [traitKey]: n }))}
            className={`w-8 h-8 rounded-full text-xs font-bold border-2 transition-all ${
              state[traitKey] === n ? 'bg-[#1e3a5f] text-white border-[#1e3a5f]' : 'bg-white text-gray-500 border-gray-300 hover:border-[#1e3a5f]'
            }`}>
            {n}
          </button>
        ))}
      </div>
      <span className="text-xs text-gray-500 ml-2">{RATING_LABELS[state[traitKey]] || '—'}</span>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Affective Traits & Psychomotor Skills — {student?.first_name} {student?.last_name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          {/* Affective Traits */}
          <div>
            <h3 className="font-semibold text-[#1e3a5f] mb-2 flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#1e3a5f] inline-block" />
              Affective Traits (1=Poor, 5=Excellent)
            </h3>
            <div className="bg-blue-50 rounded-lg p-3">
              {AFFECTIVE_TRAITS.map(t => (
                <RatingRow key={t.key} label={t.label} traitKey={t.key} state={affective} setState={setAffective} />
              ))}
            </div>
          </div>

          {/* Psychomotor Skills */}
          <div>
            <h3 className="font-semibold text-purple-700 mb-2 flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-purple-700 inline-block" />
              Psychomotor Skills (1=Poor, 5=Excellent)
            </h3>
            <div className="bg-purple-50 rounded-lg p-3">
              {PSYCHOMOTOR_SKILLS.map(t => (
                <RatingRow key={t.key} label={t.label} traitKey={t.key} state={psychomotor} setState={setPsychomotor} />
              ))}
            </div>
          </div>

          {/* Class Teacher Comment + Next Term + Fees */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label>Class Teacher's Comment</Label>
              <textarea className="w-full mt-1 border rounded-md p-2 text-sm h-20 resize-none"
                value={classComment} onChange={e => setClassComment(e.target.value)}
                placeholder="Write a comment about this student's performance..." />
            </div>
            <div className="space-y-3">
              <div>
                <Label>Next Term Begins</Label>
                <input type="date" className="w-full mt-1 border rounded-md p-2 text-sm h-9"
                  value={nextTerm} onChange={e => setNextTerm(e.target.value)} />
              </div>
              <div>
                <Label>School Fees Arrears (₦)</Label>
                <input type="number" className="w-full mt-1 border rounded-md p-2 text-sm h-9"
                  value={arrears} onChange={e => setArrears(e.target.value)} placeholder="0.00" />
              </div>
              <div>
                <Label>Current School Fees (₦)</Label>
                <input type="number" className="w-full mt-1 border rounded-md p-2 text-sm h-9"
                  value={currentFees} onChange={e => setCurrentFees(e.target.value)} placeholder="0.00" />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button className="bg-[#1e3a5f]" onClick={handleSave} disabled={saving}>
              <Save className="w-4 h-4 mr-2" /> {saving ? 'Saving...' : 'Save Traits & Details'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}