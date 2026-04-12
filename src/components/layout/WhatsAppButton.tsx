import { MessageCircle } from "lucide-react";

const WHATSAPP_NUMBER = "250788742122";
const WHATSAPP_MESSAGE = "Hello DreamNest! I'd like to know more about your products.";

export function WhatsAppButton() {
  const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with us on WhatsApp"
      className="fixed bottom-6 right-6 z-50 flex items-center justify-center h-14 w-14 rounded-full bg-[#25D366] text-white shadow-lg hover:bg-[#20bd5a] transition-colors hover:scale-105"
    >
      <MessageCircle className="h-7 w-7" />
    </a>
  );
}
