import { useMemo } from "react";

export interface PasswordCheck {
  valid: boolean;
  score: number; // 0-4
  label: "Weak" | "Fair" | "Strong" | "Very Strong";
  errors: string[];
}

export function checkPassword(pw: string): PasswordCheck {
  const errors: string[] = [];
  if (pw.length < 8) errors.push("At least 8 characters");
  if (!/[A-Z]/.test(pw)) errors.push("One uppercase letter");
  if (!/[a-z]/.test(pw)) errors.push("One lowercase letter");
  if (!/[0-9]/.test(pw)) errors.push("One number");

  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw) && /[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  score = Math.min(score, 4);

  const labels: PasswordCheck["label"][] = ["Weak", "Weak", "Fair", "Strong", "Very Strong"];
  return { valid: errors.length === 0, score, label: labels[score], errors };
}

export function PasswordStrengthMeter({ password }: { password: string }) {
  const result = useMemo(() => checkPassword(password), [password]);
  if (!password) return null;

  const colors = ["bg-destructive", "bg-destructive", "bg-yellow-500", "bg-green-500", "bg-green-600"];
  const width = ["w-1/4", "w-1/4", "w-2/4", "w-3/4", "w-full"];

  return (
    <div className="space-y-1.5 mt-2">
      <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
        <div className={`h-full transition-all ${colors[result.score]} ${width[result.score]}`} />
      </div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">Strength:</span>
        <span className="font-medium">{result.label}</span>
      </div>
      {result.errors.length > 0 && (
        <ul className="text-xs text-muted-foreground space-y-0.5 mt-1">
          {result.errors.map((e) => <li key={e}>• {e}</li>)}
        </ul>
      )}
    </div>
  );
}
