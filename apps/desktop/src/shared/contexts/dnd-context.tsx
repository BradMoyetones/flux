import { createContext, useContext, useState } from 'react';

interface DnDContextType {
    type: string | null;
    setType: (type: string | null) => void;
}

const DnDContext = createContext<DnDContextType>({ type: null, setType: () => { } });

export const DnDProvider = ({ children }: { children: React.ReactNode }) => {
    const [type, setType] = useState<string | null>(null);

    return (
        <DnDContext.Provider value={{ type, setType }}>
            {children}
        </DnDContext.Provider>
    );
}

export default DnDContext;

export const useDnD = () => {
    return useContext(DnDContext);
}