import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Plus, Edit, Trash2, FileText, Upload, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import ReactMarkdown from 'react-markdown';

export default function ManageNewsletter() {
  const [newsletters, setNewsletters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [previewDialog, setPreviewDialog] = useState(false);
  const [editingNewsletter, setEditingNewsletter] = useState(null);
  const [previewNewsletter, setPreviewNewsletter] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    term: 'First Term',
    session: '',
    content: '',
    attachment_url: '',
    published_date: '',
    status: 'Draft'
  });

  useEffect(() => {
    loadNewsletters();
  }, []);

  const loadNewsletters = async () => {
    const data = await base44.entities.Newsletter.list('-created_date');
    setNewsletters(data);
    setLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (editingNewsletter) {
      await base44.entities.Newsletter.update(editingNewsletter.id, formData);
    } else {
      await base44.entities.Newsletter.create({
        ...formData,
        published_date: new Date().toISOString().split('T')[0]
      });
    }

    setIsDialogOpen(false);
    resetForm();
    loadNewsletters();
  };

  const handleEdit = (newsletter) => {
    setEditingNewsletter(newsletter);
    setFormData(newsletter);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id) => {
    if (confirm('Are you sure you want to delete this newsletter?')) {
      await base44.entities.Newsletter.delete(id);
      loadNewsletters();
    }
  };

  const resetForm = () => {
    setEditingNewsletter(null);
    setFormData({
      title: '',
      term: 'First Term',
      session: '',
      content: '',
      attachment_url: '',
      published_date: '',
      status: 'Draft'
    });
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData({ ...formData, attachment_url: file_url });
    }
  };

  const handlePublish = async (newsletter) => {
    await base44.entities.Newsletter.update(newsletter.id, { status: 'Published' });
    loadNewsletters();
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Manage Newsletters</h1>
            <p className="text-gray-500">Create and manage end of term newsletters</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="bg-[#1e3a5f] hover:bg-[#2c4a6e]">
                <Plus className="w-4 h-4 mr-2" />
                Create Newsletter
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingNewsletter ? 'Edit Newsletter' : 'Create New Newsletter'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label>Title *</Label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g., End of First Term Newsletter"
                    required
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
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
                      placeholder="e.g., 2024/2025"
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label>Content (Markdown supported)</Label>
                  <Textarea
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    rows={12}
                    placeholder="Write newsletter content here... You can use markdown formatting."
                  />
                </div>

                <div>
                  <Label>Attachment (Optional)</Label>
                  <div className="mt-2">
                    {formData.attachment_url ? (
                      <div className="flex items-center gap-4">
                        <a href={formData.attachment_url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline">
                          View attachment
                        </a>
                        <Button type="button" variant="outline" size="sm" onClick={() => setFormData({ ...formData, attachment_url: '' })}>
                          Remove
                        </Button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-[#1e3a5f]">
                        <Upload className="w-6 h-6 text-gray-400 mb-1" />
                        <span className="text-sm text-gray-500">Upload document</span>
                        <input type="file" className="hidden" onChange={handleFileUpload} />
                      </label>
                    )}
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={() => { setIsDialogOpen(false); resetForm(); }}>Cancel</Button>
                  <Button type="submit" variant="outline">Save as Draft</Button>
                  <Button 
                    type="button" 
                    className="bg-[#1e3a5f] hover:bg-[#2c4a6e]"
                    onClick={(e) => {
                      setFormData({ ...formData, status: 'Published' });
                      setTimeout(() => handleSubmit(e), 100);
                    }}
                  >
                    Publish Newsletter
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Preview Dialog */}
        <Dialog open={previewDialog} onOpenChange={setPreviewDialog}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{previewNewsletter?.title}</DialogTitle>
            </DialogHeader>
            {previewNewsletter && (
              <div className="prose prose-sm max-w-none">
                <div className="mb-4 flex gap-2">
                  <Badge>{previewNewsletter.term}</Badge>
                  <Badge variant="outline">{previewNewsletter.session}</Badge>
                  <Badge className={previewNewsletter.status === 'Published' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                    {previewNewsletter.status}
                  </Badge>
                </div>
                <ReactMarkdown>{previewNewsletter.content}</ReactMarkdown>
                {previewNewsletter.attachment_url && (
                  <div className="mt-4">
                    <a href={previewNewsletter.attachment_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                      View Attachment
                    </a>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Newsletters Table */}
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
                      <TableHead>Term</TableHead>
                      <TableHead>Session</TableHead>
                      <TableHead>Published Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {newsletters.map((newsletter) => (
                      <TableRow key={newsletter.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-[#1e3a5f]/10 rounded-lg flex items-center justify-center">
                              <FileText className="w-5 h-5 text-[#1e3a5f]" />
                            </div>
                            <span className="font-medium">{newsletter.title}</span>
                          </div>
                        </TableCell>
                        <TableCell><Badge variant="outline">{newsletter.term}</Badge></TableCell>
                        <TableCell>{newsletter.session}</TableCell>
                        <TableCell>{newsletter.published_date || '-'}</TableCell>
                        <TableCell>
                          <Badge className={newsletter.status === 'Published' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                            {newsletter.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="icon" onClick={() => { setPreviewNewsletter(newsletter); setPreviewDialog(true); }}>
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleEdit(newsletter)}>
                              <Edit className="w-4 h-4" />
                            </Button>
                            {newsletter.status === 'Draft' && (
                              <Button variant="ghost" size="sm" onClick={() => handlePublish(newsletter)} className="text-green-600">
                                Publish
                              </Button>
                            )}
                            <Button variant="ghost" size="icon" onClick={() => handleDelete(newsletter.id)}>
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {newsletters.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-12 text-gray-500">No newsletters found</TableCell>
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