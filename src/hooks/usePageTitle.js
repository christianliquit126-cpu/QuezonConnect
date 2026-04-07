import { useEffect } from 'react'

export default function usePageTitle(title) {
  useEffect(() => {
    const base = 'QC Community'
    document.title = title ? `${title} | ${base}` : base
    return () => {
      document.title = base
    }
  }, [title])
}
