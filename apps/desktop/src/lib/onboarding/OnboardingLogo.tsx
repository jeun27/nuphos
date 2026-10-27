import { NuphosLogo } from '../../components/NuphosLogo'

/** The Nuphos mark for the shell's top slot, as on the welcome step. */
export function OnboardingLogo() {
  return (
    <div className="ob-logo flex items-center justify-center rounded-2xl bg-white shadow-sm">
      <NuphosLogo className="h-[86%] w-[86%]" variant="white-bg" />
    </div>
  )
}
