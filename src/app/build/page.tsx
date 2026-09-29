import type { Metadata } from "next";
import { Suspense } from "react";
import { Builder } from "@/components/build/Builder";

export const metadata: Metadata = {
  title: "Create a chart",
  description: "Paste your data, pick a chart, export a presentation-ready PNG.",
};

export default function BuildPage() {
  return (
    <Suspense fallback={<div className="center-page">…</div>}>
      <Builder />
    </Suspense>
  );
}
