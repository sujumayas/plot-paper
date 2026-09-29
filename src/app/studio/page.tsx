import type { Metadata } from "next";
import { Studio } from "@/components/studio/Studio";

export const metadata: Metadata = {
  title: "Studio",
  description: "Create new chart types with PlotSpec, a safe declarative grammar — or ask Claude to draft one.",
};

export default function StudioPage() {
  return <Studio />;
}
