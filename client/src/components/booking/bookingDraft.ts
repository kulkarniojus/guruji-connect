export interface BookingDraft {
  returnTo: string;
  activeStep: number;
  bookingType: 'offline' | 'online' | 'consultation';
  consultationType: 'own_guruji' | 'auto_select' | 'immediate';
  gurujiSelectionMode: 'specific' | 'auto_nearby';
  selectedPujaId: string;
  selectedDate: string;
  selectedTime: string;
  selectedCity: string;
  address: string;
  pincode: string;
  selectedGurujiId: string;
  withSamagri: boolean;
}

const DRAFT_KEY = 'guruji-booking-registration-draft';

export function saveBookingDraft(draft: BookingDraft) {
  sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
}

export function readBookingDraft(returnTo: string): BookingDraft | null {
  try {
    const saved = sessionStorage.getItem(DRAFT_KEY);
    if (!saved) return null;
    const draft = JSON.parse(saved) as BookingDraft;
    return draft.returnTo === returnTo && draft.activeStep >= 1 && draft.activeStep <= 4 ? draft : null;
  } catch {
    return null;
  }
}

export function clearBookingDraft() {
  sessionStorage.removeItem(DRAFT_KEY);
}