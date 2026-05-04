import { useState } from "react";
import { Share2, Copy, Check, MessageCircle, Send } from "lucide-react";
import { SiFacebook, SiX, SiWhatsapp, SiTelegram } from "react-icons/si";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface SocialShareButtonsProps {
  url: string;
  title: string;
  text: string;
  hashtags?: string[];
  compact?: boolean;
  showLabels?: boolean;
}

export function SocialShareButtons({
  url,
  title,
  text,
  hashtags = ["privode", "fishing", "rybolov"],
  compact = false,
  showLabels = true,
}: SocialShareButtonsProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const encodedUrl = encodeURIComponent(url);
  const encodedText = encodeURIComponent(text);
  const encodedTitle = encodeURIComponent(title);
  const hashtagString = hashtags.join(",");

  const shareToFacebook = () => {
    window.open(
      `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodedText}`,
      "_blank",
      "width=600,height=400"
    );
  };

  const shareToTwitter = () => {
    window.open(
      `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}&hashtags=${hashtagString}`,
      "_blank",
      "width=600,height=400"
    );
  };

  const shareToWhatsApp = () => {
    window.open(
      `https://wa.me/?text=${encodedText}%20${encodedUrl}`,
      "_blank"
    );
  };

  const shareToTelegram = () => {
    window.open(
      `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`,
      "_blank"
    );
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast({
        title: "Odkaz skopírovaný!",
        description: "Odkaz bol skopírovaný do schránky.",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Error copying:", err);
      toast({
        title: "Chyba",
        description: "Nepodarilo sa skopírovať odkaz.",
        variant: "destructive",
      });
    }
  };

  const nativeShare = async () => {
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await navigator.share({
          title,
          text,
          url,
        });
        toast({
          title: "Zdieľané!",
          description: "Obsah bol úspešne zdieľaný.",
        });
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          console.error("Error sharing:", err);
        }
      }
    }
  };

  const buttonSize = compact ? "sm" : "default";
  const iconSize = compact ? "w-4 h-4" : "w-5 h-5";

  return (
    <div className={`flex flex-wrap items-center gap-2 ${compact ? "gap-1.5" : "gap-3"}`}>
      {typeof navigator !== "undefined" && "share" in navigator && (
        <Button
          variant="outline"
          size={buttonSize}
          onClick={nativeShare}
          className="gap-2"
          title="Zdieľať"
        >
          <Share2 className={iconSize} />
          {showLabels && "Zdieľať"}
        </Button>
      )}

      <Button
        variant="outline"
        size={buttonSize}
        onClick={shareToFacebook}
        className="gap-2 hover:bg-[#1877F2]/10 hover:border-[#1877F2]/50"
        title="Zdieľať na Facebook"
      >
        <SiFacebook className={`${iconSize} text-[#1877F2]`} />
        {showLabels && "Facebook"}
      </Button>

      <Button
        variant="outline"
        size={buttonSize}
        onClick={shareToTwitter}
        className="gap-2 hover:bg-foreground/10 hover:border-foreground/50"
        title="Zdieľať na X (Twitter)"
      >
        <SiX className={iconSize} />
        {showLabels && "X"}
      </Button>

      <Button
        variant="outline"
        size={buttonSize}
        onClick={shareToWhatsApp}
        className="gap-2 hover:bg-[#25D366]/10 hover:border-[#25D366]/50"
        title="Zdieľať cez WhatsApp"
      >
        <SiWhatsapp className={`${iconSize} text-[#25D366]`} />
        {showLabels && "WhatsApp"}
      </Button>

      <Button
        variant="outline"
        size={buttonSize}
        onClick={shareToTelegram}
        className="gap-2 hover:bg-[#0088cc]/10 hover:border-[#0088cc]/50"
        title="Zdieľať cez Telegram"
      >
        <SiTelegram className={`${iconSize} text-[#0088cc]`} />
        {showLabels && "Telegram"}
      </Button>

      <Button
        variant="outline"
        size={buttonSize}
        onClick={copyLink}
        className="gap-2"
        title="Kopírovať odkaz"
      >
        {copied ? (
          <Check className={`${iconSize} text-green-500`} />
        ) : (
          <Copy className={iconSize} />
        )}
        {showLabels && (copied ? "Skopírované!" : "Kopírovať")}
      </Button>
    </div>
  );
}

export default SocialShareButtons;
