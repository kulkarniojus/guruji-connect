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
    intro: 'This policy explains what Vaidik Dhara collects through its website and mobile app, why it is used, and the choices available to you.',
    sections: [
      {
        title: 'Who this policy covers',
        paragraphs: [
          'This policy applies when you use the Vaidik Dhara website or mobile app, create an account, browse or book a service, register for an event, apply to provide services, or contact our support team. “Vaidik Dhara” is the service brand shown in the app and on the website.',
          'For privacy questions or requests, contact the Vaidik Dhara support team at 8087138429 by phone or WhatsApp. Please do not send passwords, one-time passcodes, UPI PINs, or complete card details.',
        ],
      },
      {
        title: 'Information we collect',
        paragraphs: [
          'Account and profile information may include your name, email address, phone number, date of birth, age, gender, address, city, state, and postal code. Depending on the registration or service you choose, you may also provide category, caste or religious details, a profile photo, or other profile information.',
          'Guruji and other service-provider applications may include experience, languages, service areas, selected services, identity details, photographs, certificates, and verification documents. We use information requested in an application to review and manage that application.',
          'Booking and event information may include the selected puja or event, schedule, service address, preferences, instructions, booking status, attendance, cancellation, payment or refund records, and support messages. For a children’s event, a parent or legal guardian may provide the child’s name and age and confirm that they consent to registration.',
          'If you use address search, the address text you enter and selected city are sent to Google Places to return address suggestions and details. If a Guruji opts in to mobile push alerts, we process the app’s push token, device platform, and account association so request alerts can be delivered.',
          'The app uses an essential session cookie to keep you signed in. We may also process basic technical and security information, such as session identifiers and service logs, to operate the app, protect accounts, and investigate errors or misuse.',
        ],
      },
      {
        title: 'How we use information',
        paragraphs: [
          'We use information to create and maintain accounts; show relevant services and events; check city, availability, and booking details; route requests to Gurujis; manage applications; provide event registration and attendance records; send service and account notifications; handle cancellations, payment records, and refund requests; provide support; and protect the service.',
          'We use child participant details only to manage the event registration, eligibility, attendance, and related communications submitted by the parent or legal guardian.',
        ],
      },
      {
        title: 'When information is shared',
        paragraphs: [
          'The Guruji assigned to a booking receives the customer and service details reasonably needed to prepare for and deliver that booking. Our authorized support and administrative staff may access account, booking, application, event, and finance records to operate the service, assist users, review providers, and resolve issues.',
          'We use service providers for infrastructure and specific app functions, including Replit for app hosting and file storage, Neon for the application database, Google for address search, and Expo for push-notification delivery when a Guruji has enabled alerts. These providers process information needed for their services under their own privacy terms.',
          'When online payments are enabled for a booking or event, checkout is handled by Cashfree. We receive the transaction status and references needed to confirm and manage the payment. Payment credentials are entered with the payment provider; do not share a UPI PIN, bank password, one-time passcode, or full card details with Vaidik Dhara.',
          'If you choose to call or message us through WhatsApp, your communication is handled by your phone or messaging provider. WhatsApp is operated by Meta and has separate privacy terms. We do not sell personal information as a business practice.',
        ],
      },
      {
        title: 'Location, cookies, and notifications',
        paragraphs: [
          'We use the city and address you provide to show service coverage and arrange bookings. When you use address autocomplete, the text you enter and selected city are sent to Google Places. You can choose manual address entry when address search is unavailable or does not return the correct result.',
          'The session cookie is necessary for sign-in and account features. Blocking it may prevent those features from working. Guruji push alerts are optional; you can turn them off in the app or your device notification settings. In-app booking notifications may still appear in your account.',
        ],
      },
      {
        title: 'Payments and financial records',
        paragraphs: [
          'Payment options can be enabled or disabled by Vaidik Dhara. When a payment is collected online, Cashfree processes checkout and may process information under its own privacy policy. Vaidik Dhara stores transaction references and payment, cancellation, or refund status to administer bookings and financial records; payment availability may vary by service and current configuration.',
        ],
      },
      {
        title: 'Retention and security',
        paragraphs: [
          'We keep information while it is needed to provide the service, maintain your account, administer bookings and applications, handle support or disputes, and meet applicable record-keeping obligations. Retention periods depend on the type of record and its purpose. Some records may remain in protected backups for a limited period after they are removed from active systems.',
          'We use access controls and other reasonable safeguards to protect information. No website, app, or storage system can be guaranteed to be completely secure.',
        ],
      },
      {
        title: 'Your choices and privacy requests',
        paragraphs: [
          'You can review and update profile information available in your account. To close an account, open Profile, choose Delete account, enter your current password, and confirm. Sign-in is disabled immediately and Guruji availability is turned off. Account profile and booking, event, payment, refund, and accounting information may remain where needed to provide services, resolve disputes, or meet record-keeping obligations; closing an account disables access but does not itself erase all personal information or historical records.',
          'For requests to access, correct, or erase other personal information, or to raise a privacy concern, contact the Vaidik Dhara support team at 8087138429. We may verify your identity and may retain information required for an active booking, dispute, security, or legal obligation.',
          'You can withdraw optional push-notification permission through your device settings. You can also choose not to use Google address search and enter your address manually where that option is available.',
        ],
      },
      {
        title: 'Children’s information',
        paragraphs: [
          'You must be at least 18 years old to create an account. A parent or legal guardian may register a child for an eligible event and provide the child’s name and age for that registration. The guardian is responsible for submitting the information and consent. Children should not create an account or submit registration information on their own.',
          'If you believe a child’s information was submitted without a parent or legal guardian’s involvement, contact us at 8087138429 so we can review the request.',
        ],
      },
      {
        title: 'Third-party services and policy changes',
        paragraphs: [
          'Links to Google, Cashfree, Expo, WhatsApp, and other third-party services are governed by those providers’ own privacy terms. Their practices are not controlled by this policy.',
          'We may update this policy when our services or data practices change. The updated version will be posted on this page with a revised “Last updated” date. Please review it periodically.',
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