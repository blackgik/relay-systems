import React from "react";
import { CarryingView } from "@/components/y/carrying-view";

// Same pattern as Sending: the list stays mounted while the URL picks the leg.
export default function CarryingLayout({
	children
}: {
	children: React.ReactNode;
}) {
	return (
		<>
			<CarryingView />
			{children}
		</>
	);
}
