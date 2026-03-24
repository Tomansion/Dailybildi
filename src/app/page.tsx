import { redirect } from 'next/navigation'

export default function HomePage() {
  // Redirect to canvas (will be caught by auth middleware if not logged in)
  redirect('/canvas')
}
