import { Search, Calendar, CheckCircle } from 'lucide-react';
import { Link } from 'wouter';

export default function HowItWorks() {
  return (
    <section className="py-12 bg-neutral-50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-2xl md:text-3xl font-bold text-neutral-900 font-poppins">How It Works</h2>
          <p className="mt-2 text-lg text-neutral-600">Simple steps to book your puja or consultation</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white rounded-lg p-6 shadow-sm text-center relative">
            <div className="absolute -top-5 left-1/2 transform -translate-x-1/2 w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-bold text-xl">1</div>
            <div className="w-16 h-16 mx-auto mb-4 text-primary">
              <Search className="h-full w-full" />
            </div>
            <h3 className="text-xl font-semibold mb-2 font-poppins">Search</h3>
            <p className="text-neutral-600">Search for pujas, consultations, or services based on your location and requirements</p>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-sm text-center relative">
            <div className="absolute -top-5 left-1/2 transform -translate-x-1/2 w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-bold text-xl">2</div>
            <div className="w-16 h-16 mx-auto mb-4 text-primary">
              <Calendar className="h-full w-full" />
            </div>
            <h3 className="text-xl font-semibold mb-2 font-poppins">Book</h3>
            <p className="text-neutral-600">Select your preferred date, time, and make the payment securely through our platform</p>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-sm text-center relative">
            <div className="absolute -top-5 left-1/2 transform -translate-x-1/2 w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-bold text-xl">3</div>
            <div className="w-16 h-16 mx-auto mb-4 text-primary">
              <CheckCircle className="h-full w-full" />
            </div>
            <h3 className="text-xl font-semibold mb-2 font-poppins">Experience</h3>
            <p className="text-neutral-600">Experience the puja or consultation with verified and experienced Gurujis</p>
          </div>
        </div>

        <div className="mt-12 text-center">
          <Link href="/how-it-works">
            <a className="inline-flex items-center text-primary hover:text-primary-700">
              <span>Learn more about our process</span>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-1" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
            </a>
          </Link>
        </div>
      </div>
    </section>
  );
}
