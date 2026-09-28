import "./globals.css";import { Nav } from "@/components/Nav";
export const metadata={title:"CampusCrew",description:"Activity-first campus matching.",icons:{icon:"/campuscrew-mark.svg"}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body><Nav/><main className="mx-auto max-w-6xl px-6 py-8">{children}</main></body></html>}
