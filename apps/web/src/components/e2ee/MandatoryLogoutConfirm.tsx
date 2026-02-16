import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useAuth } from '@/hooks/useAuth';

interface MandatoryLogoutConfirmProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title?: string;
    description?: string;
}

export function MandatoryLogoutConfirm({
    open,
    onOpenChange,
    title = "Exit Setup?",
    description = "Completing this setup is required to secure your data. If you exit now, you will be signed out."
}: MandatoryLogoutConfirmProps) {
    const { signOut } = useAuth();

    const handleSignOut = async () => {
        await signOut();
        window.location.href = '/auth';
    };

    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent className="max-w-sm chat-surface-elevated border-[var(--chat-divider)]">
                <AlertDialogHeader>
                    <AlertDialogTitle>{title}</AlertDialogTitle>
                    <AlertDialogDescription>{description}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Go Back</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={handleSignOut}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                        Sign Out
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
