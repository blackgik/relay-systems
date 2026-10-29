import React from "react";
import { SendingView } from "@/components/y/sending-view";

// The view lives in the layout so picking a shipment (a child route) keeps the
// list mounted: no refetch, no flash, and the selection animates.
export default function SendingLayout({
	children
}: {
	children: React.ReactNode;
}) {
	return (
		<>
			<SendingView />
			{children}
		</>
	);
}
