import { useMemo } from "react";
import {
    Sidebar,
    SidebarContent,
    SidebarGroup,
    SidebarGroupLabel,
    SidebarGroupContent,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuItem,
    SidebarMenuButton,
} from '@flux/ui';
import { Separator } from '@flux/ui';
import { pluginRegistry, PLUGIN_CATEGORIES, type PluginCategory, type PluginDefinition } from "../../plugins/registry";
import { Globe, MessageSquare, Database, GitBranch, Puzzle, Wrench, GripVertical, type LucideIcon } from "lucide-react";

const ICON_MAP: Record<string, LucideIcon> = {
    Globe,
    MessageSquare,
    Database,
    GitBranch,
    Puzzle,
    Wrench,
};

function DraggablePluginItem({ plugin }: { plugin: PluginDefinition }) {
    const Icon = ICON_MAP[plugin.icon] || Puzzle;

    const onDragStart = (event: React.DragEvent) => {
        event.dataTransfer.setData("application/flux-node-type", plugin.type);
        event.dataTransfer.effectAllowed = "move";
    };

    return (
        <SidebarMenuItem>
            <SidebarMenuButton
                draggable
                onDragStart={onDragStart}
                className="cursor-grab active:cursor-grabbing"
                tooltip={plugin.description}
            >
                <GripVertical className="w-3 h-3 opacity-30 shrink-0" />
                <Icon className="w-4 h-4 shrink-0" style={{ color: plugin.color }} />
                <span className="truncate">{plugin.label}</span>
            </SidebarMenuButton>
        </SidebarMenuItem>
    );
}

export function FlowSidebar() {
    const grouped = useMemo(() => {
        const map = new Map<PluginCategory, PluginDefinition[]>();
        for (const plugin of Object.values(pluginRegistry)) {
            const list = map.get(plugin.category) || [];
            list.push(plugin);
            map.set(plugin.category, list);
        }
        return map;
    }, []);

    return (
        <Sidebar variant="floating" className="h-[calc(100vh-44px)] top-11">
            <SidebarHeader className="px-4 py-3">
                <h3 className="text-sm font-semibold">Nodos</h3>
                <p className="text-xs text-muted-foreground">Arrastra al canvas para añadir</p>
            </SidebarHeader>
            <Separator />
            <SidebarContent>
                {Array.from(grouped.entries()).map(([category, plugins]) => {
                    const categoryMeta = PLUGIN_CATEGORIES[category];
                    const CategoryIcon = ICON_MAP[categoryMeta.icon] || Puzzle;

                    return (
                        <SidebarGroup key={category}>
                            <SidebarGroupLabel>
                                <CategoryIcon className="w-3.5 h-3.5 mr-1.5 opacity-60" />
                                {categoryMeta.label}
                            </SidebarGroupLabel>
                            <SidebarGroupContent>
                                <SidebarMenu>
                                    {plugins.map((plugin) => (
                                        <DraggablePluginItem key={plugin.type} plugin={plugin} />
                                    ))}
                                </SidebarMenu>
                            </SidebarGroupContent>
                        </SidebarGroup>
                    );
                })}
            </SidebarContent>
        </Sidebar>
    );
}