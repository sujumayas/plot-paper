import type { Metadata } from "next";
import { GuidePage } from "./GuidePage";

export const metadata: Metadata = { title: "User guide" };

export default function Guide() {
  return <GuidePage slug="" />;
}
