import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const WHATSAPP_NUMBER = "250788742122";
const WHATSAPP_MESSAGE = "Hello DreamNest! I'd like to know more about your products.";

export function WhatsAppButton() {
  const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`;

  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Chat with us on WhatsApp"
            className="fixed bottom-6 right-6 z-50 flex items-center justify-center h-14 w-14 rounded-full bg-[#25D366] text-white shadow-lg hover:bg-[#20bd5a] transition-all hover:scale-105"
          >
            {/* Official WhatsApp glyph */}
            <svg viewBox="0 0 32 32" className="h-8 w-8" fill="currentColor" aria-hidden="true">
              <path d="M19.11 17.205c-.372 0-1.088 1.39-1.518 1.39-.044 0-.094-.025-.146-.057-.36-.18-1.668-.731-3.244-2.137-1.225-1.094-2.052-2.438-2.292-2.852-.24-.413-.027-.64.18-.847.182-.182.405-.473.61-.71.205-.236.275-.404.41-.673.135-.27.063-.503-.034-.708-.097-.205-.81-1.954-1.107-2.677-.295-.715-.59-.6-.81-.6-.214 0-.428-.025-.66-.025-.232 0-.61.087-.93.43-.32.342-1.22 1.193-1.22 2.91 0 1.717 1.25 3.376 1.42 3.61.18.236 2.464 3.864 6.06 5.265 3.6 1.4 3.6.93 4.247.87.65-.058 2.083-.85 2.378-1.673.295-.822.295-1.526.207-1.673-.087-.146-.32-.236-.673-.41-.353-.176-2.095-1.034-2.42-1.153M16.04 0C7.18 0 0 7.18 0 16.04c0 2.83.74 5.59 2.14 8.02L0 32l8.16-2.14a16.005 16.005 0 0 0 7.88 2.06h.01c8.86 0 16.04-7.18 16.04-16.04S24.91 0 16.04 0zm0 29.31h-.01a13.27 13.27 0 0 1-6.76-1.85l-.485-.288-5.04 1.32 1.345-4.91-.317-.504a13.246 13.246 0 0 1-2.03-7.04C2.74 8.65 8.74 2.66 16.05 2.66c3.55 0 6.88 1.38 9.39 3.89a13.18 13.18 0 0 1 3.89 9.39c0 7.31-6 13.31-13.29 13.31z"/>
            </svg>
          </a>
        </TooltipTrigger>
        <TooltipContent side="left" className="bg-[#25D366] text-white border-none">
          Chat with us on WhatsApp
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
