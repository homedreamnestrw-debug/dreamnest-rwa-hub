import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star } from "lucide-react";
import { toast } from "sonner";

interface ReviewFormProps {
  productId: string;
  userId: string;
  onSubmitted: () => void;
}

export function ReviewForm({ productId, userId, onSubmitted }: ReviewFormProps) {
  const [rating, setRating] = useState(5);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    setSubmitting(true);
    const { error } = await supabase.from("reviews").insert({
      product_id: productId,
      user_id: userId,
      rating,
      comment: comment.trim() || null,
    });
    setSubmitting(false);

    if (error) {
      if (error.code === "23505") toast.info("You've already reviewed this product");
      else toast.error("Failed to submit review");
      return;
    }
    toast.success("Review submitted! It will appear after approval.");
    setComment("");
    setRating(5);
    onSubmitted();
  };

  return (
    <div className="border rounded-lg p-6 space-y-4">
      <h3 className="font-serif text-lg">Write a Review</h3>
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setRating(s)}
            onMouseEnter={() => setHover(s)}
            onMouseLeave={() => setHover(0)}
          >
            <Star
              className={`h-6 w-6 transition-colors ${
                s <= (hover || rating) ? "fill-soft-gold text-soft-gold" : "text-muted"
              }`}
            />
          </button>
        ))}
        <span className="text-sm text-muted-foreground ml-2">{rating}/5</span>
      </div>
      <Textarea
        placeholder="Share your experience with this product..."
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        rows={3}
      />
      <Button onClick={handleSubmit} disabled={submitting}>
        {submitting ? "Submitting..." : "Submit Review"}
      </Button>
    </div>
  );
}
