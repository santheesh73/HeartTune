import { ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

interface PageBackButtonProps {
  fallback?: string
  label?: string
}

export default function PageBackButton({
  fallback = '/',
  label = 'Back',
}: PageBackButtonProps) {
  const navigate = useNavigate()

  const handleBack = () => {
    if (typeof window !== 'undefined' && window.history.state?.idx > 0) {
      navigate(-1)
      return
    }

    navigate(fallback, { replace: true })
  }

  return (
    <div className="page-back-row">
      <button type="button" className="page-back-btn" onClick={handleBack}>
        <ArrowLeft size={18} />
        <span>{label}</span>
      </button>
    </div>
  )
}
