import { Link, useParams } from "react-router-dom";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";

export default function OrderConfirmation() {
  const { orderNumber } = useParams<{ orderNumber: string }>();

  return (
    <PublicLayout>
      <div className="container mx-auto px-4 py-20 text-center max-w-lg">
        <CheckCircle2 className="h-16 w-16 text-green-600 mx-auto mb-6" />
        <h1 className="text-3xl font-serif mb-3">Thank You!</h1>
        <p className="text-lg text-muted-foreground mb-2">
          Your order has been placed successfully.
        </p>
        {orderNumber && (
          <p className="text-sm text-muted-foreground mb-8">
            Order number: <span className="font-mono font-medium text-foreground">#{orderNumber}</span>
          </p>
        )}
        <p className="text-sm text-muted-foreground mb-8">
          We'll notify you once your order is being processed. You can check the status in your account.
        </p>
        <div className="flex gap-4 justify-center">
          <Link to="/shop">
            <Button variant="outline">Continue Shopping</Button>
          </Link>
          <Link to="/">
            <Button>Back to Home</Button>
          </Link>
        </div>
      </div>
    </PublicLayout>
  );
}
