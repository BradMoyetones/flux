"use client"

import {
    Command,
    CommandDialog,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
    CommandShortcut,
} from "@/ui/components/ui/command"
import {
    CheckIcon,
    Folder,
    FolderPlus,
} from "lucide-react"

interface SelectWorkspaceModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    workspaces: string[];
    defaultWorkspace?: string;
    onSelect: (workspace: string) => void;
}
export default function SelectWorkspaceModal({ open, onOpenChange, workspaces, defaultWorkspace, onSelect }: SelectWorkspaceModalProps) {

    return (
        <CommandDialog open={open} onOpenChange={onOpenChange}>
            <Command>
                <CommandInput
                    placeholder="Busca el workspace para seleccionarlo..."
                />
                <CommandList className="no-scrollbar">
                    <CommandEmpty>No se encontraron resultados</CommandEmpty>
                    <CommandGroup heading="Acciones">
                        <CommandItem onSelect={() => onSelect("new_workspace")}>
                            <FolderPlus />
                            <span>Nuevo Workspace</span>
                        </CommandItem>
                    </CommandGroup>
                    <CommandSeparator />
                    <CommandGroup heading={"Espacios de trabajo"}>
                        {workspaces && workspaces.length > 0 ? workspaces.map((workspace) => (
                            <CommandItem
                                key={workspace}
                                onSelect={() => {
                                    onSelect?.(workspace)
                                    onOpenChange(false)
                                }}
                            >
                                <Folder />
                                <div className="flex flex-col">
                                    <span>{workspace.split(/[\\/]/).pop()}</span>
                                    <span className="text-xs text-muted-foreground">{workspace}</span>
                                </div>
                                <CommandShortcut>
                                    {defaultWorkspace === workspace && <CheckIcon />}
                                </CommandShortcut>
                            </CommandItem>
                        )) : <div className="flex items-center text-sm justify-center gap-2 pb-4">No se encontraron espacios de trabajo</div>
                        }
                    </CommandGroup>
                </CommandList>
            </Command>
        </CommandDialog>
    )
}
