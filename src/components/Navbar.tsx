import { Button } from "@/components/ui/button";
import { Sprout, Menu } from "lucide-react";
import { useState } from "react";

const Navbar = () => {
  const [open, setOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/50">
      <div className="container mx-auto max-w-6xl flex items-center justify-between h-16 px-4">
        <div className="flex items-center gap-2">
          <Sprout className="w-6 h-6 text-primary" />
          <span className="font-serif text-xl">AgriLink</span>
        </div>

        <div className="hidden md:flex items-center gap-8 text-sm font-medium">
          <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">Platform</a>
          <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">How It Works</a>
          <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">About</a>
          <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">Contact</a>
        </div>

        <div className="hidden md:flex items-center gap-3">
          <Button variant="ghost" size="sm">Log In</Button>
          <Button size="sm">Get Started</Button>
        </div>

        <button className="md:hidden" onClick={() => setOpen(!open)}>
          <Menu className="w-6 h-6" />
        </button>
      </div>

      {open && (
        <div className="md:hidden bg-background border-b border-border px-4 py-4 space-y-3">
          <a href="#" className="block text-sm text-muted-foreground">Platform</a>
          <a href="#" className="block text-sm text-muted-foreground">How It Works</a>
          <a href="#" className="block text-sm text-muted-foreground">About</a>
          <a href="#" className="block text-sm text-muted-foreground">Contact</a>
          <div className="flex gap-3 pt-2">
            <Button variant="ghost" size="sm">Log In</Button>
            <Button size="sm">Get Started</Button>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
