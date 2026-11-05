import { Link } from 'wouter';
import { ArrowRight, MessageCircle, Phone, Sparkles } from 'lucide-react';
import MainLayout from '@/components/layouts/MainLayout';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { faqs, InformationKind, siteInformation } from '@/content/siteInformation';

function SupportLinks() {
  return (
    <div className="flex flex-wrap gap-3">
      <Button asChild><a href="tel:+918087138429"><Phone className="mr-2 h-4 w-4" />Call 8087138429</a></Button>
      <Button asChild variant="outline">
        <a href="https://wa.me/918087138429" target="_blank" rel="noopener noreferrer">
          <MessageCircle className="mr-2 h-4 w-4" />Message on WhatsApp
        </a>
      </Button>
    </div>
  );
}

export default function SiteInformation({ kind }: { kind: InformationKind }) {
  const content = siteInformation[kind];
  return (
    <MainLayout title={`${content.title} | Vaidik Dhara`} description={content.intro}>
      <div className="container mx-auto max-w-4xl px-4 py-12 md:py-16" data-testid="site-information">
        <Link href="/" className="text-sm text-orange-700 hover:underline">Home</Link>
        <div className="mt-6 border-b border-orange-100 pb-8">
          <span className="mb-4 inline-flex items-center gap-2 rounded-full bg-orange-50 px-3 py-1 text-sm font-medium text-orange-700">
            <Sparkles className="h-4 w-4" aria-hidden="true" />Vaidik Dhara
          </span>
          <h1 className="font-poppins text-3xl font-bold text-neutral-900 md:text-4xl">{content.title}</h1>
          <p className="mt-4 text-lg leading-relaxed text-neutral-600">{content.intro}</p>
        </div>
        {kind === 'privacy' && (
          <aside className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
            <p>
              This notice describes current app practices and is general information, not legal advice.
              Please have it reviewed by a qualified professional before relying on it for legal compliance.
            </p>
            <p className="mt-2 font-medium">
              Last updated: <time dateTime="2026-11-05">November 5, 2026</time>
            </p>
          </aside>
        )}
        <div className="space-y-8 py-8">
          {content.sections.map(section => (
            <section key={section.title} className="rounded-xl border border-neutral-200 bg-white p-6 md:p-8">
              <h2 className="mb-3 text-xl font-semibold text-neutral-900">{section.title}</h2>
              {section.paragraphs.map(paragraph => <p key={paragraph} className="mt-3 leading-7 text-neutral-600">{paragraph}</p>)}
            </section>
          ))}
        </div>
        {kind === 'about' ? (
          <div className="flex flex-wrap gap-3">
            <Button asChild><Link href="/pujas">Explore Pujas<ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
            <Button asChild variant="outline"><Link href="/become-guruji">Become a Guruji</Link></Button>
            <Button asChild variant="outline"><Link href="/contact">Contact Us</Link></Button>
          </div>
        ) : kind === 'privacy' ? (
          <aside className="rounded-xl bg-orange-50 p-6">
            <h2 className="mb-2 text-lg font-semibold">Privacy requests</h2>
            <p className="mb-5 leading-7 text-neutral-600">
              You can disable your account immediately from Profile → Security → Delete account. To request
              correction or erasure of other personal information, or raise a privacy concern, contact the
              Vaidik Dhara support team. We may verify your account and retain records needed for bookings,
              refunds, disputes, and accounting.
            </p>
            <SupportLinks />
            <div className="mt-5 flex flex-wrap gap-4 text-sm text-orange-800">
              <Link href="/terms" className="hover:underline">Terms &amp; Conditions</Link>
              <Link href="/contact" className="hover:underline">Contact Us</Link>
              <Link href="/" className="hover:underline">Home</Link>
            </div>
          </aside>
        ) : (
          <aside className="rounded-xl bg-orange-50 p-6">
            <h2 className="mb-2 text-lg font-semibold">Questions about your booking?</h2>
            <p className="mb-5 text-neutral-600">Have your booking reference ready so we can help with the right request.</p>
            <SupportLinks />
            <div className="mt-5 flex flex-wrap gap-4 text-sm text-orange-800">
              <Link href="/my-bookings" className="hover:underline">My Bookings</Link>
              {kind !== 'cancellation' && <Link href="/cancellation-policy" className="hover:underline">Cancellation & Refunds</Link>}
              <Link href="/contact" className="hover:underline">Contact Us</Link>
            </div>
          </aside>
        )}
      </div>
    </MainLayout>
  );
}

export function ContactPage() {
  return (
    <MainLayout title="Contact Us | Vaidik Dhara" description="Contact Vaidik Dhara on 8087138429 for booking assistance and Guruji application support.">
      <div className="container mx-auto max-w-4xl px-4 py-12 md:py-16" data-testid="contact-page">
        <Link href="/" className="text-sm text-orange-700 hover:underline">Home</Link>
        <h1 className="mt-6 font-poppins text-3xl font-bold md:text-4xl">Contact Us</h1>
        <p className="mt-4 max-w-2xl text-lg leading-relaxed text-neutral-600">Need help choosing a puja, following up on a booking, or joining as a Guruji? Get in touch with Vaidik Dhara.</p>
        <section className="my-8 rounded-2xl border border-orange-100 bg-white p-6 md:p-8">
          <div className="mb-5 flex items-center gap-4">
            <div className="rounded-full bg-orange-50 p-4 text-orange-700"><Phone className="h-6 w-6" aria-hidden="true" /></div>
            <div>
              <h2 className="text-sm font-medium text-neutral-600">Call or message us</h2>
              <a href="tel:+918087138429" className="text-2xl font-bold text-neutral-900 hover:text-orange-700">8087138429</a>
            </div>
          </div>
          <p className="mb-6 leading-relaxed text-neutral-600">Use the call button to open your phone dialler, or the WhatsApp button to start a conversation.</p>
          <SupportLinks />
        </section>
        <div className="grid gap-6 md:grid-cols-2">
          <section className="rounded-xl border bg-white p-6">
            <h2 className="mb-3 text-lg font-semibold">For an existing booking</h2>
            <p className="mb-4 leading-7 text-neutral-600">Share your booking reference, puja name, scheduled date, and the issue you need help with. You can find your booking reference in your account.</p>
            <Link href="/my-bookings" className="inline-flex items-center gap-2 font-medium text-orange-700 hover:underline">Open My Bookings<ArrowRight className="h-4 w-4" /></Link>
          </section>
          <section className="rounded-xl border bg-white p-6">
            <h2 className="mb-3 text-lg font-semibold">For a Guruji application</h2>
            <p className="mb-4 leading-7 text-neutral-600">Have your registered name and phone number ready when asking about an application. If you have not applied yet, you can start online.</p>
            <Link href="/become-guruji" className="inline-flex items-center gap-2 font-medium text-orange-700 hover:underline">Become a Guruji<ArrowRight className="h-4 w-4" /></Link>
          </section>
        </div>
        <aside className="mt-8 rounded-xl bg-orange-50 p-6">
          <h2 className="mb-2 font-semibold">Keep your account safe</h2>
          <p className="leading-7 text-neutral-600">Never share your password, OTP, UPI PIN, or complete card details. For common booking questions, visit our <Link href="/faq" className="font-medium text-orange-700 underline">FAQs</Link>.</p>
        </aside>
      </div>
    </MainLayout>
  );
}

export function FaqPage() {
  return (
    <MainLayout title="Frequently Asked Questions | Vaidik Dhara" description="Answers about puja bookings, Guruji acceptance, service areas, cancellations and joining Vaidik Dhara.">
      <div className="container mx-auto max-w-3xl px-4 py-12 md:py-16" data-testid="faq-page">
        <Link href="/" className="text-sm text-orange-700 hover:underline">Home</Link>
        <h1 className="mt-6 font-poppins text-3xl font-bold md:text-4xl">Frequently Asked Questions</h1>
        <p className="mt-4 text-lg leading-relaxed text-neutral-600">Helpful answers for your puja booking and spiritual journey.</p>
        <Accordion type="single" collapsible className="my-8 rounded-xl border bg-white px-6">
          {faqs.map((faq, index) => (
            <AccordionItem key={faq.question} value={`faq-${index}`}>
              <AccordionTrigger className="text-left">{faq.question}</AccordionTrigger>
              <AccordionContent className="leading-7 text-neutral-600">{faq.answer}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
        <section className="rounded-xl bg-orange-50 p-6">
          <h2 className="mb-2 text-lg font-semibold">Still have a question?</h2>
          <p className="mb-5 text-neutral-600">Contact us for help with your specific service or booking.</p>
          <SupportLinks />
        </section>
      </div>
    </MainLayout>
  );
}