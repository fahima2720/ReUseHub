import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Leaf, Menu, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";

export function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2 font-display text-lg font-bold text-foreground">
      <span className="grid size-8 place-items-center rounded-md bg-primary text-primary-foreground">
        <Leaf className="size-4" aria-hidden />
      </span>
      ReUseHub
    </Link>
  );
}

export function SiteHeader() {
  const { user, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setOpen(false);
    navigate({ to: "/browse", search: { q: q.trim() || undefined } });
  };

  const links = (
    <>
      <Link to="/browse" className="nav-link" activeProps={{ className: "text-primary" }} onClick={() => setOpen(false)}>
        Browse
      </Link>
      <Link to="/browse" search={{ type: "donation" }} className="nav-link" onClick={() => setOpen(false)}>
        Free items
      </Link>
      {user && (
        <>
          <Link to="/dashboard" className="nav-link" activeProps={{ className: "text-primary" }} onClick={() => setOpen(false)}>
            My listings
          </Link>
          <Link to="/inbox" className="nav-link" activeProps={{ className: "text-primary" }} onClick={() => setOpen(false)}>
            Inbox
          </Link>
        </>
      )}
      {isAdmin && (
        <Link to="/admin" className="nav-link" activeProps={{ className: "text-primary" }} onClick={() => setOpen(false)}>
          Admin
        </Link>
      )}
    </>
  );

  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
      <div className="container-page flex h-16 items-center gap-4">
        <Logo />
        <form onSubmit={submit} role="search" className="relative ml-2 hidden max-w-sm flex-1 md:block">
          <label htmlFor="header-search" className="sr-only">Search items</label>
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <input
            id="header-search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search chairs, books, bikes…"
            className="h-10 w-full rounded-md border bg-card pl-9 pr-3 text-sm placeholder:text-muted-foreground"
          />
        </form>
        <nav className="ml-auto hidden items-center gap-5 text-sm font-medium text-muted-foreground lg:flex [&_.nav-link:hover]:text-foreground">
          {links}
        </nav>
        <div className="ml-auto hidden items-center gap-2 lg:ml-0 lg:flex">
          {user ? (
            <>
              <Button asChild size="sm"><Link to="/sell">List an item</Link></Button>
              <Button variant="ghost" size="sm" onClick={async () => { await signOut(); navigate({ to: "/" }); }}>Log out</Button>
            </>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm"><Link to="/auth">Log in</Link></Button>
              <Button asChild size="sm"><Link to="/auth" search={{ mode: "signup" }}>Sign up</Link></Button>
            </>
          )}
        </div>
        <button
          className="ml-auto rounded-md p-2 lg:hidden"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>
      {open && (
        <div className="border-t bg-background lg:hidden">
          <div className="container-page flex flex-col gap-4 py-4 text-sm font-medium">
            <form onSubmit={submit} role="search" className="relative md:hidden">
              <label htmlFor="mobile-search" className="sr-only">Search items</label>
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <input id="mobile-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search items" className="h-10 w-full rounded-md border bg-card pl-9 pr-3" />
            </form>
            <nav className="flex flex-col gap-3">{links}</nav>
            <div className="flex gap-2">
              {user ? (
                <>
                  <Button asChild size="sm" className="flex-1"><Link to="/sell" onClick={() => setOpen(false)}>List an item</Link></Button>
                  <Button variant="outline" size="sm" className="flex-1" onClick={async () => { setOpen(false); await signOut(); navigate({ to: "/" }); }}>Log out</Button>
                </>
              ) : (
                <>
                  <Button asChild variant="outline" size="sm" className="flex-1"><Link to="/auth" onClick={() => setOpen(false)}>Log in</Link></Button>
                  <Button asChild size="sm" className="flex-1"><Link to="/auth" search={{ mode: "signup" }} onClick={() => setOpen(false)}>Sign up</Link></Button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t bg-card">
      <div className="container-page grid gap-8 py-12 sm:grid-cols-3">
        <div className="space-y-3">
          <Logo />
          <p className="max-w-xs text-sm text-muted-foreground">Give things a second life. Sell what you no longer need, or give it away to someone nearby.</p>
        </div>
        <div className="text-sm">
          <h2 className="mb-3 font-semibold">Marketplace</h2>
          <ul className="space-y-2 text-muted-foreground">
            <li><Link to="/browse" className="hover:text-foreground">Browse all items</Link></li>
            <li><Link to="/browse" search={{ type: "donation" }} className="hover:text-foreground">Free donations</Link></li>
            <li><Link to="/sell" className="hover:text-foreground">List an item</Link></li>
          </ul>
        </div>
        <div className="text-sm">
          <h2 className="mb-3 font-semibold">Safety</h2>
          <ul className="space-y-2 text-muted-foreground">
            <li>Meet in public places for pickups.</li>
            <li>Never pay before seeing an item.</li>
            <li>Report suspicious listings from the item page.</li>
          </ul>
        </div>
      </div>
      <div className="border-t py-4 text-center text-xs text-muted-foreground">© {new Date().getFullYear()} ReUseHub · DBMS academic project</div>
    </footer>
  );
}
