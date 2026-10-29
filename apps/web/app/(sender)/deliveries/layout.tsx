"use client";

import React, { useEffect } from "react";
import { usePathname } from "next/navigation";
import { Plus, Send, Truck } from "lucide-react";
import { Button } from "@/ui/elements";
import { useDashboardMode, useShellNotes } from "@/components/dashboard/shell";
import { deliveryCounts } from "@/lib/deliveries";
import { RoleTabs, type DeliveryTab } from "@/components/y/role-tabs";

/**
 * Deliveries: everything you send and everything you carry, one place.
 * The Sending / Carrying switch and the top bar's Sender / Courier role stay
 * in step: the URL sets the role on arrival, the role switch moves you after.
 */
export default function DeliveriesLayout({
	children
}: {
	children: React.ReactNode;
}) {
	const pathname = usePathname() ?? "/deliveries";
	const { mode, setMode } = useDashboardMode();
	const { notes } = useShellNotes();
	const tab: DeliveryTab | null = pathname.startsWith("/deliveries/carrying")
		? "carrying"
		: pathname.startsWith("/deliveries/sending")
			? "sending"
			: null;
	// Arriving on a tab sets the top bar's role to match it. (Flipping the
	// role switch while here navigates; that lives in the shell.)
	useEffect(() => {
		if (!tab) return;
		const want = tab === "carrying" ? "courier" : "sender";
		if (mode !== want) setMode(want);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [tab]);

	const counts = deliveryCounts(notes);

	return (
		<div className="flex flex-col gap-5">
			<header className="flex flex-wrap items-center gap-4">
				<div className="min-w-0 flex-1 basis-64">
					<h1 className="text-[34px] font-light leading-tight tracking-tight text-text-primary sm:text-[44px]">
						Deliveries
					</h1>
					<p className="text-body-s text-text-tertiary">
						{tab === "carrying"
							? "Requests to answer, jobs in your bag, and everything you have carried."
							: "Every package you send, tracked from handover to doorstep."}
					</p>
				</div>
				{tab === "carrying" ? (
					<span className="flex flex-wrap gap-2">
						<Button
							label="My trips"
							variant="secondary"
							fit
							iconLeading={<Truck size={16} />}
							href="/trips"
						/>
						<Button
							label="Start a new trip"
							fit
							iconLeading={<Plus size={16} />}
							href="/trips?new=1"
						/>
					</span>
				) : (
					<Button
						label="Send a package"
						fit
						iconLeading={<Send size={16} />}
						href="/search"
					/>
				)}
			</header>

			{tab && <RoleTabs tab={tab} counts={counts} />}

			{children}
		</div>
	);
}
