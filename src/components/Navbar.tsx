import { Button } from "@/components/ui/button";
import { Sprout, Menu } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

const Navbar = () => {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/50">
      <div className="container mx-auto max-w-6xl flex items-center justify-between h-16 px-4">
        <Link to="/" className="flex items-center gap-2">
          <Sprout className="w-6 h-6 text-primary" />
          <span className="font-serif text-xl">AgriLink</span>
        </Link>

        <div className="hidden md:flex items-center gap-8 text-sm font-medium">
          <Link to="/marketplace" className="text-muted-foreground hover:text-foreground transition-colors">Marketplace</Link>
          <a href="#how-it-works" className="text-muted-foreground hover:text-foreground transition-colors">How It Works</a>
          <a href="#stakeholders" className="text-muted-foreground hover:text-foreground transition-colors">About</a>
          <Link to="/messages" className="text-muted-foreground hover:text-foreground transition-colors">Contact</Link>
        </div>

        <div className="hidden md:flex items-center gap-3">
          {user ? (
            <Link to="/dashboard"><Button size="sm">Dashboard</Button></Link>
          ) : (
            <>
              <Link to="/auth"><Button variant="ghost" size="sm">Log In</Button></Link>
              <Link to="/auth"><Button size="sm">Get Started</Button></Link>
            </>
          )}
        </div>

        <button className="md:hidden" onClick={() => setOpen(!open)}>
          <Menu className="w-6 h-6" />
        </button>
      </div>

      {open && (
        <div className="md:hidden bg-background border-b border-border px-4 py-4 space-y-3">
          <Link to="/marketplace" className="block text-sm text-muted-foreground" onClick={() => setOpen(false)}>Marketplace</Link>
          <a href="#how-it-works" className="block text-sm text-muted-foreground" onClick={() => setOpen(false)}>How It Works</a>
          <a href="#stakeholders" className="block text-sm text-muted-foreground" onClick={() => setOpen(false)}>About</a>
          <Link to="/messages" className="block text-sm text-muted-foreground" onClick={() => setOpen(false)}>Contact</Link>
          <div className="flex gap-3 pt-2">
            {user ? (
              <Link to="/dashboard"><Button size="sm">Dashboard</Button></Link>
            ) : (
              <>
                <Link to="/auth"><Button variant="ghost" size="sm">Log In</Button></Link>
                <Link to="/auth"><Button size="sm">Get Started</Button></Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
