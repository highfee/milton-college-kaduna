import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, X, ChevronLeft, ChevronRight, Image } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function Gallery() {
  const [galleries, setGalleries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedGallery, setSelectedGallery] = useState(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [activeCategory, setActiveCategory] = useState('all');

  useEffect(() => {
    loadGalleries();
  }, []);

  const loadGalleries = async () => {
    const data = await base44.entities.Gallery.filter({ status: 'Published' });
    setGalleries(data);
    setLoading(false);
  };

  const categories = ['all', 'Activities', 'Library', 'Laboratory', 'Sports', 'Events', 'Facilities'];
  
  const filteredGalleries = activeCategory === 'all' 
    ? galleries 
    : galleries.filter(g => g.category === activeCategory);

  const openLightbox = (gallery, index) => {
    setSelectedGallery(gallery);
    setCurrentImageIndex(index);
  };

  const closeLightbox = () => {
    setSelectedGallery(null);
    setCurrentImageIndex(0);
  };

  const nextImage = () => {
    if (selectedGallery) {
      setCurrentImageIndex((prev) => 
        prev < selectedGallery.images.length - 1 ? prev + 1 : 0
      );
    }
  };

  const prevImage = () => {
    if (selectedGallery) {
      setCurrentImageIndex((prev) => 
        prev > 0 ? prev - 1 : selectedGallery.images.length - 1
      );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#1e3a5f] to-[#2c4a6e] text-white py-12">
        <div className="container mx-auto px-4">
          <Link to={createPageUrl('Home')} className="inline-flex items-center text-white/80 hover:text-white mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Link>
          <h1 className="text-3xl md:text-4xl font-bold">School Gallery</h1>
          <p className="text-blue-200 mt-2">Explore our activities, facilities, and memorable moments</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Category Tabs */}
        <Tabs value={activeCategory} onValueChange={setActiveCategory} className="mb-8">
          <TabsList className="flex flex-wrap justify-center gap-2 bg-transparent h-auto p-0">
            {categories.map(cat => (
              <TabsTrigger 
                key={cat} 
                value={cat}
                className="data-[state=active]:bg-[#1e3a5f] data-[state=active]:text-white px-4 py-2 rounded-full"
              >
                {cat === 'all' ? 'All' : cat}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin w-8 h-8 border-4 border-[#1e3a5f] border-t-transparent rounded-full"></div>
          </div>
        ) : filteredGalleries.length === 0 ? (
          <div className="text-center py-20">
            <Image className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No galleries found in this category</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredGalleries.map((gallery) => (
              <motion.div
                key={gallery.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-shadow"
              >
                <div className="relative aspect-video">
                  <img 
                    src={gallery.images?.[0] || 'https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=600'} 
                    alt={gallery.title}
                    className="w-full h-full object-cover cursor-pointer"
                    onClick={() => openLightbox(gallery, 0)}
                  />
                  <Badge className="absolute top-3 left-3 bg-white/90 text-[#1e3a5f]">
                    {gallery.category}
                  </Badge>
                  {gallery.images?.length > 1 && (
                    <Badge className="absolute top-3 right-3 bg-black/50 text-white">
                      {gallery.images.length} photos
                    </Badge>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="font-bold text-gray-900">{gallery.title}</h3>
                  {gallery.description && (
                    <p className="text-sm text-gray-500 mt-1 line-clamp-2">{gallery.description}</p>
                  )}
                  {gallery.images?.length > 1 && (
                    <div className="flex gap-1 mt-3 overflow-x-auto pb-2">
                      {gallery.images.slice(0, 4).map((img, idx) => (
                        <img 
                          key={idx}
                          src={img} 
                          alt=""
                          className="w-12 h-12 object-cover rounded cursor-pointer hover:opacity-80 flex-shrink-0"
                          onClick={() => openLightbox(gallery, idx)}
                        />
                      ))}
                      {gallery.images.length > 4 && (
                        <div 
                          className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center cursor-pointer hover:bg-gray-200 flex-shrink-0"
                          onClick={() => openLightbox(gallery, 4)}
                        >
                          <span className="text-xs font-medium text-gray-600">+{gallery.images.length - 4}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {selectedGallery && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center"
            onClick={closeLightbox}
          >
            <button
              onClick={closeLightbox}
              className="absolute top-4 right-4 p-2 text-white/80 hover:text-white"
            >
              <X className="w-8 h-8" />
            </button>

            <button
              onClick={(e) => { e.stopPropagation(); prevImage(); }}
              className="absolute left-4 p-2 text-white/80 hover:text-white"
            >
              <ChevronLeft className="w-10 h-10" />
            </button>

            <motion.img
              key={currentImageIndex}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              src={selectedGallery.images[currentImageIndex]}
              alt=""
              className="max-h-[85vh] max-w-[85vw] object-contain"
              onClick={(e) => e.stopPropagation()}
            />

            <button
              onClick={(e) => { e.stopPropagation(); nextImage(); }}
              className="absolute right-4 p-2 text-white/80 hover:text-white"
            >
              <ChevronRight className="w-10 h-10" />
            </button>

            <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
              <p className="text-white text-center mb-2">{selectedGallery.title}</p>
              <p className="text-white/60 text-sm">
                {currentImageIndex + 1} / {selectedGallery.images.length}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}