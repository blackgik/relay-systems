import { redirect } from 'next/navigation';

// Carry requests now live in Deliveries → Carrying.
export default function RequestsRedirect() {
  redirect('/deliveries/carrying');
}
