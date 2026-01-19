import { Button } from '@/components/ui/button';
import { Link } from 'wouter';

export default function CTA() {
  return (
    <section className="py-12 bg-primary-50">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-neutral-900 font-poppins mb-4">Ready to connect with verified Gurujis?</h2>
          <p className="text-lg text-neutral-700 mb-8">Book your first puja or consultation today and experience the authentic spiritual services</p>
          <div className="flex flex-col sm:flex-row justify-center space-y-4 sm:space-y-0 sm:space-x-4">
            <Button asChild className="px-6 py-3">
              <Link href="/booking?type=puja">
                Book a Puja
              </Link>
            </Button>
            <Button 
              variant="outline" 
              className="px-6 py-3 border border-primary text-primary-700 bg-white hover:bg-primary-50"
              asChild
            >
              <Link href="/booking?type=consultation">
                Get Online Consultation
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
