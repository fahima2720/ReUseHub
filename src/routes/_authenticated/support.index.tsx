import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { LifeBuoy, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth";
import { myTicketsQuery, statusVariant } from "@/lib/support";
import { formatDate } from "@/lib/listings";
import { supportCategoryLabel, supportStatusLabel } from "@/lib/validation";

export const Route = createFileRoute("/_authenticated/support/")({
  head: () => ({ meta: [
    { title: "Support tickets — ReUseHub" },
    { name: "description", content: "View and manage your ReUseHub help desk tickets." },
    { property: "og:title", content: "Support tickets — ReUseHub" },
    { property: "og:description", content: "Get help from the ReUseHub team." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: SupportList,
});

function SupportList() {
  const { user } = useAuth();
  const tickets = useQuery({ ...myTicketsQuery(user?.id ?? ""), enabled: !!user });

  return <div className="container-page max-w-3xl py-10">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-3xl font-bold">Support</h1>
      <Button asChild><Link to="/support/new" search={{ listing: undefined }}><Plus className="size-4" aria-hidden /> New ticket</Link></Button>
    </div>
    <div className="mt-6">
      {tickets.isPending ? <div className="space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-20" />)}</div>
        : tickets.isError ? <div className="space-y-3"><p className="text-sm text-muted-foreground">Couldn't load your tickets.</p><Button variant="outline" onClick={() => tickets.refetch()}>Try again</Button></div>
        : tickets.data.length === 0 ? <div className="rounded-lg border bg-card p-10 text-center">
            <LifeBuoy className="mx-auto size-8 text-muted-foreground" aria-hidden />
            <p className="mt-3 font-medium">No support tickets yet</p>
            <p className="mt-1 text-sm text-muted-foreground">Have a problem with your account or a listing? We're here to help.</p>
          </div>
        : <ul className="divide-y rounded-lg border bg-card">
            {tickets.data.map((t) => <li key={t.id}>
              <Link to="/support/$id" params={{ id: t.id }} className="flex items-center gap-3 p-4 hover:bg-accent/50">
                <span className={`size-2 shrink-0 rounded-full ${t.user_has_unread ? "bg-primary" : "bg-transparent"}`} aria-label={t.user_has_unread ? "New reply" : undefined} />
                <div className="min-w-0 flex-1">
                  <p className={`truncate ${t.user_has_unread ? "font-semibold" : "font-medium"}`}>{t.subject}</p>
                  <p className="text-xs text-muted-foreground">{supportCategoryLabel[t.category]} · Updated {formatDate(t.updated_at)}</p>
                </div>
                <Badge variant={statusVariant(t.status)}>{supportStatusLabel[t.status]}</Badge>
              </Link>
            </li>)}
          </ul>}
    </div>
  </div>;
}
