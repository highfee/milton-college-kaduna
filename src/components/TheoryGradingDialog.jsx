import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { getGrade } from '@/components/GradingUtils';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Save, CheckCircle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

export default function TheoryGradingDialog({ exam, results, onClose, onGraded }) {
  const [scores, setScores] = useState({});
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  if (!exam) return null;

  const ungradedResults = results.filter(r =>
    r.theory_graded === false &&
    r.answers?.some(a => a.type === 'theory')
  );

  const handleScoreChange = (resultId, ansIdx, value) => {
    setScores(prev => ({ ...prev, [`${resultId}-${ansIdx}`]: value }));
  };

  const handleSaveStudent = async (result) => {
    setSaving(true);
    try {
      const updatedAnswers = result.answers.map((ans, idx) => {
        if (ans.type === 'theory') {
          const scoreVal = parseFloat(scores[`${result.id}-${idx}`] ?? ans.theory_score ?? 0);
          return { ...ans, theory_score: scoreVal };
        }
        return ans;
      });

      const theoryScore = updatedAnswers
        .filter(a => a.type === 'theory')
        .reduce((sum, a) => sum + (a.theory_score || 0), 0);

      const objectiveScore = result.score || 0;
      const totalScore = objectiveScore + theoryScore;
      const percentage = exam.total_marks > 0 ? ((totalScore / exam.total_marks) * 100).toFixed(1) : '0';
      const grade = getGrade(parseFloat(percentage), exam.section);

      await base44.entities.CBTResult.update(result.id, {
        answers: updatedAnswers,
        theory_score: theoryScore,
        score: totalScore,
        percentage: parseFloat(percentage),
        grade,
        theory_graded: true,
        status: 'Graded'
      });

      toast({ title: `${result.student_name}'s theory graded!`, duration: 3000 });
      onGraded();
    } catch (err) {
      toast({ title: 'Error: ' + err.message, variant: 'destructive', duration: 3000 });
    }
    setSaving(false);
  };

  return (
    <Dialog open={!!exam} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Grade Theory Answers — {exam.title}</DialogTitle>
        </DialogHeader>

        {ungradedResults.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-400" />
            <p>All theory answers have been graded.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {ungradedResults.map((result) => (
              <Card key={result.id} className="border-2">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="font-medium">{result.student_name}</p>
                      <p className="text-xs text-gray-500">{result.admission_number} · {result.class}</p>
                    </div>
                    <Badge className="bg-amber-100 text-amber-800">Pending</Badge>
                  </div>

                  {result.answers?.map((ans, idx) => {
                    if (ans.type !== 'theory') return null;
                    const question = exam.questions?.[ans.question_index];
                    const maxMarks = question?.marks || 1;
                    return (
                      <div key={idx} className="mb-4 p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-start justify-between mb-2">
                          <p className="text-sm font-medium text-gray-700">Q{ans.question_index + 1}</p>
                          <Badge variant="outline" className="text-xs">{maxMarks} marks</Badge>
                        </div>
                        {question && (
                          <div className="text-sm text-gray-600 mb-2 prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: question.question }} />
                        )}
                        {question?.image_url && (
                          <img src={question.image_url} alt="Question" className="max-h-32 rounded border mb-2" />
                        )}
                        <div className="mt-2 p-2 bg-white border rounded">
                          <p className="text-xs text-gray-400 mb-1">Student's Answer:</p>
                          <p className="text-sm text-gray-700 whitespace-pre-wrap">{ans.theory_answer || 'No answer provided'}</p>
                        </div>
                        <div className="mt-2 flex items-center gap-2">
                          <span className="text-xs text-gray-500">Score:</span>
                          <Input
                            type="number"
                            min="0"
                            max={maxMarks}
                            step="0.5"
                            className="w-24"
                            placeholder="0"
                            value={scores[`${result.id}-${idx}`] ?? ans.theory_score ?? ''}
                            onChange={(e) => handleScoreChange(result.id, idx, e.target.value)}
                          />
                          <span className="text-xs text-gray-400">/ {maxMarks}</span>
                        </div>
                      </div>
                    );
                  })}

                  <Button
                    size="sm"
                    className="bg-[#1e3a5f] hover:bg-[#2c4a6e]"
                    disabled={saving}
                    onClick={() => handleSaveStudent(result)}
                  >
                    <Save className="w-4 h-4 mr-1" /> Save Scores
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}