import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "Carter's App Studio", description: "Manage the Carter's mobile application" };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html>; }
