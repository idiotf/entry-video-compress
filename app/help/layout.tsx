import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '도움말',
}

export default function Layout({ children }: React.PropsWithChildren) {
  return children
}
