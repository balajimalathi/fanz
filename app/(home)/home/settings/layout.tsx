import { SidebarNav } from "@/components/nav/side-bar-nav"
import { Separator } from "@/components/ui/separator" 
import { SubHeading } from "@/components/ui/sub-heading"

const sidebarNavItems = [ 
    {
        title: "Payouts",
        href: "/home/settings/payouts",
    },
    {
        title: "Bank Details",
        href: "/home/settings/bank-details",
    },
    {
        title: "Payout Settings",
        href: "/home/settings/payout-settings",
    },
    {
        title: "Notifications",
        href: "/home/settings/notifications",
    }
]

interface SettingsLayoutProps {
    children: React.ReactNode
}

export default function SettingsLayout({ children }: SettingsLayoutProps) {
    return (
        <>
            <div className="p-8 pb-16">
                <SubHeading title={"Settings"} description={"Manage your payout settings, bank details, and preferences."} />
                <Separator className="my-6" />
                <div className="flex flex-col space-y-8 lg:flex-row lg:space-x-12 lg:space-y-0">
                    <aside className="-ml-4 lg:w-1/6">
                        <SidebarNav items={sidebarNavItems} />
                    </aside>
                    <div className="flex-1">{children}</div>
                </div>
            </div>
        </>
    )
}