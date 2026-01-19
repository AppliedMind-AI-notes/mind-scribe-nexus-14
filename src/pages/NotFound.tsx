import { Link } from "react-router-dom";
import { Brain, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="text-center max-w-md">
        <Brain className="w-16 h-16 text-accent mx-auto mb-6" />
        <h1 className="text-6xl font-serif font-bold mb-4">404</h1>
        <p className="text-xl text-muted-foreground mb-8">
          Oops! This page doesn't exist in your knowledge base.
        </p>
        <Link to="/">
          <Button variant="hero" size="lg">
            <Home className="w-5 h-5 mr-2" />
            Return Home
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
