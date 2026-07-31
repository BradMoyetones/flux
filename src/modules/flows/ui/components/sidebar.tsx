import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarHeader,
} from "@/ui/components/ui/sidebar"

export function FlowSidebar() {
    return (
        <Sidebar variant="floating" className="h-[calc(100vh-44px)] top-11">
            <SidebarHeader />
            <SidebarContent>
                <SidebarGroup />
                <SidebarGroup />
            </SidebarContent>
            <SidebarFooter />
        </Sidebar>
    )
}