import { useState } from 'react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

// Define FAQs
const faqs = [
  {
    question: 'How do I book a puja?',
    answer: 'You can book a puja by searching for the required puja, selecting the date and time, and making the payment. Once your booking is confirmed, a verified guruji will be assigned to perform the puja.'
  },
  {
    question: 'What if I need to cancel my booking?',
    answer: 'Cancellation policy varies based on when you cancel. If you cancel before the guruji accepts the request, you\'ll receive a full refund. If you cancel before 48 hours of the scheduled time, you\'ll receive a full refund. For cancellations within 48 hours, a 50% fee will be charged.'
  },
  {
    question: 'How do online pujas work?',
    answer: 'For online pujas, you\'ll receive a Zoom link approximately 1 hour before the scheduled time. The guruji will perform the puja while you participate virtually. You can interact with the guruji, ask questions, and receive blessings just as you would in person.'
  },
  {
    question: 'How are the gurujis verified?',
    answer: 'All gurujis on our platform undergo a thorough verification process. We verify their credentials, experience, and expertise in performing various pujas. We also collect feedback from customers after each service to maintain quality.'
  },
  {
    question: 'What payment methods are accepted?',
    answer: 'We accept multiple payment methods including credit/debit cards, UPI, net banking, and popular digital wallets. All transactions are secure and encrypted for your safety.'
  }
];

export default function FAQ() {
  return (
    <section className="py-12 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-2xl md:text-3xl font-bold text-neutral-900 font-poppins">Frequently Asked Questions</h2>
          <p className="mt-2 text-lg text-neutral-600">Find answers to common questions about our services</p>
        </div>

        <div className="max-w-3xl mx-auto">
          <Accordion type="single" collapsible className="space-y-4">
            {faqs.map((faq, index) => (
              <AccordionItem 
                key={index} 
                value={`item-${index}`}
                className="border border-neutral-200 rounded-lg overflow-hidden"
              >
                <AccordionTrigger className="px-6 py-4 text-left bg-white hover:bg-neutral-50 font-medium text-neutral-900">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-4 text-neutral-600">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
}
