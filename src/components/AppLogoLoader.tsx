interface AppLogoLoaderProps {
  label?: string
}

export default function AppLogoLoader({ label = 'Loading HeartTune' }: AppLogoLoaderProps) {
  return (
    <div className="app-logo-loader" role="status" aria-label={label}>
      <div className="app-logo-loader-mark">
        <img src="/favicon.png" alt="" />
      </div>
      <span className="app-logo-loader-name">HeartTune</span>
    </div>
  )
}
