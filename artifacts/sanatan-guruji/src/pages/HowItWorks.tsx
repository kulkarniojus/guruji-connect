import { Helmet } from 'react-helmet';
import Header from '@/components/landing/Header';
import Footer from '@/components/landing/Footer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Phone, Video, MapPin, Calendar, CreditCard, Star } from 'lucide-react';

export default function HowItWorks() {
  return (
    <div className="min-h-screen bg-neutral-50">
      <Helmet>
        <title>How It Works | Vaidik Dhara</title>
        <meta name="description" content="Learn how Vaidik Dhara helps you book authentic puja services and consultations with verified Gurujis" />
      </Helmet>

      <Header />

      <main className="container mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-bold text-neutral-900 font-poppins mb-4">
            How Vaidik Dhara Works
          </h1>
          <p className="text-lg text-neutral-600 max-w-2xl mx-auto">
            Simple steps to connect with verified Gurujis for your spiritual needs
          </p>
        </div>

        {/* Process Steps */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          <Card className="text-center">
            <CardHeader>
              <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Calendar className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="text-lg">1. Select Service</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-neutral-600">
                Choose from online pujas, offline home visits, or spiritual consultations
              </p>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Star className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="text-lg">2. Choose Guruji</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-neutral-600">
                Browse verified Gurujis, check ratings, experience, and specializations
              </p>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CreditCard className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="text-lg">3. Book & Pay</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-neutral-600">
                Secure online payment with flexible scheduling options
              </p>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="text-lg">4. Experience</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-neutral-600">
                Enjoy authentic spiritual services with complete peace of mind
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Service Types */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold text-center mb-8">Our Services</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <div className="flex items-center space-x-2">
                  <MapPin className="h-6 w-6 text-primary" />
                  <CardTitle>Offline Pujas</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Gurujis visit your home for traditional pujas and ceremonies with all necessary items
                </CardDescription>
                <ul className="mt-4 space-y-2">
                  <li className="flex items-center text-sm">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                    Home visit included
                  </li>
                  <li className="flex items-center text-sm">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                    All puja materials provided
                  </li>
                  <li className="flex items-center text-sm">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                    Authentic Vedic rituals
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center space-x-2">
                  <Video className="h-6 w-6 text-primary" />
                  <CardTitle>Online Pujas</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Participate in live pujas from anywhere through video conference
                </CardDescription>
                <ul className="mt-4 space-y-2">
                  <li className="flex items-center text-sm">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                    HD video streaming
                  </li>
                  <li className="flex items-center text-sm">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                    Interactive experience
                  </li>
                  <li className="flex items-center text-sm">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                    Recorded for later viewing
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center space-x-2">
                  <Phone className="h-6 w-6 text-primary" />
                  <CardTitle>Consultations</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Get spiritual guidance, astrological advice, and muhurat suggestions
                </CardDescription>
                <ul className="mt-4 space-y-2">
                  <li className="flex items-center text-sm">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                    Expert guidance
                  </li>
                  <li className="flex items-center text-sm">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                    Personalized advice
                  </li>
                  <li className="flex items-center text-sm">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                    Flexible scheduling
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Why Choose Us */}
        <div className="bg-white rounded-lg p-8">
          <h2 className="text-2xl font-bold text-center mb-8">Why Choose Vaidik Dhara?</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-lg font-semibold mb-4">Verified Gurujis</h3>
              <p className="text-neutral-600 mb-4">
                All our Gurujis are thoroughly verified with proper credentials, experience certificates, and background checks.
              </p>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">Background Verified</Badge>
                <Badge variant="secondary">Experience Certified</Badge>
                <Badge variant="secondary">Customer Rated</Badge>
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Authentic Experience</h3>
              <p className="text-neutral-600 mb-4">
                Traditional Vedic rituals performed according to proper sastras and customs with complete authenticity.
              </p>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">Vedic Traditions</Badge>
                <Badge variant="secondary">Proper Rituals</Badge>
                <Badge variant="secondary">Sacred Mantras</Badge>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}