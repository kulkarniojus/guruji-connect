import { Link } from 'wouter';
import { ArrowUpRight, Flower2, MessageCircle, Phone } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function Footer() {
  const year = new Date().getFullYear();
  const { user } = useAuth();

  return (
    <footer className="relative overflow-hidden bg-neutral-900 text-white">
      <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-32 h-80 w-80 rounded-full border border-white/10" />
      <div aria-hidden="true" className="pointer-events-none absolute -right-12 -top-20 h-56 w-56 rounded-full border border-white/10" />
      <div className="container relative mx-auto px-5 pb-6 pt-12 sm:px-8 sm:pt-16">
        <div className="grid gap-12 border-b border-white/15 pb-12 lg:grid-cols-[1.25fr_2fr] lg:gap-20 lg:pb-14">
          <section aria-labelledby="footer-brand">
            <Link href="/" className="group inline-flex items-center gap-3 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-4 focus-visible:ring-offset-neutral-900">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-amber-300 text-neutral-900 transition-transform group-hover:rotate-6">
                <Flower2 className="h-6 w-6" strokeWidth={1.7} aria-hidden="true" />
              </span>
              <span id="footer-brand" className="font-poppins text-xl font-semibold tracking-tight sm:text-2xl">Vaidik Dhara</span>
            </Link>
            <p className="mt-5 max-w-sm text-sm leading-7 text-neutral-300 sm:text-base">
              A welcoming place for families to find authentic pujas and personal spiritual guidance from approved Gurujis.
            </p>
            <Link href="/about" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-amber-300 transition-colors hover:text-amber-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300">
              Discover Vaidik Dhara <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </section>

          <div className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 sm:gap-x-8">
            <nav aria-label="Explore Vaidik Dhara">
              <h2 className="font-poppins text-sm font-semibold tracking-wide text-white">Explore</h2>
              <ul className="mt-5 space-y-3.5">
                <li><Link href="/pujas" className="footer-link">Browse pujas</Link></li>
                <li><Link href="/services" className="footer-link">Services</Link></li>
                <li><Link href="/how-it-works" className="footer-link">How it works</Link></li>
                <li><Link href={user ? '/my-bookings' : '/register'} className="footer-link">{user ? 'My bookings' : 'Create an account'}</Link></li>
              </ul>
            </nav>

            <nav aria-label="About and support">
              <h2 className="font-poppins text-sm font-semibold tracking-wide text-white">About &amp; support</h2>
              <ul className="mt-5 space-y-3.5">
                <li><Link href="/about" className="footer-link">About Us</Link></li>
                <li><Link href="/faq" className="footer-link">FAQs</Link></li>
                <li><Link href="/contact" className="footer-link">Contact</Link></li>
                <li><Link href="/become-guruji" className="footer-link">Become a Guruji</Link></li>
                <li><Link href="/sales-rep" className="footer-link">Sales representative</Link></li>
              </ul>
            </nav>

            <nav aria-label="Policies" className="col-span-2 sm:col-span-1">
              <h2 className="font-poppins text-sm font-semibold tracking-wide text-white">Policies</h2>
              <ul className="mt-5 grid grid-cols-2 gap-x-6 gap-y-3.5 sm:grid-cols-1">
                <li><Link href="/privacy-policy" className="footer-link">Privacy policy</Link></li>
                <li><Link href="/terms" className="footer-link">Terms &amp; conditions</Link></li>
                <li><Link href="/cancellation-policy" className="footer-link">Cancellation policy</Link></li>
              </ul>
            </nav>
          </div>
        </div>

        <div className="flex flex-col gap-6 py-7 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-400">Need a hand?</p>
            <p className="mt-1.5 text-sm text-neutral-300">Speak with us about finding the right guidance.</p>
          </div>
          <div className="flex flex-col gap-3 min-[420px]:flex-row">
            <a
              href="tel:+918087138429"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-white/25 px-5 text-sm font-medium text-white transition-colors hover:border-amber-300 hover:text-amber-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
              aria-label="Call Vaidik Dhara at 8087138429"
            >
              <Phone className="h-4 w-4" aria-hidden="true" />
              8087138429
            </a>
            <a
              href="https://wa.me/918087138429"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-amber-300 px-5 text-sm font-semibold text-neutral-900 transition-colors hover:bg-amber-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-900"
              aria-label="Chat with Vaidik Dhara on WhatsApp"
            >
              <MessageCircle className="h-4 w-4" aria-hidden="true" />
              WhatsApp
              <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
            </a>
          </div>
        </div>

        <div className="flex flex-col gap-2 border-t border-white/15 pt-5 text-xs text-neutral-400 sm:flex-row sm:items-center sm:justify-between">
          <p>&copy; {year} Vaidik Dhara. All rights reserved.</p>
          <p>Connecting Hearts with Vaidik Wisdom</p>
        </div>
      </div>
      <style>{`
        .footer-link {
          display: inline-flex;
          color: rgb(212 212 212);
          font-size: 0.875rem;
          line-height: 1.35rem;
          transition: color 160ms ease;
        }
        .footer-link:hover { color: rgb(252 211 77); }
        .footer-link:focus-visible {
          outline: 2px solid rgb(252 211 77);
          outline-offset: 4px;
          border-radius: 2px;
        }
      `}</style>
    </footer>
  );
}
