import type { OnboardingStep } from '@/lib/types';

export const STEPS: { id: OnboardingStep; label: string; blurb: string }[] = [
  { id: 'PERSONAL', label: 'Personal details', blurb: 'Your legal name, date of birth and address' },
  { id: 'IDENTITY', label: 'NIN & BVN', blurb: 'Government identity numbers, encrypted' },
  { id: 'DOCUMENTS', label: 'ID & selfie', blurb: 'A photo of your ID and a selfie holding it' },
  { id: 'BANK', label: 'Payout account', blurb: 'A bank account in your own name' },
  { id: 'REVIEW', label: 'Review & submit', blurb: 'Confirm and send for verification' },
];

export const NG_STATES = [
  'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue', 'Borno', 'Cross River',
  'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu', 'FCT Abuja', 'Gombe', 'Imo', 'Jigawa', 'Kaduna', 'Kano',
  'Katsina', 'Kebbi', 'Kogi', 'Kwara', 'Lagos', 'Nasarawa', 'Niger', 'Ogun', 'Ondo', 'Osun', 'Oyo',
  'Plateau', 'Rivers', 'Sokoto', 'Taraba', 'Yobe', 'Zamfara',
];

export const ID_TYPES = [
  { value: 'INTL_PASSPORT', label: 'International passport' },
  { value: 'DRIVERS_LICENSE', label: "Driver's licence" },
  { value: 'VOTERS_CARD', label: "Voter's card (PVC)" },
  { value: 'NIN_SLIP', label: 'NIN slip / NIMC card' },
];
