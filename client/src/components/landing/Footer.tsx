import { Link } from 'wouter';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { MapPin, Mail, Phone, Facebook, Instagram, Twitter, Linkedin } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-neutral-800 text-white">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center space-x-2 mb-6">
              <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <span className="text-xl font-bold font-poppins">PujaConnect</span>
            </div>
            <p className="text-neutral-400 mb-4">Connect with verified Pandits for your religious and spiritual needs. Book pujas, consultations, and more.</p>
            <div className="flex space-x-4">
              <a href="#" className="text-white hover:text-primary">
                <Facebook className="h-5 w-5" />
              </a>
              <a href="#" className="text-white hover:text-primary">
                <Instagram className="h-5 w-5" />
              </a>
              <a href="#" className="text-white hover:text-primary">
                <Twitter className="h-5 w-5" />
              </a>
              <a href="#" className="text-white hover:text-primary">
                <Linkedin className="h-5 w-5" />
              </a>
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-lg mb-4 font-poppins">Services</h3>
            <ul className="space-y-2">
              <li><Link href="/services/online-puja"><a className="text-neutral-400 hover:text-white">Online Puja Booking</a></Link></li>
              <li><Link href="/services/online-consultation"><a className="text-neutral-400 hover:text-white">Online Consultation</a></Link></li>
              <li><Link href="/services/brahmin-booking"><a className="text-neutral-400 hover:text-white">Brahmin Booking</a></Link></li>
              <li><Link href="/services/special-occasions"><a className="text-neutral-400 hover:text-white">Special Occasions</a></Link></li>
              <li><Link href="/services/training"><a className="text-neutral-400 hover:text-white">Training</a></Link></li>
              <li><Link href="/services/gifts"><a className="text-neutral-400 hover:text-white">Gifts</a></Link></li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-lg mb-4 font-poppins">Quick Links</h3>
            <ul className="space-y-2">
              <li><Link href="/about"><a className="text-neutral-400 hover:text-white">About Us</a></Link></li>
              <li><Link href="/blog"><a className="text-neutral-400 hover:text-white">Blog</a></Link></li>
              <li><Link href="/faq"><a className="text-neutral-400 hover:text-white">FAQs</a></Link></li>
              <li><Link href="/privacy-policy"><a className="text-neutral-400 hover:text-white">Privacy Policy</a></Link></li>
              <li><Link href="/terms"><a className="text-neutral-400 hover:text-white">Terms & Conditions</a></Link></li>
              <li><Link href="/contact"><a className="text-neutral-400 hover:text-white">Contact Us</a></Link></li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-lg mb-4 font-poppins">Contact Us</h3>
            <div className="space-y-4">
              <div className="flex items-start">
                <MapPin className="h-5 w-5 text-neutral-400 mr-2 mt-0.5" />
                <span className="text-neutral-400">123 Main Street, Mumbai, Maharashtra, India - 400001</span>
              </div>
              <div className="flex items-center">
                <Mail className="h-5 w-5 text-neutral-400 mr-2" />
                <span className="text-neutral-400">support@pujaconnect.com</span>
              </div>
              <div className="flex items-center">
                <Phone className="h-5 w-5 text-neutral-400 mr-2" />
                <span className="text-neutral-400">+91 9876543210</span>
              </div>
            </div>
            <div className="mt-6">
              <h4 className="font-medium mb-2">Subscribe to Newsletter</h4>
              <div className="flex">
                <Input 
                  type="email" 
                  placeholder="Your email" 
                  className="rounded-l-md w-full focus:outline-none focus:ring-2 focus:ring-primary text-neutral-900" 
                />
                <Button className="rounded-r-md hover:bg-primary-700">
                  Subscribe
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-neutral-700 text-center">
          <p className="text-neutral-400">&copy; {new Date().getFullYear()} PujaConnect. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
