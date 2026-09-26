import "./globals.css";import { Nav } from "@/components/Nav";
export const metadata={title:"Campus Project MVP",description:"Activity-first campus matching."};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body><Nav/><main className="mx-auto max-w-6xl px-6 py-8">{children}</main></body></html>}
