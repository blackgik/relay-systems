'use client';

import React, { useState } from 'react';
import { ColumnDef, PaginationState } from '@tanstack/react-table';
import { ArrowRight } from 'lucide-react';
import { AppShell } from '@/components/app-shell';
import {
  Badge,
  Button,
  Chip,
  CircularLoader,
  Drawer,
  Icon,
  ImageUploader,
  Input,
  Modal,
  ModalHeader,
  Popover,
  QrCode,
  Select,
  SkeletonLoader,
  Stepper,
  Table,
  TableCard,
  TableCardFacts,
  TableCardFact,
  TableCardHeader,
  TableCardTitle,
  Tabs,
  TabList,
  Tab,
  TabPanel,
  Textarea,
  Tooltip,
  Typography,
  toast,
} from '@/ui/elements';
import {
  ArrowRightIcon,
  CloseIcon,
  UploadCircleIcon,
} from '@/ui/elements/icon/app-icons';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4 border-t border-border py-8">
      <Typography size="headline-s" weight="bold" color="primary" as="h2">
        {title}
      </Typography>
      {children}
    </section>
  );
}

type LegRow = { id: string; route: string; from: string; to: string; status: string; fee: string };

const ROWS: LegRow[] = [
  { id: '1', route: 'RL-101', from: 'Awka', to: 'Abuja', status: 'in transit', fee: '₦12,500' },
  { id: '2', route: 'RL-102', from: 'Abuja', to: 'Houston', status: 'pending', fee: '₦48,000' },
  { id: '3', route: 'RL-103', from: 'Lagos', to: 'London', status: 'delivered', fee: '₦52,000' },
  { id: '4', route: 'RL-104', from: 'Awka', to: 'Lagos', status: 'funded', fee: '₦9,800' },
  { id: '5', route: 'RL-105', from: 'Enugu', to: 'Abuja', status: 'disputed', fee: '₦7,200' },
  { id: '6', route: 'RL-106', from: 'Abuja', to: 'Toronto', status: 'draft', fee: '₦61,000' },
  { id: '7', route: 'RL-107', from: 'Lagos', to: 'Houston', status: 'delivered', fee: '₦55,400' },
  { id: '8', route: 'RL-108', from: 'Awka', to: 'Enugu', status: 'pending', fee: '₦3,100' },
];

const COLUMNS: ColumnDef<LegRow>[] = [
  { accessorKey: 'route', header: 'Route' },
  { accessorKey: 'from', header: 'From' },
  { accessorKey: 'to', header: 'To' },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: (info) => <Badge label={String(info.getValue())} color="auto" />,
  },
  { accessorKey: 'fee', header: 'Fee' },
];

export default function DevPreview() {
  const [modalOpen, setModalOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState<string>();
  const [city, setCity] = useState<string>('Abuja');
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 4 });
  const pageCount = Math.ceil(ROWS.length / pagination.pageSize);
  const pageRows = ROWS.slice(
    pagination.pageIndex * pagination.pageSize,
    pagination.pageIndex * pagination.pageSize + pagination.pageSize
  );

  return (
    <AppShell>
      <div className="flex flex-col gap-2 pb-6">
        <Typography size="headline-m" weight="bold" color="primary" as="h1">
          Component gallery
        </Typography>
        <Typography size="body-l" color="secondary" as="p">
          Every ported primitive on the Relay harbor theme. Use the sun/moon toggle in the
          header to review dark mode.
        </Typography>
      </div>

      <Section title="Typography">
        <div className="flex flex-col gap-1">
          <Typography size="display-s" weight="bold" color="primary">Display S</Typography>
          <Typography size="headline-m" weight="bold" color="primary">Headline M</Typography>
          <Typography size="title-l" weight="semi-bold" color="primary">Title L</Typography>
          <Typography size="body-l" color="secondary">Body L — secondary text</Typography>
          <Typography size="body-m" color="secondary">Body M — secondary text</Typography>
          <Typography size="label-m" color="secondary">Label M</Typography>
        </div>
      </Section>

      <Section title="Buttons">
        <div className="flex flex-wrap items-center gap-3">
          <Button label="Primary" />
          <Button label="Secondary" variant="secondary" />
          <Button label="Ghost" variant="ghost" />
          <Button label="Subtle" variant="subtle" />
          <Button label="Text" variant="text" />
          <Button label="Error" variant="error" />
          <Button label="Loading" isLoading />
          <Button label="Next" rightIcon={<ArrowRight size={16} />} />
        </div>
      </Section>

      <Section title="Inputs">
        <div className="grid max-w-xl gap-4">
          <Input name="sender" label="Sender name" />
          <Input name="email" label="Email" errorMessage="Enter a valid email" />
          <Input name="info" label="Reference" infoMessage="Found on your receipt" />
          <Input name="fee" label="Fee" showMiniButton />
          <Input name="q" sizeType="sm" placeholder="Search" />
          <Textarea name="notes" label="Delivery notes" rows={3} />
          <Select
            value={city}
            onChange={setCity}
            listValue={['Awka', 'Abuja', 'Lagos', 'Houston']}
            label="City"
          />
        </div>
      </Section>

      <Section title="Badges">
        <div className="flex flex-wrap gap-2">
          <Badge label="success" color="success" />
          <Badge label="warning" color="warning" />
          <Badge label="error" color="error" />
          <Badge label="neutral" color="neutral" />
          <Badge label="info" color="info" />
          <Badge label="purple" color="purple" />
          <Badge label="teal" color="teal" />
          <Badge label="harbor" color="harbor" />
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge label="delivered" color="auto" />
          <Badge label="in transit" color="auto" />
          <Badge label="disputed" color="auto" />
          <Badge label="funded" color="auto" />
        </div>
      </Section>

      <Section title="Chips">
        <div className="flex flex-wrap gap-2">
          <Chip label="Display" />
          <Chip label="Filter" variant="filter" selected />
          <Chip label="Removable" variant="input" onRemove={() => {}} />
        </div>
      </Section>

      <Section title="Tabs">
        <Tabs defaultTab="one" variant="underline">
          <TabList>
            <Tab id="one">First</Tab>
            <Tab id="two">Second</Tab>
            <Tab id="three" disabled>Disabled</Tab>
          </TabList>
          <TabPanel id="one">
            <Typography size="body-m" color="secondary">First panel content.</Typography>
          </TabPanel>
          <TabPanel id="two">
            <Typography size="body-m" color="secondary">Second panel content.</Typography>
          </TabPanel>
        </Tabs>
      </Section>

      <Section title="Stepper">
        <Stepper
          steps={[
            { id: 'search', label: 'Search' },
            { id: 'seal', label: 'Seal' },
            { id: 'carry', label: 'Carry' },
            { id: 'deliver', label: 'Deliver' },
          ]}
          activeId="seal"
        />
      </Section>

      <Section title="Table">
        <Table
          columns={COLUMNS}
          data={pageRows}
          paginationState={pagination}
          setPaginationState={setPagination}
          pageCount={pageCount}
          totalItemsCount={ROWS.length}
        />
      </Section>

      <Section title="Table card">
        <TableCard>
          <TableCardHeader>
            <TableCardTitle label="Route">RL-101</TableCardTitle>
          </TableCardHeader>
          <TableCardFacts>
            <TableCardFact label="From">Awka</TableCardFact>
            <TableCardFact label="To">Abuja</TableCardFact>
          </TableCardFacts>
        </TableCard>
      </Section>

      <Section title="Modal and drawer">
        <div className="flex flex-wrap gap-3">
          <Button label="Open modal" variant="secondary" onClick={() => setModalOpen(true)} />
          <Button label="Open drawer" variant="secondary" onClick={() => setDrawerOpen(true)} />
        </div>
        <Modal isOpen={modalOpen} closeModal={() => setModalOpen(false)}>
          <div className="w-[min(560px,calc(100vw-2rem))]">
            <ModalHeader onClose={() => setModalOpen(false)} title="Example modal" />
            <div className="px-6 pb-6">
              <Typography size="body-m" color="secondary">
                Headless UI dialog with focus trap and Escape close.
              </Typography>
            </div>
          </div>
        </Modal>
        <Drawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)}>
          <div className="flex h-full flex-col gap-3 p-6">
            <Typography size="title-l" weight="semi-bold" color="primary">
              Example drawer
            </Typography>
            <Typography size="body-m" color="secondary">
              Slides in from the right edge.
            </Typography>
          </div>
        </Drawer>
      </Section>

      <Section title="Popover and tooltip">
        <div className="flex flex-wrap items-center gap-6">
          <Popover trigger={<Button label="Open popover" variant="secondary" />} title="Details">
            <Typography size="body-m" color="secondary">
              Rich contextual content with a dismiss action.
            </Typography>
          </Popover>
          <Tooltip content="Helpful hint text">
            <span className="text-body-m text-text-brand underline">Hover me</span>
          </Tooltip>
        </div>
      </Section>

      <Section title="Toasts">
        <div className="flex flex-wrap gap-3">
          <Button
            label="Success"
            variant="secondary"
            onClick={() => toast.success({ title: 'Handoff confirmed', description: 'Custody moved to Bola.' })}
          />
          <Button
            label="Warning"
            variant="secondary"
            onClick={() => toast.warning({ title: 'Deadline near', description: 'Accept before the 48h window closes.' })}
          />
          <Button
            label="Error"
            variant="secondary"
            onClick={() => toast.error({ title: 'Seal mismatch', description: 'Escrow frozen for review.' })}
          />
          <Button
            label="Info"
            variant="secondary"
            onClick={() => toast.info({ title: 'Leg accepted', description: 'Chika accepted leg 1.' })}
          />
        </div>
      </Section>

      <Section title="QR code">
        <div className="flex flex-wrap items-end gap-8">
          <QrCode value="https://relay.example/handoff/abc123" size={180} />
          <QrCode value="https://relay.example/handoff/abc123" size={120} withLogo={false} />
        </div>
      </Section>

      <Section title="Image uploader">
        <ImageUploader imageUrl={imageUrl} setImageUrl={setImageUrl} id="gallery-upload" />
      </Section>

      <Section title="Loaders">
        <div className="flex flex-wrap items-center gap-6">
          <CircularLoader />
          <div className="flex w-64 flex-col gap-2">
            <SkeletonLoader variant="rectangular" height="16px" />
            <SkeletonLoader variant="rectangular" height="16px" />
            <SkeletonLoader variant="circular" width="48px" height="48px" />
          </div>
        </div>
      </Section>

      <Section title="Icons">
        <div className="flex flex-wrap items-center gap-4">
          <Icon icon={CloseIcon} />
          <Icon icon={ArrowRightIcon} />
          <Icon icon={UploadCircleIcon} size="lg" />
        </div>
      </Section>
    </AppShell>
  );
}
