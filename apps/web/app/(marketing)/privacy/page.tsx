import React from 'react';
import type { Metadata } from 'next';
import { LegalDoc } from '@/components/marketing/blocks';

export const metadata: Metadata = {
  title: 'Privacy policy — Relay',
  description: 'What data Relay collects, why, and the choices you have.',
};

const SECTIONS = [
  {
    id: 'collect',
    title: 'What we collect',
    body: (
      <ul>
        <li><strong>Account data</strong> — name, email, phone number and password (stored hashed).</li>
        <li><strong>Verification data</strong> — NIN, BVN or passport details and liveness results, processed through our identity providers.</li>
        <li><strong>Shipment data</strong> — item descriptions, photos, weights, declared values and receiver details.</li>
        <li><strong>Trip data</strong> — routes, dates, travel mode and capacity listed by Carriers.</li>
        <li><strong>Custody data</strong> — QR scans, seal IDs, handoff photos and timestamps.</li>
        <li><strong>Location data</strong> — a Carrier’s device location, only while a package is in their custody.</li>
        <li><strong>Messages</strong> — chat between Senders and Carriers on a shipment.</li>
        <li><strong>Payment data</strong> — wallet balances and ledger entries. Card details are handled by our payment provider, not stored by us.</li>
      </ul>
    ),
  },
  {
    id: 'use',
    title: 'How we use it',
    body: (
      <ul>
        <li>To match shipments with trips and calculate routes and prices.</li>
        <li>To verify identity and keep fraudulent or unsafe users off the network.</li>
        <li>To record custody, show live tracking, and confirm delivery.</li>
        <li>To hold and release escrow and keep an accurate financial ledger.</li>
        <li>To review disputes and insurance claims.</li>
        <li>To meet legal, tax and anti-money-laundering obligations.</li>
      </ul>
    ),
  },
  {
    id: 'share',
    title: 'Who sees what',
    body: (
      <>
        <p>
          Other users see only what a shipment needs. Carriers see the item details, photo and the pickup
          or handoff point for their leg. Senders see their Carriers’ names, verification tier and
          location while in custody. <strong>Phone numbers are masked in chat on both sides.</strong>
        </p>
        <p>
          We share data with service providers (identity verification, payments, hosting, messaging) under
          contract, with arbiters reviewing a dispute, and with authorities where the law requires it. We
          do not sell personal data.
        </p>
      </>
    ),
  },
  {
    id: 'retention',
    title: 'How long we keep it',
    body: (
      <p>
        Custody records, ledger entries and dispute evidence are kept for as long as needed to resolve
        claims and meet legal record-keeping requirements. Live location is retained only for the shipment
        it relates to. When you close your account, we delete or anonymise the rest within a reasonable
        period.
      </p>
    ),
  },
  {
    id: 'rights',
    title: 'Your rights',
    body: (
      <>
        <p>
          Under the Nigeria Data Protection Act 2023 and other applicable laws, you may request access to,
          correction of, or deletion of your personal data, object to certain processing, and ask for a
          copy of your data in a portable format.
        </p>
        <p>
          Email <a href="mailto:privacy@relay.example" className="text-text-link underline dark:text-harbor-200">privacy@relay.example</a> to make a request.
        </p>
      </>
    ),
  },
  {
    id: 'security',
    title: 'Security',
    body: (
      <p>
        We use encryption in transit, hashed credentials, role-based access for staff and arbiters, and an
        append-only ledger. No system is perfectly secure; if we become aware of a breach affecting you, we
        will notify you and the relevant regulator as the law requires.
      </p>
    ),
  },
  {
    id: 'updates',
    title: 'Changes to this policy',
    body: <p>We will post any changes here and notify you in the app if they are significant.</p>,
  },
];

export default function Privacy() {
  return (
    <LegalDoc
      title="Privacy policy"
      updated="27 October 2026"
      intro={
        <>
          We collect what is needed to verify people, prove custody and move money safely — and nothing
          more. Location is only shared while a package is in a Carrier’s hands, and phone numbers are never
          shown to other users.
        </>
      }
      sections={SECTIONS}
    />
  );
}
