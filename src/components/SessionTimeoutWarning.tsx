import { useSessionTimeout } from "@/hooks/useSessionTimeout";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

export function SessionTimeoutWarning() {
  const { showWarning, secondsLeft, stayLoggedIn, doLogout } = useSessionTimeout();
  const mm = Math.floor(secondsLeft / 60).toString().padStart(2, "0");
  const ss = (secondsLeft % 60).toString().padStart(2, "0");

  return (
    <AlertDialog open={showWarning}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Session about to expire</AlertDialogTitle>
          <AlertDialogDescription>
            Your session will expire in <span className="font-mono font-semibold">{mm}:{ss}</span> due to inactivity. Click to stay logged in.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={doLogout}>Log out now</AlertDialogCancel>
          <AlertDialogAction onClick={stayLoggedIn}>Stay logged in</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
