export type InformationKind = 'about' | 'privacy' | 'terms' | 'cancellation';

type Section = { title: string; paragraphs: string[] };
type InformationContent = { title: string; intro: string; sections: Section[] };

export const siteInformation: Record<InformationKind, InformationContent> = {
  about: {
    title: 'About Vaidik Dhara',
    intro: 'Traditional rituals, thoughtful guidance, and a simpler way to connect with a Guruji.',
    sections: [
      {
        title: 'Who we are',
        paragraphs: [
          'Vaidik Dhara connects people and families with Gurujis for pujas, religious ceremonies, and spiritual guidance. We bring service discovery, scheduling, and booking updates together so you can focus on the occasion that matters to you.',
          'Our purpose is to make it easier to find a spiritual guide who serves your location, understands your language, and offers the puja you need.',
        ],
      },
      {
        title: 'Find the right service',
        paragraphs: [
          'Explore the puja catalogue, read service details, and choose your city and preferred schedule. You can select an available Guruji or request help finding one. Online and in-person options depend on the selected service and Guruji.',
          'A submitted booking is a request, not a guarantee of availability. Your Guruji must accept the request before it is treated as accepted. You can follow its progress in My Bookings.',
        ],
      },
      {
        title: 'A community of Gurujis',
        paragraphs: [
          'Gurujis can apply with their experience, puja specializations, service cities, and languages. Applications are reviewed by the administration team before profiles are approved.',
          'Whether you are planning a family ceremony or seeking spiritual guidance, we encourage you to discuss your requirements with your Guruji before the service.',
        ],
      },
      {
        title: 'Here to help',
        paragraphs: [
          'For booking assistance, questions about a service, or help with a Guruji application, contact us on 8087138429. Our contact page includes direct calling and WhatsApp options.',
        ],
      },
    ],
  },
  privacy: {
    title: 'Privacy Policy',
    intro: 'How information is used when you use Vaidik Dhara.',
    sections: [
      {
        title: 'Information you provide',
        paragraphs: [
          'Account information can include your name, email address, phone number, and profile details. Booking information includes your selected puja, schedule, service location, and any instructions you provide.',
          'Guruji applications can include experience, languages, service areas, identity details, and documents supplied for application review. Provide only information needed for the service or application.',
        ],
      },
      {
        title: 'Why we use it',
        paragraphs: [
          'We use information to manage accounts, process booking requests, match services to your city and requirements, communicate updates, review Guruji applications, and respond to support requests.',
          'Booking details needed to arrange or deliver a service may be shared with the relevant Guruji and administration team. Service providers supporting hosting, communications, or payments may process information needed for those functions.',
        ],
      },
      {
        title: 'Sessions and communications',
        paragraphs: [
          'The website uses session cookies to keep you signed in. Your browser settings can control cookies, but blocking them can prevent account and booking features from working.',
          'Calling or opening WhatsApp uses the phone or messaging service on your device. WhatsApp is a separate service with its own privacy terms. Do not send passwords, OTPs, or payment credentials in support messages.',
        ],
      },
      {
        title: 'Your information and requests',
        paragraphs: [
          'You can review and update available account details from your profile. For other access, correction, or deletion requests, contact 8087138429. We may need to verify account ownership before acting on a request.',
          'Some records may need to be retained for outstanding bookings, disputes, or applicable legal obligations. Contact support if you have questions about a particular record.',
        ],
      },
    ],
  },
  terms: {
    title: 'Terms & Conditions',
    intro: 'Important information about accounts, bookings, and using our services.',
    sections: [
      {
        title: 'Using Vaidik Dhara',
        paragraphs: [
          'Vaidik Dhara helps customers discover spiritual services and send booking requests to Gurujis. Provide accurate contact details, location, and service requirements so your request can be handled correctly.',
          'Keep your login details private. Do not use another person’s account, impersonate a Guruji, or submit false or abusive requests.',
        ],
      },
      {
        title: 'Bookings and availability',
        paragraphs: [
          'Submitting a request does not itself confirm a Guruji’s availability or acceptance. Check the status in My Bookings and discuss arrangements with the Guruji after acceptance.',
          'The date, time, location, service type, and any materials or preparation should be agreed before the ceremony. A requested change is subject to the Guruji’s availability.',
        ],
      },
      {
        title: 'Pricing and payments',
        paragraphs: [
          'Review the service details and any displayed price before submitting a request. Where payment is required, follow the instructions shown in the booking flow.',
          'For questions about a charge or payment, contact support with your booking reference. Never share an OTP, password, UPI PIN, or complete card details.',
        ],
      },
      {
        title: 'Respectful participation',
        paragraphs: [
          'Customers and Gurujis should communicate respectfully and provide a suitable environment for the agreed service. Report inappropriate conduct or an issue with a booking to support.',
          'Spiritual guidance and religious services are not a substitute for medical, legal, or financial advice. No particular personal, health, or financial outcome is guaranteed.',
        ],
      },
      {
        title: 'Cancellations and assistance',
        paragraphs: [
          'See the Cancellation & Refunds page for how to request a cancellation or review of a payment. For assistance with these terms or a specific booking, call 8087138429.',
        ],
      },
    ],
  },
  cancellation: {
    title: 'Cancellation & Refunds',
    intro: 'How to get help when your booking plans change.',
    sections: [
      {
        title: 'Requesting a cancellation',
        paragraphs: [
          'Open My Bookings, select the booking, and use the cancellation action if it is available. If you cannot cancel from the booking page, contact 8087138429 with your booking reference.',
          'Please notify us and your Guruji as early as possible. Check the booking status after submitting a cancellation request; a message to support alone does not change the status shown in your account.',
        ],
      },
      {
        title: 'Changing the date or location',
        paragraphs: [
          'Contact support or your assigned Guruji to discuss a change. A different date, time, location, or service may require a new availability check and agreement. Do not assume the original acceptance applies to a changed schedule.',
        ],
      },
      {
        title: 'If a Guruji is unavailable',
        paragraphs: [
          'If your request is declined or a Guruji cannot attend, contact support to discuss finding another available Guruji or cancelling the request. A replacement depends on availability in your service city.',
        ],
      },
      {
        title: 'Payment and refund enquiries',
        paragraphs: [
          'If no payment was collected, there is no payment to refund. If you have paid, contact support with your booking reference, payment date, amount, and transaction reference.',
          'Refund enquiries are reviewed against the booking status, any service already delivered, and the payment record. This page does not promise an automatic refund, a fixed refund amount, or a fixed processing time. Support can clarify the outcome for your particular booking.',
        ],
      },
    ],
  },
};

export const faqs = [
  {
    question: 'How do I book a puja?',
    answer: 'Browse Pujas, open a service, and start a booking. Choose your city, date, time, and service details, then submit your request. Sign in or register when prompted. Track the request in My Bookings.',
  },
  {
    question: 'Is my booking confirmed as soon as I submit it?',
    answer: 'No. A submitted booking is a request. The Guruji must accept it; choosing a Guruji or making a payment does not count as acceptance. Check My Bookings for the current status.',
  },
  {
    question: 'Can you help me find a Guruji?',
    answer: 'Yes. If the booking flow offers help finding a Guruji, you can submit your request without choosing one. Matching depends on the puja, service city, schedule, and eligible Gurujis. You can also call 8087138429 for assistance.',
  },
  {
    question: 'Are online and in-person services available?',
    answer: 'Service options depend on the puja and the Guruji’s offerings. Review the service details and available booking options before choosing. Confirm any online joining arrangements or in-person address with your Guruji.',
  },
  {
    question: 'How do I know whether my city is covered?',
    answer: 'Check the city choices in the booking flow and the service areas offered by available Gurujis. If you cannot find a suitable option, contact us on 8087138429.',
  },
  {
    question: 'What should I prepare for the ceremony?',
    answer: 'Preparation and materials vary by puja. Review the service details and ask your Guruji about the required items, space, participants, and timing before the scheduled date.',
  },
  {
    question: 'How do I change or cancel a booking?',
    answer: 'Open the booking from My Bookings and use the available cancellation action, or contact support with your booking reference. Schedule changes need to be agreed with the Guruji. See Cancellation & Refunds for payment enquiries.',
  },
  {
    question: 'How can I join as a Guruji?',
    answer: 'Open Become a Guruji and submit your experience, puja specializations, service cities, languages, and requested application details. The administration team reviews applications before approval.',
  },
  {
    question: 'How do I contact Vaidik Dhara?',
    answer: 'Call 8087138429 or use the WhatsApp link on the Contact Us page. Include your booking reference when asking about an existing booking, but never send passwords, OTPs, or payment credentials.',
  },
];