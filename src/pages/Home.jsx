import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { 
  GraduationCap, Users, BookOpen, Award, Phone, Mail, MapPin, 
  ChevronRight, Star, Image, Send, MessageCircle, ArrowRight,
  Building2, FlaskConical, Library, Calendar, ClipboardList
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';

export default function Home() {
  const [settings, setSettings] = useState(null);
  const [galleries, setGalleries] = useState([]);
  const [ratings, setRatings] = useState([]);
  const [newRating, setNewRating] = useState({ user_name: '', rating: 5, review: '', user_type: 'Public' });
  const [contactForm, setContactForm] = useState({ from_name: '', from_email: '', from_phone: '', subject: '', content: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [settingsData, galleriesData, ratingsData] = await Promise.all([
        base44.entities.SchoolSettings.list(),
        base44.entities.Gallery.filter({ status: 'Published' }),
        base44.entities.Rating.filter({ status: 'Approved' })
      ]);
      setSettings(settingsData[0] || {});
      setGalleries(galleriesData.slice(0, 6));
      setRatings(ratingsData);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const handleContactSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    await base44.entities.Message.create({
      ...contactForm,
      message_type: 'Public-Admin'
    });
    setContactForm({ from_name: '', from_email: '', from_phone: '', subject: '', content: '' });
    setSubmitting(false);
    alert('Message sent successfully!');
  };

  const handleRatingSubmit = async (e) => {
    e.preventDefault();
    await base44.entities.Rating.create(newRating);
    setNewRating({ user_name: '', rating: 5, review: '', user_type: 'Public' });
    alert('Thank you for your rating!');
  };

  const sections = [
    { name: 'Nursery Section', icon: Users, desc: 'Foundation learning for ages 2-5', color: 'bg-pink-500' },
    { name: 'Primary Section', icon: BookOpen, desc: 'Primary 1-5 comprehensive education', color: 'bg-green-500' },
    { name: 'Secondary Section', icon: GraduationCap, desc: 'JSS1 to SS3 academic excellence', color: 'bg-blue-600' },
    { name: 'CBT Exams', icon: ClipboardList, desc: 'Computer-based testing system', color: 'bg-purple-500' }
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="relative text-white overflow-hidden min-h-screen flex flex-col">
        {/* Full background: school building */}
        <div className="absolute inset-0">
          <img 
            src="https://media.base44.com/images/public/696cc2e2095499293173480a/8e043b608_milton.jpg"
            alt="Milton College Building"
            className="w-full h-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#1e3a5f]/90 via-[#1e3a5f]/70 to-[#1e3a5f]/40"></div>
        </div>

        <div className="container mx-auto px-4 py-24 relative z-10 flex-1 flex items-center">
          <div className="flex flex-col lg:flex-row items-center gap-12 w-full">
            <motion.div 
              className="flex-1 text-center lg:text-left"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="flex items-center justify-center lg:justify-start gap-4 mb-6">
                {settings?.school_logo ? (
                  <img src={settings.school_logo} alt="School Logo" className="w-20 h-20 object-contain bg-white rounded-full p-2 shadow-lg" />
                ) : (
                  <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm border border-white/30">
                    <GraduationCap className="w-10 h-10" />
                  </div>
                )}
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4 leading-tight drop-shadow-lg">
                Milton College of<br />
                <span className="text-yellow-300">Arts & Science</span>
              </h1>
              <p className="text-lg text-blue-100 mb-4 font-medium">Kaduna, Nigeria</p>
              <p className="text-xl text-blue-100 mb-8 max-w-xl leading-relaxed">
                {settings?.motto || 'Nurturing Excellence, Building Future Leaders'}
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <Link to={createPageUrl('AdmissionForm')}>
                  <Button size="lg" className="bg-yellow-400 text-[#1e3a5f] hover:bg-yellow-300 font-bold px-8 shadow-xl">
                    Apply for Admission
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </Link>
                <Link to={createPageUrl('PortalLogin')}>
                  <Button size="lg" className="border-2 border-white bg-white/10 text-white hover:bg-white/25 px-8 backdrop-blur-sm font-semibold">
                    Portal Login
                  </Button>
                </Link>
              </div>
            </motion.div>

            {/* School scenes collage */}
            <motion.div 
              className="flex-1 grid grid-cols-2 gap-3 max-w-md"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <div className="col-span-2 rounded-2xl overflow-hidden h-48 shadow-2xl relative group">
                <img 
                  src="https://base44.app/api/apps/696cc2e2095499293173480a/files/public/696cc2e2095499293173480a/e1bdf51d9_IMG_20250312_133940_576.jpg"
                  alt="General Assembly"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent flex items-end p-3">
                  <span className="text-white text-sm font-semibold">Our Students</span>
                </div>
              </div>
              <div className="rounded-2xl overflow-hidden h-36 shadow-2xl relative group">
                <img 
                  src="https://base44.app/api/apps/696cc2e2095499293173480a/files/public/696cc2e2095499293173480a/15182ec35_IMG_20250312_133852_628.jpg"
                  alt="Computer Laboratory"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent flex items-end p-2">
                  <span className="text-white text-xs font-semibold">Learning</span>
                </div>
              </div>
              <div className="rounded-2xl overflow-hidden h-36 shadow-2xl relative group">
                <img 
                  src="https://base44.app/api/apps/696cc2e2095499293173480a/files/public/696cc2e2095499293173480a/fda2f4c43_WhatsAppImage2026-01-19at34608PM.jpeg"
                  alt="Matching"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent flex items-end p-2">
                  <span className="text-white text-xs font-semibold">Activities</span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Wave */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 120" className="w-full">
            <path fill="#ffffff" d="M0,64L80,69.3C160,75,320,85,480,80C640,75,800,53,960,48C1120,43,1280,53,1360,58.7L1440,64L1440,120L1360,120C1280,120,1120,120,960,120C800,120,640,120,480,120C320,120,160,120,80,120L0,120Z"></path>
          </svg>
        </div>
      </section>

      {/* School Scenes Strip */}
      <section className="py-10 bg-white">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
            {[
              { url: 'https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?w=300&q=80', label: 'Classroom' },
              { url: 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=300&q=80', label: 'Study Time' },
              { url: 'https://images.unsplash.com/photo-1567168544813-cc03465b4fa8?w=300&q=80', label: 'Assembly' },
              { url: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=300&q=80', label: 'Library' },
              { url: 'https://images.unsplash.com/photo-1574180045827-681f8a1a9622?w=300&q=80', label: 'Sports' },
            ].map((scene, idx) => (
              <motion.div
                key={idx}
                className="rounded-xl overflow-hidden aspect-square relative group shadow-md"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.08 }}
              >
                <img src={scene.url} alt={scene.label} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#1e3a5f]/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                  <span className="text-white text-xs font-semibold">{scene.label}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* About Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <Badge className="bg-[#1e3a5f]/10 text-[#1e3a5f] mb-4">About Us</Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
              Excellence in Education Since Establishment
            </h2>
            <p className="text-lg text-gray-600 leading-relaxed">
              {settings?.about || 
                'Milton College of Arts and Science, Kaduna is dedicated to providing quality education from nursery through secondary school. Our comprehensive curriculum, experienced teachers, and modern facilities ensure every student reaches their full potential.'}
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-16">
            {[
              { value: '20+', label: 'Classes', icon: Building2 },
              { value: '50+', label: 'Teachers', icon: Users },
              { value: '1000+', label: 'Students', icon: GraduationCap },
              { value: '15+', label: 'Years', icon: Award }
            ].map((stat, idx) => (
              <motion.div 
                key={idx}
                className="text-center"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
              >
                <div className="w-16 h-16 bg-[#1e3a5f]/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <stat.icon className="w-8 h-8 text-[#1e3a5f]" />
                </div>
                <h3 className="text-3xl font-bold text-[#1e3a5f]">{stat.value}</h3>
                <p className="text-gray-600">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Sections */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <Badge className="bg-[#1e3a5f]/10 text-[#1e3a5f] mb-4">Our Sections</Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900">Academic Programs</h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {sections.map((section, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
              >
                <Card className="h-full hover:shadow-xl transition-all border-0 bg-white">
                  <CardContent className="p-6">
                    <div className={`w-14 h-14 ${section.color} rounded-2xl flex items-center justify-center mb-4`}>
                      <section.icon className="w-7 h-7 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">{section.name}</h3>
                    <p className="text-gray-600">{section.desc}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Gallery Section */}
      {galleries.length > 0 && (
        <section className="py-20 bg-white">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <Badge className="bg-[#1e3a5f]/10 text-[#1e3a5f] mb-4">Gallery</Badge>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900">School Activities & Facilities</h2>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {galleries.map((gallery, idx) => (
                <motion.div
                  key={gallery.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.1 }}
                  className="relative group overflow-hidden rounded-2xl aspect-square"
                >
                  <img 
                    src={gallery.images?.[0] || 'https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=400'} 
                    alt={gallery.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="absolute bottom-4 left-4 right-4">
                      <Badge className="bg-white/20 text-white mb-2">{gallery.category}</Badge>
                      <h3 className="text-white font-semibold">{gallery.title}</h3>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="text-center mt-8">
              <Link to={createPageUrl('Gallery')}>
                <Button variant="outline" className="border-[#1e3a5f] text-[#1e3a5f]">
                  View All Gallery
                  <ChevronRight className="ml-2 w-4 h-4" />
                </Button>
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Ratings Section */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <Badge className="bg-[#1e3a5f]/10 text-[#1e3a5f] mb-4">Testimonials</Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900">What People Say</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mb-12">
            {ratings.slice(0, 3).map((rating, idx) => (
              <Card key={rating.id} className="border-0 bg-white">
                <CardContent className="p-6">
                  <div className="flex gap-1 mb-4">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className={`w-5 h-5 ${i < rating.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} />
                    ))}
                  </div>
                  <p className="text-gray-600 mb-4">"{rating.review}"</p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#1e3a5f] rounded-full flex items-center justify-center text-white font-bold">
                      {rating.user_name?.[0]}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{rating.user_name}</p>
                      <p className="text-sm text-gray-500">{rating.user_type}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Add Rating Form */}
          <Card className="max-w-md mx-auto border-0 bg-white">
            <CardContent className="p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Rate Our School</h3>
              <form onSubmit={handleRatingSubmit} className="space-y-4">
                <Input
                  placeholder="Your Name"
                  value={newRating.user_name}
                  onChange={(e) => setNewRating({...newRating, user_name: e.target.value})}
                  required
                />
                <div className="flex gap-2 justify-center">
                  {[1,2,3,4,5].map(star => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setNewRating({...newRating, rating: star})}
                    >
                      <Star className={`w-8 h-8 ${star <= newRating.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} />
                    </button>
                  ))}
                </div>
                <Textarea
                  placeholder="Write your review..."
                  value={newRating.review}
                  onChange={(e) => setNewRating({...newRating, review: e.target.value})}
                  rows={3}
                />
                <Button type="submit" className="w-full bg-[#1e3a5f] hover:bg-[#2c4a6e]">
                  Submit Rating
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-20 bg-[#1e3a5f] text-white">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12">
            <div>
              <Badge className="bg-white/20 text-white mb-4">Contact Us</Badge>
              <h2 className="text-3xl md:text-4xl font-bold mb-6">Get in Touch</h2>
              <p className="text-blue-200 mb-8">
                Have questions about admission or want to learn more about our school? We'd love to hear from you.
              </p>

              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center">
                    <Phone className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-blue-200 text-sm">Phone</p>
                    <a href="tel:08033492870" className="text-xl font-semibold hover:text-blue-300">08033492870</a>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center">
                    <Mail className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-blue-200 text-sm">Email</p>
                    <p className="text-xl font-semibold">{settings?.email || 'info@miltoncollege.edu.ng'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center">
                    <MapPin className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-blue-200 text-sm">Address</p>
                    <p className="text-xl font-semibold">{settings?.address || 'Kaduna, Nigeria'}</p>
                  </div>
                </div>
              </div>
            </div>

            <Card className="border-0 bg-white text-gray-900">
              <CardContent className="p-6">
                <h3 className="text-xl font-bold mb-4">Send us a Message</h3>
                <form onSubmit={handleContactSubmit} className="space-y-4">
                  <Input
                    placeholder="Your Name"
                    value={contactForm.from_name}
                    onChange={(e) => setContactForm({...contactForm, from_name: e.target.value})}
                    required
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      type="email"
                      placeholder="Email"
                      value={contactForm.from_email}
                      onChange={(e) => setContactForm({...contactForm, from_email: e.target.value})}
                    />
                    <Input
                      placeholder="Phone"
                      value={contactForm.from_phone}
                      onChange={(e) => setContactForm({...contactForm, from_phone: e.target.value})}
                    />
                  </div>
                  <Input
                    placeholder="Subject"
                    value={contactForm.subject}
                    onChange={(e) => setContactForm({...contactForm, subject: e.target.value})}
                    required
                  />
                  <Textarea
                    placeholder="Your Message"
                    value={contactForm.content}
                    onChange={(e) => setContactForm({...contactForm, content: e.target.value})}
                    rows={4}
                    required
                  />
                  <Button type="submit" className="w-full bg-[#1e3a5f] hover:bg-[#2c4a6e]" disabled={submitting}>
                    <Send className="w-4 h-4 mr-2" />
                    {submitting ? 'Sending...' : 'Send Message'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Floating WhatsApp Button */}
      <a 
        href="https://wa.me/2348033492870" 
        target="_blank" 
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 w-14 h-14 bg-green-500 rounded-full flex items-center justify-center shadow-lg hover:bg-green-600 transition-colors z-50"
      >
        <MessageCircle className="w-7 h-7 text-white" />
      </a>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-3 mb-4">
                {settings?.school_logo && (
                  <img src={settings.school_logo} alt="Logo" className="w-10 h-10 object-contain bg-white rounded-full p-1" />
                )}
                <span className="font-bold">Milton College</span>
              </div>
              <p className="text-gray-400 text-sm">
                Excellence in Education from Nursery to Secondary School
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Quick Links</h4>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li><Link to={createPageUrl('AdmissionForm')} className="hover:text-white">Apply for Admission</Link></li>
                <li><Link to={createPageUrl('Gallery')} className="hover:text-white">Gallery</Link></li>
                <li><Link to={createPageUrl('PortalLogin')} className="hover:text-white">Portal Login</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Sections</h4>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li>Nursery Section</li>
                <li>Primary Section</li>
                <li>Secondary Section</li>
                <li>CBT Exams</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Contact</h4>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li>📞 08033492870</li>
                <li>📍 Kaduna, Nigeria</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-500 text-sm">
            © {new Date().getFullYear()} Milton College of Arts and Science, Kaduna. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}