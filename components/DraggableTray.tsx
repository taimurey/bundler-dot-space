"use client"

import React, { useState } from 'react'
import { DndContext, useDraggable } from '@dnd-kit/core'
import { X } from 'lucide-react'
import { PiDotsSixBold } from "react-icons/pi";
// Empty draggable tray content that you can customize
function DraggableTrayContent({ trayHeader, toggleTray }: { trayHeader: React.ReactNode, toggleTray: () => void }) {
    const { attributes, listeners, setNodeRef, transform } = useDraggable({
        id: 'tray-content',
    });

    const style = transform ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    } : undefined;

    return (
        <div
            ref={setNodeRef}
            style={style}
            className="absolute z-50 bg-zinc-900 border border-[#2a2d36] rounded-sm shadow-xl w-80 overflow-hidden"
        >
            {/* Header with drag handle */}
            <div
                className="h-8 border-b border-[#2a2d36] cursor-move flex justify-between items-center px-2"
                {...listeners}
                {...attributes}
            >
                {trayHeader}
                <PiDotsSixBold className='text-gray-400 hover:text-white transition-colors text-lg' />
                <button
                    onClick={() => toggleTray()}
                    className="text-gray-400 hover:text-white hover:bg-gray-800/40 rounded-sm p-1 transition-colors"
                >
                    <X size={16} />
                </button>
            </div>

            {/* Content area - empty for you to implement */}
            <div className="p-4">
                {/* Your custom tray content will go here */}
                <div className="h-60 flex items-center justify-center text-gray-500 text-sm">
                    Your custom tray content
                </div>
            </div>
        </div>
    );
}

// Main draggable tray component
const DraggableTray: React.FC<{ buttonName: string, icon: React.ReactNode, trayHeader: React.ReactNode }> = ({ buttonName, icon, trayHeader }) => {
    // Track if the tray is open
    const [isOpen, setIsOpen] = useState(false);
    // Store position between drags
    const [position, setPosition] = useState({ x: 0, y: 0 });

    // Handle drag end to maintain position
    const handleDragEnd = (event: any) => {
        if (event.delta) {
            setPosition({
                x: position.x + event.delta.x,
                y: position.y + event.delta.y
            });
        }
    }

    const toggleTray = () => {
        setIsOpen(!isOpen);
    }

    return (
        <div className="relative">
            <button
                onClick={toggleTray}
                className="flex items-center rounded-sm bg-gray-800/20 hover:bg-gray-800/80 border border-gray-700 px-3 py-1.5 text-sm text-white transition-colors duration-200"
            >

                <span className='flex text-xs items-center gap-2'>{icon} {buttonName}</span>
            </button>

            {isOpen && (
                <div className="fixed inset-0 z-40 pointer-events-none">
                    <DndContext onDragEnd={handleDragEnd}>
                        <div
                            className="absolute pointer-events-auto"
                            style={{
                                left: `calc(50% + ${position.x}px)`,
                                top: `calc(50% + ${position.y}px)`,
                                transform: 'translate(-50%, -50%)'
                            }}
                        >
                            <DraggableTrayContent trayHeader={trayHeader} toggleTray={toggleTray} />
                        </div>
                    </DndContext>
                </div>
            )}
        </div>
    );
}

export default DraggableTray 