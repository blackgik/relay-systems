import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalDoc } from '@/components/marketing/blocks';

export const metadata: Metadata = {
  title: 'Terms & conditions — Relay',
  description: 'The terms that govern sending and carrying packages on the Relay network.',
};

const SECTIONS = [
  {
    id: 'about',
    title: 'About these terms',
    body: (
      <>
        <p>
          These Terms and Conditions (“Terms”) govern your use of the Relay website, apps and services
          (together, the “Platform”). By creating an account, listing a trip or sending a package, you
          agree to these Terms and to our <Link href="/privacy" className="text-text-link underline dark:text-harbor-200">Privacy Policy</Link>.
        </p>
        <p>
          Relay is a marketplace. We connect people who want to send items (“Senders”) with verified
          travellers who carry them along trips they are already taking (“Carriers”). Relay is not
          itself a courier, carrier or freight forwarder, and does not take physical possession of
          packages.
        </p>
      </>
    ),
  },
  {
    id: 'eligibility',
    title: 'Eligibility & accounts',
    body: (
      <ul>
        <li>You must be at least 18 years old and able to enter a binding contract.</li>
        <li>You must give accurate information and keep it up to date. One person, one account.</li>
        <li>You are responsible for activity on your account and for keeping your credentials secure.</li>
        <li>We may suspend or close accounts that breach these Terms, provide false information or put other users at risk.</li>
      </ul>
    ),
  },
  {
    id: 'verification',
    title: 'Identity verification',
    body: (
      <>
        <p>
          Relay uses verification tiers. <strong>T1</strong> requires a verified NIN or BVN and permits
          domestic sending and carrying. <strong>T2</strong> requires a verified passport and permits
          international activity. We may also ask for liveness checks and proof of travel.
        </p>
        <p>
          Tiers only increase. Verification confirms identity documents through third-party providers;
          it is not an endorsement of any user’s character or conduct.
        </p>
      </>
    ),
  },
  {
    id: 'senders',
    title: 'Sender obligations',
    body: (
      <ul>
        <li>Describe every item accurately, including category, weight, photo and a truthful declared value.</li>
        <li>Make sure the item is legal to export from the origin and import at the destination, and is not on the prohibited list.</li>
        <li>Package items appropriately and hand them over unsealed so the Carrier can inspect them.</li>
        <li>Give correct receiver details and make sure the receiver is available to accept delivery.</li>
        <li>Pay all fees shown at checkout before custody begins.</li>
      </ul>
    ),
  },
  {
    id: 'carriers',
    title: 'Carrier obligations',
    body: (
      <ul>
        <li>List only genuine trips with accurate route, date, mode of travel and spare capacity.</li>
        <li>Accept or decline each request within 48 hours. Unanswered requests expire.</li>
        <li>Inspect every item before sealing. Refuse anything that does not match its description or is prohibited.</li>
        <li>Seal items in the tamper-evident bag provided, record the seal ID and complete every handoff through the in-app QR scan and photo.</li>
        <li>Share location while a package is in your custody, keep it in your possession, and never open a sealed bag.</li>
        <li>Comply with all customs, airline and transport rules, including declaring items where required.</li>
      </ul>
    ),
  },
  {
    id: 'prohibited',
    title: 'Prohibited items',
    body: (
      <>
        <p>The following may never be sent or carried on Relay:</p>
        <ul>
          <li>Weapons, ammunition, explosives, fireworks and replicas</li>
          <li>Narcotics, controlled substances and drug paraphernalia</li>
          <li>Cash, bearer instruments, precious metals, gemstones and cryptocurrency hardware wallets holding funds</li>
          <li>Flammable, toxic, corrosive, radioactive or otherwise hazardous materials, including loose lithium batteries</li>
          <li>Live animals, animal products restricted by law, and human remains</li>
          <li>Perishable food without suitable packaging, and any food banned at the destination</li>
          <li>Counterfeit goods, stolen property and items that infringe intellectual property</li>
          <li>Prescription medication without a valid prescription in the receiver’s name</li>
          <li>Anything illegal at the origin, destination or any point along the route</li>
        </ul>
        <p>Carriers may refuse any other item at their discretion.</p>
      </>
    ),
  },
  {
    id: 'payments',
    title: 'Fees, escrow & payouts',
    body: (
      <>
        <p>
          The price of a shipment is the sum of each leg’s carrier fee (the Carrier’s rate per kilogram
          multiplied by the package weight), a platform fee of <strong>5% of carrier fees</strong>, and
          an insurance premium of <strong>2% of the declared value</strong>. The full breakdown is shown
          before you pay.
        </p>
        <p>
          When you fund a shipment, carrier fees and the platform fee are held in escrow and the premium is
          paid into the insurance pool. Escrow is released as follows:
        </p>
        <ul>
          <li><strong>70%</strong> of a leg’s fee to its Carrier when custody passes to the next Carrier or the receiver with a matching seal.</li>
          <li>The remaining <strong>30%</strong> of each leg’s fee, and the platform fee, when delivery is confirmed with the receiver’s code.</li>
        </ul>
        <p>Escrow is frozen while a dispute is open. All amounts are recorded in a double-entry ledger in minor units.</p>
      </>
    ),
  },
  {
    id: 'cancellations',
    title: 'Cancellations, rerouting & refunds',
    body: (
      <ul>
        <li>Before funding, either party may cancel at no cost.</li>
        <li>If a Carrier rejects, lets a request expire or fails to show, the shipment moves to rerouting and the Sender may choose an alternative route or cancel.</li>
        <li>Amounts not yet released from escrow are refunded to the Sender’s wallet when a shipment is cancelled or refunded.</li>
        <li>Amounts already released to a Carrier for a completed handoff are not refundable except through a dispute decision.</li>
      </ul>
    ),
  },
  {
    id: 'insurance',
    title: 'Insurance cover',
    body: (
      <>
        <p>
          Each funded shipment is covered up to its declared value while in Relay custody — from the first
          sealed pickup to confirmed delivery. Cover does not apply to items that were misdeclared,
          prohibited, inadequately packaged, or handed over outside the Platform.
        </p>
        <p>Claims are made by opening a dispute and are decided by a Relay arbiter on the evidence available.</p>
      </>
    ),
  },
  {
    id: 'disputes',
    title: 'Disputes',
    body: (
      <>
        <p>
          A dispute opens automatically if a seal does not match at handoff, and may be opened by either
          party for loss, damage or non-delivery. A Relay arbiter reviews photos, scan records, chat
          history and location data and may release escrow, refund the Sender, split funds, or approve an
          insurance claim.
        </p>
        <p>You agree to cooperate with any review and to provide information we reasonably request.</p>
      </>
    ),
  },
  {
    id: 'conduct',
    title: 'Acceptable use',
    body: (
      <ul>
        <li>Do not arrange handoffs or payments outside the Platform for shipments matched on Relay.</li>
        <li>Do not harass, threaten or discriminate against other users.</li>
        <li>Do not attempt to circumvent masking, verification, escrow or any security control.</li>
        <li>Do not use the Platform for smuggling, money laundering or any unlawful purpose.</li>
      </ul>
    ),
  },
  {
    id: 'liability',
    title: 'Liability',
    body: (
      <>
        <p>
          Carriers are responsible for the items in their custody. Relay’s liability for any shipment is
          limited to the insurance cover described above, or, where that does not apply, to the fees you
          paid for that shipment. Relay is not liable for indirect or consequential loss, or for delays
          caused by transport operators, customs or events outside our reasonable control.
        </p>
        <p>Nothing in these Terms limits liability that cannot be limited by law.</p>
      </>
    ),
  },
  {
    id: 'changes',
    title: 'Changes & governing law',
    body: (
      <>
        <p>
          We may update these Terms. Material changes will be notified in the app at least 14 days before
          they take effect. These Terms are governed by the laws of the Federal Republic of Nigeria, and
          disputes not resolved through the Platform will be subject to the courts of Nigeria.
        </p>
        <p>
          Questions? Contact <a href="mailto:legal@relay.example" className="text-text-link underline dark:text-harbor-200">legal@relay.example</a>.
        </p>
      </>
    ),
  },
];

export default function Terms() {
  return (
    <LegalDoc
      title="Terms & conditions"
      updated="27 October 2026"
      intro={
        <>
          The short version: describe your item honestly, never send anything prohibited, keep every
          handoff inside the app, and your money stays in escrow until custody is proven. The full terms
          below are what actually apply.
        </>
      }
      sections={SECTIONS}
    />
  );
}
