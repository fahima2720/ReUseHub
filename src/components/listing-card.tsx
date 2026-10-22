import { Link } from "@tanstack/react-router";
import { MapPin, ImageOff } from "lucide-react";
import { conditionLabel, formatPrice, type ListingRow } from "@/lib/listings";
import { cn } from "@/lib/utils";

export function TypeBadge({ type, className }: { type: ListingRow["listing_type"]; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
        type === "donation" ? "bg-free text-free-foreground" : "bg-sale text-sale-foreground",
        className,
      )}
    >
      {type === "donation" ? "Free" : "For sale"}
    </span>
  );
}

export function ListingImage({ src, alt, className }: { src: string | null; alt: string; className?: string }) {
  if (!src)
    return (
      <div className={cn("grid place-items-center bg-muted text-muted-foreground", className)}>
        <ImageOff className="size-6" aria-hidden />
        <span className="sr-only">No photo</span>
      </div>
    );
  return <img src={src} alt={alt} loading="lazy" className={cn("object-cover", className)} />;
}

export function ListingCard({ listing }: { listing: ListingRow }) {
  return (
    <Link
      to="/item/$id"
      params={{ id: listing.id }}
      className="group flex flex-col overflow-hidden rounded-lg border bg-card shadow-card transition-shadow hover:shadow-md"
    >
      <div className="relative aspect-[4/3] overflow-hidden">
        <ListingImage src={listing.image_url} alt={listing.title} className="size-full transition-transform duration-300 group-hover:scale-[1.03]" />
        <TypeBadge type={listing.listing_type} className="absolute left-3 top-3" />
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-4">
        <p className={cn("text-lg font-bold", listing.listing_type === "donation" && "text-primary")}>
          {formatPrice(listing.listing_type, listing.price)}
        </p>
        <h3 className="line-clamp-2 font-sans text-sm font-medium leading-snug tracking-normal">{listing.title}</h3>
        <p className="text-xs text-muted-foreground">
          {listing.categories?.name} · {conditionLabel(listing.item_condition)}
        </p>
        <p className="mt-auto flex items-center gap-1 pt-2 text-xs text-muted-foreground">
          <MapPin className="size-3.5" aria-hidden /> {listing.location}
        </p>
      </div>
    </Link>
  );
}

export function EmptyState({ title, body, action }: { title: string; body: string; action?: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed bg-card px-6 py-14 text-center">
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">{body}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
