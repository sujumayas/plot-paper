import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { GUIDES, type GuideSlug } from "@/lib/docs";
import { GuidePage } from "../GuidePage";

type Params = Promise<{ slug: string }>;

export function generateStaticParams() {
  return Object.keys(GUIDES)
    .filter(Boolean)
    .map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  return { title: GUIDES[slug as GuideSlug]?.title ?? "Guide" };
}

export default async function Guide({ params }: { params: Params }) {
  const { slug } = await params;
  if (!slug || !(slug in GUIDES)) notFound();
  return <GuidePage slug={slug as GuideSlug} />;
}
