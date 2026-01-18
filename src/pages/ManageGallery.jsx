import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Plus, Edit, Trash2, Upload, X, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

const CATEGORIES = ['Activities', 'Library', 'Laboratory', 'Sports', 'Events', 'Facilities'];

export default function ManageGallery() {
  const [galleries, setGalleries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingGallery, setEditingGallery] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    category: '',
    description: '',
    images: [],
    date: '',
    status: 'Published'
  });

  useEffect(() => {
    loadGalleries();
  }, []);

  const loadGalleries = async () => {
    const data = await base44.entities.Gallery.list('-created_date');
    setGalleries(data);
    setLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (editingGallery) {
      await base44.entities.Gallery.update(editingGallery.id, formData);
    } else {
      await base44.entities.Gallery.create({
        ...formData,
        date: new Date().toISOString().split('T')[0]
      });
    }

    setIsDialogOpen(false);
    resetForm();
    loadGalleries();
  };

  const handleEdit = (gallery) => {
    setEditingGallery(gallery);
    setFormData(gallery);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id) => {
    if (confirm('Are you sure you want to delete this gallery?')) {
      await base44.entities.Gallery.delete(id);
      loadGalleries();
    }
  };

  const resetForm = () => {
    setEditingGallery(null);
    setFormData({
      title: '',
      category: '',
      description: '',
      images: [],
      date: '',
      status: 'Published'
    });
  };

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    
    setUploading(true);
    const uploadedUrls = [];
    
    for (const file of files) {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      uploadedUrls.push(file_url);
    }
    
    setFormData({ ...formData, images: [...(formData.images || []), ...uploadedUrls] });
    setUploading(false);
  };

  const removeImage = (index) => {
    const newImages = formData.images.filter((_, i) => i !== index);
    setFormData({ ...formData, images: newImages });
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Manage Gallery</h1>
            <p className="text-gray-500">Create and manage school galleries</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="bg-[#1e3a5f] hover:bg-[#2c4a6e]">
                <Plus className="w-4 h-4 mr-2" />
                Create Gallery
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingGallery ? 'Edit Gallery' : 'Create New Gallery'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label>Title *</Label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label>Category *</Label>
                    <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                      <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Status</Label>
                    <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Published">Published</SelectItem>
                        <SelectItem value="Draft">Draft</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label>Description</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                  />
                </div>

                <div>
                  <Label>Images *</Label>
                  <div className="mt-2 space-y-4">
                    {formData.images?.length > 0 && (
                      <div className="grid grid-cols-3 gap-2">
                        {formData.images.map((img, index) => (
                          <div key={index} className="relative group">
                            <img src={img} alt="" className="w-full h-24 object-cover rounded-lg" />
                            <button
                              type="button"
                              onClick={() => removeImage(index)}
                              className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-[#1e3a5f]">
                      <Upload className="w-8 h-8 text-gray-400 mb-2" />
                      <span className="text-sm text-gray-500">
                        {uploading ? 'Uploading...' : 'Click to upload images'}
                      </span>
                      <input 
                        type="file" 
                        className="hidden" 
                        multiple 
                        accept="image/*" 
                        onChange={handleImageUpload}
                        disabled={uploading}
                      />
                    </label>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={() => { setIsDialogOpen(false); resetForm(); }}>Cancel</Button>
                  <Button type="submit" className="bg-[#1e3a5f] hover:bg-[#2c4a6e]">
                    {editingGallery ? 'Update' : 'Create'} Gallery
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Gallery Grid */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin w-8 h-8 border-4 border-[#1e3a5f] border-t-transparent rounded-full"></div>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {galleries.map((gallery) => (
              <Card key={gallery.id} className="border-0 shadow-sm overflow-hidden group">
                <div className="relative aspect-video">
                  {gallery.images?.[0] ? (
                    <img 
                      src={gallery.images[0]} 
                      alt={gallery.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                      <ImageIcon className="w-12 h-12 text-gray-300" />
                    </div>
                  )}
                  <div className="absolute top-2 left-2">
                    <Badge>{gallery.category}</Badge>
                  </div>
                  <div className="absolute top-2 right-2">
                    <Badge className={gallery.status === 'Published' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                      {gallery.status}
                    </Badge>
                  </div>
                </div>
                <CardContent className="p-4">
                  <h3 className="font-semibold text-gray-900 mb-1">{gallery.title}</h3>
                  {gallery.description && (
                    <p className="text-sm text-gray-500 mb-3 line-clamp-2">{gallery.description}</p>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">{gallery.images?.length || 0} images</span>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(gallery)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(gallery.id)}>
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {galleries.length === 0 && (
              <div className="col-span-full text-center py-12 text-gray-500">
                <ImageIcon className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p>No galleries found. Create your first gallery.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}