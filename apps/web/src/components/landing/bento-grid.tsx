import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface BentoCardProps {
    title: string;
    description: string;
    icon: ReactNode;
    className?: string;
    graphic?: ReactNode;
}

export function BentoCard({ title, description, icon, className, graphic }: BentoCardProps) {
    return (
        <div
            className={cn(
                "group relative flex flex-col justify-between overflow-hidden rounded-3xl bg-neutral-50 dark:bg-neutral-900/50 p-6 sm:p-8 transition-transform hover:scale-[1.01] duration-300",
                className
            )}
        >
            <div className="z-10 flex flex-col gap-4">
                <div className="w-12 h-12 rounded-2xl bg-white dark:bg-neutral-800 flex items-center justify-center shadow-sm text-neutral-900 dark:text-white">
                    {icon}
                </div>
                <div>
                    <h3 className="text-xl font-semibold text-neutral-900 dark:text-white mb-2">
                        {title}
                    </h3>
                    <p className="text-neutral-500 dark:text-neutral-400 leading-relaxed">
                        {description}
                    </p>
                </div>
            </div>

            {graphic && (
                <div className="absolute inset-0 pointer-events-none opacity-50 group-hover:opacity-100 transition-opacity duration-500">
                    {graphic}
                </div>
            )}

            <div className="absolute inset-0 border border-neutral-200/50 dark:border-neutral-800/50 rounded-3xl pointer-events-none" />
        </div>
    );
}

export function BentoGrid({ children, className }: { children: ReactNode; className?: string }) {
    return (
        <div className={cn("grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mx-auto max-w-[980px]", className)}>
            {children}
        </div>
    );
}
