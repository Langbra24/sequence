import { DesktopGate } from "@/components/shell/desktop-gate"
import { DesktopOnlyNotice } from "@/components/shell/desktop-only-notice"

export default function Page() {
  return (
    <>
      <div className="hidden md:block">
        <DesktopGate />
      </div>
      <DesktopOnlyNotice className="md:hidden" />
    </>
  )
}
