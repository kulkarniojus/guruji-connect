import { Card, CardContent } from '@/components/ui/card';
import { Star } from 'lucide-react';

// Define testimonials
const testimonials = [
  {
    id: 1,
    name: 'Rahul Sharma',
    rating: 5,
    text: 'I booked the Griha Pravesh puja through Sanatan Guruji. The pandit was very knowledgeable and performed the puja with utmost dedication. The entire booking process was smooth and hassle-free.',
    avatar: 'https://randomuser.me/api/portraits/men/32.jpg'
  },
  {
    id: 2,
    name: 'Priya Patel',
    rating: 4,
    text: 'I had an online consultation for my marriage date. The guruji was very patient and provided detailed insights. I\'m very satisfied with the service and will definitely use it again.',
    avatar: 'https://randomuser.me/api/portraits/women/44.jpg'
  },
  {
    id: 3,
    name: 'Vijay Mehta',
    rating: 5,
    text: 'Used the platform for online Satyanarayan Puja during lockdown. The experience was just as authentic as if it was performed at home. Will recommend to friends and family.',
    avatar: 'https://randomuser.me/api/portraits/men/67.jpg'
  }
];

export default function Testimonials() {
  return (
    <section className="py-12 bg-neutral-50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-2xl md:text-3xl font-bold text-neutral-900 font-poppins">What Our Customers Say</h2>
          <p className="mt-2 text-lg text-neutral-600">Experiences shared by people who used our platform</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map(testimonial => (
            <Card key={testimonial.id} className="bg-white p-6 rounded-lg shadow-sm">
              <CardContent className="p-0">
                <div className="flex items-center mb-4">
                  <img src={testimonial.avatar} alt={testimonial.name} className="w-12 h-12 rounded-full" />
                  <div className="ml-4">
                    <h4 className="font-semibold text-neutral-900">{testimonial.name}</h4>
                    <div className="flex">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star 
                          key={i}
                          className={`h-4 w-4 ${i < testimonial.rating ? 'text-yellow-400 fill-current' : 'text-neutral-300'}`} 
                        />
                      ))}
                    </div>
                  </div>
                </div>
                <p className="text-neutral-600">{testimonial.text}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
