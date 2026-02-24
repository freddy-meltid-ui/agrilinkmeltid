import { Sprout } from "lucide-react";

const Footer = () => {
  return (
    <footer className="border-t border-border py-12 px-4 bg-card">
      <div className="container mx-auto max-w-6xl">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <Sprout className="w-6 h-6 text-primary" />
              <span className="font-serif text-xl">AgriLink</span>
            </div>
            <p className="text-muted-foreground text-sm">
              Connecting every link in the agricultural supply chain.
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-3 text-sm">Platform</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="hover:text-foreground cursor-pointer transition-colors">For Farmers</li>
              <li className="hover:text-foreground cursor-pointer transition-colors">For Workers</li>
              <li className="hover:text-foreground cursor-pointer transition-colors">For Transporters</li>
              <li className="hover:text-foreground cursor-pointer transition-colors">For Buyers</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-3 text-sm">Company</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="hover:text-foreground cursor-pointer transition-colors">About</li>
              <li className="hover:text-foreground cursor-pointer transition-colors">Careers</li>
              <li className="hover:text-foreground cursor-pointer transition-colors">Blog</li>
              <li className="hover:text-foreground cursor-pointer transition-colors">Contact</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-3 text-sm">Legal</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="hover:text-foreground cursor-pointer transition-colors">Privacy Policy</li>
              <li className="hover:text-foreground cursor-pointer transition-colors">Terms of Service</li>
            </ul>
          </div>
        </div>
        <div className="border-t border-border mt-10 pt-6 text-center text-sm text-muted-foreground">
          © 2026 AgriLink. All rights reserved.
        </div>
      </div>
    </footer>
  );
};

export default Footer;
