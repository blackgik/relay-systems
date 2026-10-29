import { redirect } from 'next/navigation';

// Trips are created in a modal on My trips; old links land there with it open.
export default function PostTrip() {
  redirect('/trips?new=1');
}
