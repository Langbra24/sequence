import { DesktopGate } from "@/components/shell/desktop-gate"
import { DesktopOnlyNotice } from "@/components/shell/desktop-only-notice"

export default function Page() {
  return (
    <>
      <div className="hidden lg:block">
        <DesktopGate />
      </div>
      <DesktopOnlyNotice className="lg:hidden" />
    </>
  )
}
