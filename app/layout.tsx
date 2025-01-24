import type { Metadata } from 'next'
import { Noto_Sans_KR } from 'next/font/google'
import './globals.css'

const notoSansKR = Noto_Sans_KR({
  subsets: ['cyrillic'],
})

export const metadata: Metadata = {
  title: 'Entry Video Compress',
  description: 'mp4 파일을 엔트리 작품 파일로 변환하기',
}

export default function RootLayout({ children }: { readonly children: React.ReactNode }) {
  return (
    <html lang='en'>
      <body className={`${notoSansKR.className} antialiased`}>
        {children}
      </body>
    </html>
  )
}
