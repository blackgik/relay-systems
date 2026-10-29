import { redirect } from 'next/navigation';

// My shipments now live in Deliveries → Sending.
export default function ShipmentsRedirect() {
  redirect('/deliveries/sending');
}
